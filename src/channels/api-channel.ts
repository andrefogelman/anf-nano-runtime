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

    const pipeline = fileData.file_type === 'dwg' || fileData.file_type === 'dxf'
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
