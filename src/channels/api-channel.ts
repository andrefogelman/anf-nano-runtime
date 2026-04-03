/**
 * API Channel — HTTP server that bridges the OrcaBot frontend to NanoClaw.
 *
 * Primarily inbound: the frontend sends messages and job requests here.
 * Outbound delivery happens via Supabase Realtime (frontend subscribes directly).
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { registerChannel, type ChannelOpts } from './registry.js';
import { supabaseAdmin } from '../supabase-client.js';
import { storeMessage } from '../db.js';
import { logger } from '../logger.js';
import type { Channel, NewMessage } from '../types.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const CHANNEL_NAME = 'api';
const JID_PREFIX = 'api:'; // JIDs for API messages look like "api:<project_id>"

// ── Helpers ────────────────────────────────────────────────────────────────────

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 1_048_576) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isValidUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s,
  );
}

/** Strip URL path params: "/api/status/abc" → ["api","status","abc"] */
function pathSegments(url: string): string[] {
  const qIdx = url.indexOf('?');
  const pathname = qIdx === -1 ? url : url.slice(0, qIdx);
  return pathname.split('/').filter(Boolean);
}

// ── Channel factory ────────────────────────────────────────────────────────────

function apiChannelFactory(opts: ChannelOpts): Channel | null {
  if (!config.apiSecret) {
    logger.warn('API_SECRET not set — api channel disabled');
    return null;
  }

  let server: ReturnType<typeof createServer> | null = null;
  let connected = false;

  // Track known JIDs so ownsJid works for routed messages
  const ownedJids = new Set<string>();

  // ── Auth middleware ─────────────────────────────────────────────────────────

  function checkAuth(req: IncomingMessage): boolean {
    const auth = req.headers.authorization;
    return auth === `Bearer ${config.apiSecret}`;
  }

  // ── Route handlers ─────────────────────────────────────────────────────────

  async function handleHealth(_req: IncomingMessage, res: ServerResponse) {
    json(res, 200, { status: 'ok', channel: 'api', timestamp: Date.now() });
  }

  async function handleMessage(req: IncomingMessage, res: ServerResponse) {
    const raw = await readBody(req);
    const body = parseJson(raw) as {
      project_id?: string;
      agent?: string;
      content?: string;
      context?: Record<string, unknown>;
    } | null;

    if (!body || !body.project_id || !body.content) {
      json(res, 400, {
        error: 'Missing required fields: project_id, content',
      });
      return;
    }

    if (!isValidUuid(body.project_id)) {
      json(res, 400, { error: 'Invalid project_id (must be UUID)' });
      return;
    }

    const chatJid = `${JID_PREFIX}${body.project_id}`;
    ownedJids.add(chatJid);

    const msgId = crypto.randomUUID();
    const now = new Date().toISOString();

    const message: NewMessage = {
      id: msgId,
      chat_jid: chatJid,
      sender: `frontend:${body.project_id}`,
      sender_name: 'Frontend',
      content: body.content,
      timestamp: now,
      is_from_me: false,
      is_bot_message: false,
    };

    // Store in NanoClaw message table so orchestrator picks it up
    await storeMessage(message);

    // Notify NanoClaw via the onMessage callback
    opts.onMessage(chatJid, message);

    // Also store metadata for the chat
    opts.onChatMetadata(
      chatJid,
      now,
      `Project ${body.project_id}`,
      'api',
      false,
    );

    logger.info(
      { project_id: body.project_id, agent: body.agent, msgId },
      'API message received',
    );

    json(res, 202, {
      ok: true,
      message_id: msgId,
      chat_jid: chatJid,
    });
  }

  async function handleJob(req: IncomingMessage, res: ServerResponse) {
    const raw = await readBody(req);
    const body = parseJson(raw) as {
      project_id?: string;
      file_id?: string;
    } | null;

    if (!body || !body.project_id || !body.file_id) {
      json(res, 400, {
        error: 'Missing required fields: project_id, file_id',
      });
      return;
    }

    if (!isValidUuid(body.project_id) || !isValidUuid(body.file_id)) {
      json(res, 400, { error: 'project_id and file_id must be UUIDs' });
      return;
    }

    // Detect file type to determine which pipeline to use
    const { data: fileData, error: fileError } = await supabaseAdmin
      .from('ob_project_files')
      .select('file_type')
      .eq('id', body.file_id)
      .single();

    if (fileError || !fileData) {
      json(res, 404, { error: 'File not found' });
      return;
    }

    const pipeline =
      fileData.file_type === 'dwg' || fileData.file_type === 'dxf'
        ? 'dwg-pipeline'
        : 'pdf-pipeline';

    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('ob_pdf_jobs').insert({
      id: jobId,
      project_id: body.project_id,
      file_id: body.file_id,
      status: 'queued',
      created_at: now,
    });

    if (error) {
      logger.error(
        {
          project_id: body.project_id,
          file_id: body.file_id,
          error: error.message,
        },
        'Failed to create job',
      );
      json(res, 500, { error: 'Failed to create job' });
      return;
    }

    logger.info(
      { jobId, project_id: body.project_id, file_id: body.file_id, pipeline },
      `${pipeline} job created`,
    );

    json(res, 202, { ok: true, job_id: jobId, pipeline });
  }

  async function handleStatus(
    _req: IncomingMessage,
    res: ServerResponse,
    projectId: string,
  ) {
    if (!isValidUuid(projectId)) {
      json(res, 400, { error: 'Invalid project_id (must be UUID)' });
      return;
    }

    // Fetch recent jobs for this project
    const { data: jobs, error } = await supabaseAdmin
      .from('ob_pdf_jobs')
      .select('id, status, file_id, created_at, updated_at, error')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error(
        { project_id: projectId, error: error.message },
        'Failed to fetch status',
      );
      json(res, 500, { error: 'Failed to fetch status' });
      return;
    }

    json(res, 200, { project_id: projectId, jobs: jobs ?? [] });
  }

  // ── Process file (PDF/DWG/DXF) with LLM ──────────────────────────────────

  const LLM_BASE_URL =
    process.env.ANTHROPIC_BASE_URL || 'http://100.91.255.19:8100';
  const LLM_AUTH_TOKEN =
    process.env.ANTHROPIC_AUTH_TOKEN || 'sk-proxy-passthrough';
  const LLM_MODEL = process.env.LLM_MODEL || 'claude-haiku-4-5-20251001';

  async function callLlm(system: string, userContent: string): Promise<string> {
    const res = await fetch(`${LLM_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LLM_AUTH_TOKEN,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 8192,
        system,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!res.ok)
      throw new Error(`LLM error: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    return data.content?.[0]?.text ?? '';
  }

  function parseJsonFromLlm(text: string): Record<string, unknown> | null {
    try {
      return JSON.parse(text);
    } catch {
      /* */
    }
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) {
      try {
        return JSON.parse(m[1]);
      } catch {
        /* */
      }
    }
    const b = text.match(/\{[\s\S]*\}/);
    if (b) {
      try {
        return JSON.parse(b[0]);
      } catch {
        /* */
      }
    }
    return null;
  }

  async function handleProcess(req: IncomingMessage, res: ServerResponse) {
    const raw = await readBody(req);
    const body = parseJson(raw) as {
      project_id?: string;
      file_id?: string;
      prompt?: string;
      file_type?: string;
    } | null;

    if (!body?.project_id || !body?.file_id || !body?.prompt) {
      json(res, 400, { error: 'project_id, file_id, and prompt are required' });
      return;
    }

    let runId: string | null = null;

    try {
      // Create processing run
      const { data: run } = await supabaseAdmin
        .from('ob_processing_runs')
        .insert({
          project_id: body.project_id,
          file_id: body.file_id,
          prompt: body.prompt,
          status: 'processing',
        })
        .select('id')
        .single();
      runId = run?.id ?? null;

      // Get file info
      const { data: fileData, error: fileErr } = await supabaseAdmin
        .from('ob_project_files')
        .select('storage_path, filename, disciplina, file_type')
        .eq('id', body.file_id)
        .single();
      if (fileErr || !fileData)
        throw new Error(`File not found: ${fileErr?.message}`);

      const fileType = body.file_type || fileData.file_type || 'pdf';

      // Download file from storage
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from('project-pdfs')
        .download(fileData.storage_path);
      if (dlErr || !blob) throw new Error(`Download failed: ${dlErr?.message}`);

      const buffer = await blob.arrayBuffer();
      let extractedText = '';
      let fileInfo = '';

      if (fileType === 'pdf') {
        // PDF: use pdf-parse
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParseModule = await import('pdf-parse');
          const pdfParse = (pdfParseModule as any).default || pdfParseModule;
          const data = await pdfParse(Buffer.from(buffer));
          extractedText = data.text || '';
          fileInfo = `PDF: ${data.numpages} páginas, ${extractedText.length} chars`;
        } catch (e: unknown) {
          throw new Error(`Invalid PDF structure: ${(e as Error).message}`);
        }
      } else {
        // DWG/DXF: extract text strings from binary or parse DXF text
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const text = decoder.decode(buffer);

        if (text.includes('SECTION') && text.includes('ENTITIES')) {
          // It's a DXF (text-based) — extract useful content
          const layers: string[] = [];
          const texts: string[] = [];
          const blocks: Map<string, number> = new Map();
          const lines = text.split('\n');

          let currentEntity = '';
          let currentLayer = '0';

          for (let i = 0; i < lines.length; i++) {
            const code = lines[i].trim();
            const value = (lines[i + 1] || '').trim();

            if (code === '0') currentEntity = value;
            if (code === '8') {
              currentLayer = value;
              if (!layers.includes(value)) layers.push(value);
            }
            if (
              code === '1' &&
              (currentEntity === 'TEXT' || currentEntity === 'MTEXT')
            )
              texts.push(`[${currentLayer}] ${value}`);
            if (code === '42' && currentEntity === 'DIMENSION')
              texts.push(`[COTA] ${value}`);
            if (code === '2' && currentEntity === 'INSERT')
              blocks.set(value, (blocks.get(value) || 0) + 1);
          }

          const blocksList = Array.from(blocks.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([n, c]) => `${n}: ${c}x`);

          extractedText = `LAYERS (${layers.length}): ${layers.join(', ')}\n\nTEXTOS (${texts.length}):\n${texts.slice(0, 100).join('\n')}\n\nBLOCOS (${blocksList.length}):\n${blocksList.slice(0, 50).join('\n')}`;
          fileInfo = `DXF: ${layers.length} layers, ${texts.length} textos, ${blocksList.length} blocos`;
        } else {
          // Binary DWG — try dwg2dxf conversion first
          let dwgConverted = false;
          try {
            const { execFileSync } = await import('node:child_process');
            const { mkdtempSync, readFileSync: readFs, unlinkSync } = await import('node:fs');
            const { join: pathJoin } = await import('node:path');
            const tmpDir = mkdtempSync('/tmp/dwg-');
            const dxfPath = pathJoin(tmpDir, 'converted.dxf');
            const dwgPath = pathJoin(tmpDir, 'input.dwg');
            const { writeFileSync: writeFs } = await import('node:fs');
            writeFs(dwgPath, Buffer.from(buffer));
            try {
              execFileSync('dwg2dxf', [dwgPath, '-o', dxfPath], { timeout: 30000, stdio: 'pipe' });
            } catch { /* dwg2dxf may crash but still produce partial output */ }
            try {
              const dxfText = readFs(dxfPath, 'utf-8');
              if (dxfText.includes('SECTION') && dxfText.includes('ENTITIES')) {
                // Parse the converted DXF
                const convLayers: string[] = [];
                const convTexts: string[] = [];
                const convBlocks: Map<string, number> = new Map();
                const dxfLines = dxfText.split('\n');
                let ent = '', lay = '0';
                for (let i = 0; i < dxfLines.length; i++) {
                  const c = dxfLines[i].trim();
                  const v = (dxfLines[i+1] || '').trim();
                  if (c === '0') ent = v;
                  if (c === '8') { lay = v; if (!convLayers.includes(v)) convLayers.push(v); }
                  if (c === '1' && (ent === 'TEXT' || ent === 'MTEXT')) convTexts.push(`[${lay}] ${v}`);
                  if (c === '42' && ent === 'DIMENSION') convTexts.push(`[COTA] ${v}`);
                  if (c === '2' && ent === 'INSERT') convBlocks.set(v, (convBlocks.get(v) || 0) + 1);
                }
                const bl = Array.from(convBlocks.entries()).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n}: ${c}x`);
                extractedText = `LAYERS (${convLayers.length}): ${convLayers.join(', ')}\n\nTEXTOS (${convTexts.length}):\n${convTexts.slice(0, 100).join('\n')}\n\nBLOCOS (${bl.length}):\n${bl.slice(0, 50).join('\n')}`;
                fileInfo = `DWG convertido para DXF: ${convLayers.length} layers, ${convTexts.length} textos, ${bl.length} blocos`;
                dwgConverted = true;
              }
            } catch { /* partial DXF not readable */ }
            // Cleanup
            try { unlinkSync(dwgPath); unlinkSync(dxfPath); } catch { /* */ }
          } catch { /* dwg2dxf not available */ }

          if (!dwgConverted) {
            // Fallback: extract readable strings from binary
            const strings = text.match(/[\x20-\x7E]{4,}/g) || [];
            const layerLike = strings.filter(s => s.match(/^(ARQ|EST|HID|ELE|COT|PAR|TUB|ILU)/i)).slice(0, 50);
            const textLike = strings.filter(s => s.match(/[A-Za-z]{2,}/) && s.length > 3 && s.length < 100).slice(0, 100);
            const dimLike = strings.filter(s => s.match(/^\d+[\.,]\d+$/)).slice(0, 50);

            // Check if we got almost nothing useful
            const useful = layerLike.length + textLike.filter(s => !s.match(/IHDR|PLTE|IDAT|IEND|PNG|zlib/i)).length + dimLike.length;
            if (useful < 10) {
              // Not enough data — recommend conversion
              extractedText = 'EXTRAÇÃO INSUFICIENTE — DWG em formato binário complexo (dynamic blocks, 2018+). Dados legíveis insuficientes para levantamento confiável.';
              fileInfo = `DWG binário complexo — recomenda-se converter para DXF no AutoCAD`;

              // Still try to send to LLM but with clear warning
              extractedText += `\n\nSTRINGS ENCONTRADAS (baixa qualidade):\n${textLike.filter(s => !s.match(/IHDR|PLTE|IDAT|IEND|PNG|zlib/i)).slice(0, 30).join(', ')}`;
            } else {
              extractedText = `DWG BINÁRIO (extração parcial)\n\nLAYERS: ${layerLike.join(', ')}\n\nTEXTOS: ${textLike.join(', ')}\n\nCOTAS: ${dimLike.join(', ')}`;
              fileInfo = `DWG binário: ${layerLike.length} layers, ${textLike.length} textos, ${dimLike.length} cotas`;
            }
          }
        }
      }

      logger.info(
        { file_id: body.file_id, fileInfo },
        'File extracted for processing',
      );

      const systemPrompt = `Você é um engenheiro civil orçamentista senior especialista em levantamento de quantitativos.
Você recebe dados extraídos de um arquivo de projeto (${fileType.toUpperCase()}) e uma instrução do usuário.

REGRAS:
1. SEMPRE produza itens com quantidades numéricas > 0. Nunca lista vazia.
2. Use dimensões/cotas quando disponíveis para calcular quantidades.
3. Para blocos CAD: conte inserções (ex: bloco TOMADA inserido 15x = 15 tomadas).
4. Para layers: classifique por disciplina (ARQ/EST/HID/ELE).
5. Quando incerto, estime com confidence baixo e explique em needs_review.
6. Unidades: m², m³, m, kg, un, pt, vb.
7. Se os dados extraídos forem insuficientes (DWG binário complexo), informe no resumo: "Recomenda-se converter o arquivo DWG para DXF no AutoCAD (Salvar Como → DXF) e reenviar. O formato DXF permite extração completa de layers, textos, blocos e cotas."

FORMATO JSON OBRIGATÓRIO:
{
  "itens": [{"descricao":"...","quantidade":0,"unidade":"m²","memorial_calculo":"...","ambiente":"...","disciplina":"arquitetonico","confidence":0.85}],
  "needs_review": [{"item":"...","motivo":"..."}],
  "resumo": "..."
}`;

      const userMessage = `ARQUIVO: ${fileData.filename}\n${fileInfo}\nDISCIPLINA: ${fileData.disciplina || 'auto'}\n\nINSTRUÇÃO: ${body.prompt}\n\nDADOS EXTRAÍDOS:\n${extractedText.slice(0, 15000)}`;

      const llmResponse = await callLlm(systemPrompt, userMessage);
      const parsed = parseJsonFromLlm(llmResponse);

      const items = (parsed?.itens as unknown[]) || [];
      const needsReview = (parsed?.needs_review as unknown[]) || [];
      const summary = (parsed?.resumo as string) || llmResponse;

      // Save run
      if (runId) {
        await supabaseAdmin
          .from('ob_processing_runs')
          .update({
            status: 'done',
            summary,
            items,
            needs_review: needsReview,
            raw_response: parsed || { raw_text: llmResponse },
            pages_processed: 1,
          })
          .eq('id', runId);
      }

      await supabaseAdmin
        .from('ob_project_files')
        .update({ status: 'done' })
        .eq('id', body.file_id);

      json(res, 200, {
        success: true,
        run_id: runId,
        summary,
        items_count: items.length,
        review_count: needsReview.length,
        file_type: fileType,
        file_info: fileInfo,
        structured_data: parsed,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ file_id: body.file_id, error: msg }, 'Process error');
      if (runId) {
        await supabaseAdmin
          .from('ob_processing_runs')
          .update({ status: 'error', error_message: msg })
          .eq('id', runId);
      }
      json(res, 500, { error: msg });
    }
  }

  // ── Request router ─────────────────────────────────────────────────────────

  async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const url = req.url || '/';
    const segments = pathSegments(url);

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'Authorization, Content-Type',
        'access-control-max-age': '86400',
      });
      res.end();
      return;
    }

    // CORS headers on all responses
    res.setHeader('access-control-allow-origin', '*');

    // Health — no auth required
    if (
      req.method === 'GET' &&
      segments.length === 2 &&
      segments[0] === 'api' &&
      segments[1] === 'health'
    ) {
      await handleHealth(req, res);
      return;
    }

    // Auth check for all other endpoints
    if (!checkAuth(req)) {
      json(res, 401, { error: 'Unauthorized' });
      return;
    }

    // POST /api/message
    if (
      req.method === 'POST' &&
      segments.length === 2 &&
      segments[0] === 'api' &&
      segments[1] === 'message'
    ) {
      await handleMessage(req, res);
      return;
    }

    // POST /api/job
    if (
      req.method === 'POST' &&
      segments.length === 2 &&
      segments[0] === 'api' &&
      segments[1] === 'job'
    ) {
      await handleJob(req, res);
      return;
    }

    // GET /api/status/:project_id
    if (
      req.method === 'GET' &&
      segments.length === 3 &&
      segments[0] === 'api' &&
      segments[1] === 'status'
    ) {
      await handleStatus(req, res, segments[2]);
      return;
    }

    // POST /api/process — process a file (PDF/DWG/DXF) with LLM
    if (
      req.method === 'POST' &&
      segments.length === 2 &&
      segments[0] === 'api' &&
      segments[1] === 'process'
    ) {
      await handleProcess(req, res);
      return;
    }

    // 404
    json(res, 404, { error: 'Not found' });
  }

  // ── Channel interface ──────────────────────────────────────────────────────

  const channel: Channel = {
    name: CHANNEL_NAME,

    async connect(): Promise<void> {
      server = createServer((req, res) => {
        handleRequest(req, res).catch((err) => {
          logger.error({ err }, 'API channel request error');
          if (!res.headersSent) {
            json(res, 500, { error: 'Internal server error' });
          }
        });
      });

      await new Promise<void>((resolve) => {
        server!.listen(config.apiPort, () => {
          connected = true;
          logger.info(
            { port: config.apiPort },
            `[api-channel] Listening on port ${config.apiPort}`,
          );
          resolve();
        });
      });
    },

    async sendMessage(jid: string, text: string): Promise<void> {
      // Outbound: agents write to Supabase directly, frontend reads via Realtime.
      // This is a no-op for the API channel — logged for debugging.
      logger.debug(
        { jid, textLen: text.length },
        'API channel sendMessage (no-op, frontend uses Realtime)',
      );
    },

    isConnected(): boolean {
      return connected;
    },

    ownsJid(jid: string): boolean {
      return jid.startsWith(JID_PREFIX) || ownedJids.has(jid);
    },

    async disconnect(): Promise<void> {
      if (server) {
        await new Promise<void>((resolve) => server!.close(() => resolve()));
        connected = false;
        logger.info('[api-channel] Server closed');
      }
    },
  };

  return channel;
}

// ── Self-register ──────────────────────────────────────────────────────────────

registerChannel(CHANNEL_NAME, apiChannelFactory);

export { apiChannelFactory };
