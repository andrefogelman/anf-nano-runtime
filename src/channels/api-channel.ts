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
import { extractDxfGeometry, formatDxfForLlm } from '../dwg-processor.js';
import type { Channel, NewMessage } from '../types.js';
import { triggerOrcamentista } from '../orcamentista-trigger.js';

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
      status: 'pending',
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
      .select(
        'id, status, file_id, created_at, started_at, completed_at, error_message',
      )
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

  // ── Caderno Query — AI Q&A over SINAPI chunks ───────────────────────────

  async function handleCadernoQuery(req: IncomingMessage, res: ServerResponse) {
    const raw = await readBody(req);
    const body = parseJson(raw) as { question?: string } | null;

    if (!body?.question?.trim()) {
      json(res, 400, { error: 'Missing required field: question' });
      return;
    }

    const question = body.question.trim();

    try {
      // 1. Search relevant chunks via ilike text search
      const keywords = question
        .replace(/[?!.,;:'"()]/g, '')
        .split(/\s+/)
        .filter((w) => w.length >= 3)
        .slice(0, 5);

      let chunks: Array<{
        id: string;
        source_file: string;
        source_title: string;
        page_number: number | null;
        content: string;
      }> = [];

      // Try each keyword and collect unique chunks, up to 5
      const seenIds = new Set<string>();
      for (const kw of keywords) {
        if (chunks.length >= 5) break;
        const { data, error } = await supabaseAdmin
          .from('ob_sinapi_chunks')
          .select('id, source_file, source_title, page_number, content')
          .ilike('content', `%${kw}%`)
          .limit(3);
        if (error) {
          logger.error({ error: error.message }, 'Chunk search error');
          continue;
        }
        for (const row of data ?? []) {
          if (!seenIds.has(row.id) && chunks.length < 5) {
            seenIds.add(row.id);
            chunks.push(row);
          }
        }
      }

      // Fallback: if no chunks found, try broader search with first keyword
      if (chunks.length === 0 && keywords.length > 0) {
        const { data } = await supabaseAdmin
          .from('ob_sinapi_chunks')
          .select('id, source_file, source_title, page_number, content')
          .ilike('content', `%${keywords[0]}%`)
          .limit(5);
        chunks = data ?? [];
      }

      // 2. Build context from chunks
      const contextText = chunks
        .map(
          (c, i) =>
            `[Trecho ${i + 1}] Caderno: ${c.source_title}${c.page_number ? `, Pág. ${c.page_number}` : ''}\n${c.content}`,
        )
        .join('\n\n---\n\n');

      // 3. Call LLM
      const systemPrompt = `Você é um especialista em engenharia civil e orçamentos com profundo conhecimento dos Cadernos Técnicos SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil).

REGRAS:
1. Responda SEMPRE em português brasileiro.
2. Base suas respostas EXCLUSIVAMENTE nos trechos fornecidos como contexto.
3. Se os trechos não contiverem informação suficiente, diga claramente que não encontrou a informação nos cadernos disponíveis.
4. Cite as fontes (nome do caderno e página) ao longo da resposta.
5. Seja objetivo e técnico, mas claro na explicação.
6. Use formatação simples: parágrafos, listas com - quando necessário.`;

      const userMessage = contextText
        ? `CONTEXTO DOS CADERNOS TÉCNICOS:\n\n${contextText}\n\n---\n\nPERGUNTA DO USUÁRIO:\n${question}`
        : `Não foram encontrados trechos relevantes nos cadernos indexados.\n\nPERGUNTA DO USUÁRIO:\n${question}`;

      const answer = await callLlm(systemPrompt, userMessage);

      // 4. Build sources array
      const sourcesMap = new Map<
        string,
        { title: string; page?: number; source_file: string }
      >();
      for (const c of chunks) {
        const key = `${c.source_title}-${c.page_number ?? ''}`;
        if (!sourcesMap.has(key)) {
          sourcesMap.set(key, {
            title: c.source_title,
            page: c.page_number ?? undefined,
            source_file: c.source_file,
          });
        }
      }

      json(res, 200, {
        answer,
        sources: Array.from(sourcesMap.values()),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ error: msg }, 'Caderno query error');
      json(res, 500, { error: msg });
    }
  }

  // ── Process file (PDF/DWG/DXF) with LLM ──────────────────────────────────

  async function callLlm(system: string, userContent: string): Promise<string> {
    const { getProvider } = await import('../llm/index.js');
    const { config } = await import('../config.js');
    const provider = await getProvider();
    const result = await provider.chat({
      model: config.llmModel,
      system,
      messages: [{ role: 'user', content: userContent }],
      maxTokens: 16384,
      temperature: 0.2,
    });
    return result.text;
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
        // PDF: import lib/pdf-parse.js directly to bypass index.js test-file bug
        try {
          const pdfParseModule = await import(
            /* webpackIgnore: true */ 'pdf-parse/lib/pdf-parse.js'
          );
          const pdfParse = (pdfParseModule as any).default;
          const data = await pdfParse(Buffer.from(buffer));
          extractedText = data.text || '';
          fileInfo = `PDF: ${data.numpages} páginas, ${extractedText.length} chars`;
        } catch (e: unknown) {
          throw new Error(`Invalid PDF structure: ${(e as Error).message}`);
        }
      } else {
        // DWG/DXF: extract geometry via Docker container (ezdxf)
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const text = decoder.decode(buffer);
        const isDxf = text.includes('SECTION') && text.includes('ENTITIES');

        if (isDxf) {
          // DXF file — run full geometric extraction via ezdxf container
          try {
            const dxfData = await extractDxfGeometry(buffer);
            extractedText = formatDxfForLlm(dxfData);
            fileInfo = `DXF (ezdxf): ${dxfData.stats.total_layers} layers, ${dxfData.stats.total_entities} entidades geom., ${dxfData.stats.total_texts} textos, ${dxfData.stats.total_blocks} blocos, ${dxfData.stats.total_dimensions} cotas`;
          } catch (extractErr) {
            // Fallback to basic text extraction if container fails
            logger.warn(
              {
                file_id: body.file_id,
                error:
                  extractErr instanceof Error
                    ? extractErr.message
                    : String(extractErr),
              },
              'ezdxf extraction failed, falling back to text parser',
            );
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
            fileInfo = `DXF (fallback): ${layers.length} layers, ${texts.length} textos, ${blocksList.length} blocos`;
          }
        } else {
          // Binary DWG — try dwg2dxf conversion first
          let dwgConverted = false;
          try {
            const { execFileSync } = await import('node:child_process');
            const {
              mkdtempSync,
              readFileSync: readFs,
              unlinkSync,
            } = await import('node:fs');
            const { join: pathJoin } = await import('node:path');
            const tmpDir = mkdtempSync('/tmp/dwg-');
            const dxfPath = pathJoin(tmpDir, 'converted.dxf');
            const dwgPath = pathJoin(tmpDir, 'input.dwg');
            const { writeFileSync: writeFs } = await import('node:fs');
            writeFs(dwgPath, Buffer.from(buffer));
            try {
              execFileSync('dwg2dxf', [dwgPath, '-o', dxfPath], {
                timeout: 30000,
                stdio: 'pipe',
              });
            } catch {
              /* dwg2dxf may crash but still produce partial output */
            }
            try {
              const dxfText = readFs(dxfPath, 'utf-8');
              if (dxfText.includes('SECTION') && dxfText.includes('ENTITIES')) {
                // Parse the converted DXF
                const convLayers: string[] = [];
                const convTexts: string[] = [];
                const convBlocks: Map<string, number> = new Map();
                const dxfLines = dxfText.split('\n');
                let ent = '',
                  lay = '0';
                for (let i = 0; i < dxfLines.length; i++) {
                  const c = dxfLines[i].trim();
                  const v = (dxfLines[i + 1] || '').trim();
                  if (c === '0') ent = v;
                  if (c === '8') {
                    lay = v;
                    if (!convLayers.includes(v)) convLayers.push(v);
                  }
                  if (c === '1' && (ent === 'TEXT' || ent === 'MTEXT'))
                    convTexts.push(`[${lay}] ${v}`);
                  if (c === '42' && ent === 'DIMENSION')
                    convTexts.push(`[COTA] ${v}`);
                  if (c === '2' && ent === 'INSERT')
                    convBlocks.set(v, (convBlocks.get(v) || 0) + 1);
                }
                const bl = Array.from(convBlocks.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([n, c]) => `${n}: ${c}x`);
                extractedText = `LAYERS (${convLayers.length}): ${convLayers.join(', ')}\n\nTEXTOS (${convTexts.length}):\n${convTexts.slice(0, 100).join('\n')}\n\nBLOCOS (${bl.length}):\n${bl.slice(0, 50).join('\n')}`;
                fileInfo = `DWG convertido para DXF: ${convLayers.length} layers, ${convTexts.length} textos, ${bl.length} blocos`;
                dwgConverted = true;
              }
            } catch {
              /* partial DXF not readable */
            }
            // Cleanup
            try {
              unlinkSync(dwgPath);
              unlinkSync(dxfPath);
            } catch {
              /* */
            }
          } catch {
            /* dwg2dxf not available */
          }

          if (!dwgConverted) {
            // Fallback: extract readable strings from binary
            const strings = text.match(/[\x20-\x7E]{4,}/g) || [];
            const layerLike = strings
              .filter((s) => s.match(/^(ARQ|EST|HID|ELE|COT|PAR|TUB|ILU)/i))
              .slice(0, 50);
            const textLike = strings
              .filter(
                (s) =>
                  s.match(/[A-Za-z]{2,}/) && s.length > 3 && s.length < 100,
              )
              .slice(0, 100);
            const dimLike = strings
              .filter((s) => s.match(/^\d+[\.,]\d+$/))
              .slice(0, 50);

            // Check if we got almost nothing useful
            const useful =
              layerLike.length +
              textLike.filter((s) => !s.match(/IHDR|PLTE|IDAT|IEND|PNG|zlib/i))
                .length +
              dimLike.length;
            if (useful < 10) {
              // Not enough data — recommend conversion
              extractedText =
                'EXTRAÇÃO INSUFICIENTE — DWG em formato binário complexo (dynamic blocks, 2018+). Dados legíveis insuficientes para levantamento confiável.';
              fileInfo = `DWG binário complexo — recomenda-se converter para DXF no AutoCAD`;

              // Still try to send to LLM but with clear warning
              extractedText += `\n\nSTRINGS ENCONTRADAS (baixa qualidade):\n${textLike
                .filter((s) => !s.match(/IHDR|PLTE|IDAT|IEND|PNG|zlib/i))
                .slice(0, 30)
                .join(', ')}`;
            } else {
              extractedText = `DWG BINÁRIO (extração parcial)\n\nLAYERS: ${layerLike.join(', ')}\n\nTEXTOS: ${textLike.join(', ')}\n\nCOTAS: ${dimLike.join(', ')}`;
              fileInfo = `DWG binário: ${layerLike.length} layers, ${textLike.length} textos, ${dimLike.length} cotas`;
            }
          }
        }
      }

      // For DXF/DWG files: fetch previous PDF extraction data from the same project
      // to complement geometry with room names, areas, and specs from PDFs.
      let pdfContext = '';
      if (fileType === 'dxf' || fileType === 'dwg') {
        try {
          const { data: pdfRuns } = await supabaseAdmin
            .from('ob_processing_runs')
            .select('summary, items, file_id')
            .eq('project_id', body.project_id)
            .eq('status', 'done')
            .order('created_at', { ascending: false })
            .limit(20);

          if (pdfRuns?.length) {
            // Get filenames for context
            const fileIds = [
              ...new Set(pdfRuns.map((r) => r.file_id).filter(Boolean)),
            ];
            const { data: projFiles } = await supabaseAdmin
              .from('ob_project_files')
              .select('id, filename, file_type')
              .in('id', fileIds);
            const fileMap = new Map(projFiles?.map((f) => [f.id, f]) || []);

            const pdfParts: string[] = [];
            for (const run of pdfRuns) {
              const file = fileMap.get(run.file_id);
              if (!file || file.file_type !== 'pdf') continue;
              const items = (run.items as Array<Record<string, unknown>>) || [];
              if (items.length === 0) continue;
              const itemLines = items
                .slice(0, 30)
                .map(
                  (i) =>
                    `  - ${i.descricao}: ${i.quantidade} ${i.unidade}${i.ambiente ? ` [${i.ambiente}]` : ''}`,
                )
                .join('\n');
              pdfParts.push(
                `[${file.filename}] ${run.summary?.slice(0, 150) || ''}\n${itemLines}`,
              );
            }
            if (pdfParts.length > 0) {
              pdfContext = `\n\nDADOS DE REFERÊNCIA (extraídos dos PDFs do mesmo projeto — use como apoio para identificar ambientes, áreas e especificações):\n${pdfParts.join('\n\n')}`;
            }
          }
        } catch (e) {
          logger.warn(
            { error: e instanceof Error ? e.message : String(e) },
            'Failed to fetch PDF context for DXF processing',
          );
        }
      }

      logger.info(
        {
          file_id: body.file_id,
          fileInfo,
          hasPdfContext: pdfContext.length > 0,
        },
        'File extracted for processing',
      );

      // Encode PDF as base64 for Gemini vision analysis
      const pdfBase64 = fileType === 'pdf'
        ? Buffer.from(buffer).toString('base64')
        : undefined;

      // Invoke orcamentista agent with vision (PDF) + text
      const result = await triggerOrcamentista({
        projectId: body.project_id,
        runId: runId,
        fileId: body.file_id,
        extractedText,
        fileInfo,
        userPrompt: body.prompt,
        pdfContext,
        pdfBase64,
      });

      const quantCount = result.tool_calls.filter((tc) => tc.name === 'create_quantitativo').length;
      const delegations = result.tool_calls.filter((tc) => tc.name === 'delegate_to_specialist').length;

      await supabaseAdmin
        .from('ob_project_files')
        .update({ status: 'done' })
        .eq('id', body.file_id);

      json(res, 200, {
        success: true,
        run_id: runId,
        summary: result.response,
        items_count: quantCount,
        delegations_count: delegations,
        file_type: fileType,
        file_info: fileInfo,
        agent: 'orcamentista',
        tokens_used: result.tokens_used,
        duration_ms: result.duration_ms,
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

  // ── Agent Chat — conversational AI per agent ────────────────────────────────

  const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
    orcamentista: `Você é um engenheiro civil orçamentista senior. Auxilie o usuário com dúvidas sobre orçamento, quantitativos, composições SINAPI/TCPO e qualquer aspecto da obra. Responda em português, de forma técnica mas clara.`,
    estrutural: `Você é um engenheiro estrutural senior. Auxilie com dúvidas sobre estrutura, fundações, lajes, vigas, pilares e cálculos estruturais. Responda em português, de forma técnica mas clara.`,
    hidraulico: `Você é um engenheiro hidráulico senior. Auxilie com dúvidas sobre instalações hidrossanitárias, tubulações, esgoto, água fria/quente, pluvial. Responda em português, de forma técnica mas clara.`,
    eletricista: `Você é um engenheiro eletricista senior. Auxilie com dúvidas sobre instalações elétricas, quadros, circuitos, iluminação, automação e SPDA. Responda em português, de forma técnica mas clara.`,
  };

  async function handleAgentChat(req: IncomingMessage, res: ServerResponse) {
    const raw = await readBody(req);
    const body = parseJson(raw) as {
      project_id?: string;
      agent_slug?: string;
      message?: string;
      context?: Record<string, unknown>;
    } | null;

    if (!body?.project_id || !body?.agent_slug || !body?.message) {
      json(res, 400, {
        error: 'Missing required fields: project_id, agent_slug, message',
      });
      return;
    }

    try {
      // 1. Get project info
      const { data: project } = await supabaseAdmin
        .from('ob_projects')
        .select('name, tipo_obra, area_total_m2, uf, cidade')
        .eq('id', body.project_id)
        .single();

      // 2. Get conversation history (last 20 messages)
      const { data: history } = await supabaseAdmin
        .from('ob_agent_conversations')
        .select('role, content')
        .eq('project_id', body.project_id)
        .eq('agent_slug', body.agent_slug)
        .order('created_at', { ascending: true })
        .limit(20);

      // 3. Build context
      let contextInfo = '';
      if (project) {
        contextInfo += `\nPROJETO: ${project.name} | ${project.tipo_obra} | ${project.area_total_m2}m² | ${project.cidade}/${project.uf}`;
      }
      if (body.context?.active_tab) {
        contextInfo += `\nAba ativa: ${body.context.active_tab}`;
      }
      if (body.context?.active_prancha_id) {
        const { data: fileData } = await supabaseAdmin
          .from('ob_project_files')
          .select('filename, file_type, disciplina')
          .eq('id', body.context.active_prancha_id as string)
          .single();
        if (fileData) {
          contextInfo += `\nArquivo selecionado: ${fileData.filename} (${fileData.file_type}, disciplina: ${fileData.disciplina || 'auto'})`;
        }
      }

      // 4. Build system prompt
      const basePrompt =
        AGENT_SYSTEM_PROMPTS[body.agent_slug] ??
        AGENT_SYSTEM_PROMPTS.orcamentista;
      const systemPrompt = contextInfo
        ? `${basePrompt}\n\nCONTEXTO ATUAL:${contextInfo}`
        : basePrompt;

      // 5. Build messages from history (already includes the user message just inserted by frontend)
      const llmMessages = (history ?? [])
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));

      // 6. Call LLM with multi-turn messages
      const { getProvider: getAgentProvider } = await import('../llm/index.js');
      const { config: agentConfig } = await import('../config.js');
      const agentProvider = await getAgentProvider();
      const agentResult = await agentProvider.chat({
        model: agentConfig.llmModel,
        system: systemPrompt,
        messages: llmMessages,
        maxTokens: 4096,
        temperature: 0.2,
      });
      const response = agentResult.text;

      // 7. Save assistant response
      await supabaseAdmin.from('ob_agent_conversations').insert({
        project_id: body.project_id,
        agent_slug: body.agent_slug,
        role: 'assistant',
        content: response,
      });

      json(res, 200, { ok: true, response });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ error: msg }, 'Agent chat error');
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

    // POST /api/caderno-query — AI Q&A over SINAPI cadernos
    if (
      req.method === 'POST' &&
      segments.length === 2 &&
      segments[0] === 'api' &&
      segments[1] === 'caderno-query'
    ) {
      await handleCadernoQuery(req, res);
      return;
    }

    // POST /api/agent-chat — conversational AI per agent
    if (
      req.method === 'POST' &&
      segments.length === 2 &&
      segments[0] === 'api' &&
      segments[1] === 'agent-chat'
    ) {
      await handleAgentChat(req, res);
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
