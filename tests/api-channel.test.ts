import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Set env vars before any imports
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.API_SECRET = 'test-secret-token';
process.env.API_PORT = '0';

// Mock supabase-client
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSelectChain = {
  eq: vi.fn().mockReturnValue({
    order: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'job-1',
            status: 'completed',
            file_id: 'file-1',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: null,
            error: null,
          },
        ],
        error: null,
      }),
    }),
  }),
};

vi.mock('../src/supabase-client.js', () => {
  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    select: vi.fn().mockReturnValue(mockSelectChain),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  }));
  return {
    supabaseAdmin: { from: mockFrom },
    supabaseAnon: { from: mockFrom },
    supabase: { from: mockFrom },
    supabaseRealtime: { from: mockFrom },
  };
});

vi.mock('../src/db.js', () => ({
  storeMessage: vi.fn().mockResolvedValue(undefined),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

const AUTH_HEADER = 'Bearer test-secret-token';
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID2 = '660e8400-e29b-41d4-a716-446655440000';

describe('api-channel', () => {
  let channel: any;
  let port: number;
  let onMessage: ReturnType<typeof vi.fn>;
  let onChatMetadata: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    // Use a fixed high port to avoid conflicts
    const { config } = await import('../src/config.js');
    (config as any).apiPort = 0; // OS assigns random port

    const { apiChannelFactory } = await import(
      '../src/channels/api-channel.js'
    );

    onMessage = vi.fn();
    onChatMetadata = vi.fn();

    channel = apiChannelFactory({
      onMessage,
      onChatMetadata,
      registeredGroups: () => ({}),
    })!;

    expect(channel).not.toBeNull();

    // Patch apiPort to a specific value so we can get the port after connect
    // We need to reach into the server. Instead, use a trick:
    // Override connect to capture the server.
    const origConnect = channel.connect.bind(channel);

    // Just use a known port
    (config as any).apiPort = 19876;
    port = 19876;

    await channel.connect();
  });

  afterAll(async () => {
    if (channel) await channel.disconnect();
  });

  // ── Channel interface tests ──────────────────────────────────────────────

  it('channel name is "api"', () => {
    expect(channel.name).toBe('api');
  });

  it('isConnected returns true after connect', () => {
    expect(channel.isConnected()).toBe(true);
  });

  it('ownsJid returns true for api: prefixed JIDs', () => {
    expect(channel.ownsJid('api:some-project')).toBe(true);
  });

  it('ownsJid returns false for non-api JIDs', () => {
    expect(channel.ownsJid('whatsapp:123')).toBe(false);
  });

  // ── Health endpoint ──────────────────────────────────────────────────────

  it('GET /api/health returns 200 without auth', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.channel).toBe('api');
  });

  // ── Auth rejection ───────────────────────────────────────────────────────

  it('POST /api/message returns 401 without auth', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project_id: VALID_UUID, content: 'test' }),
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('POST /api/message returns 401 with wrong token', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/message`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer wrong-token',
      },
      body: JSON.stringify({ project_id: VALID_UUID, content: 'test' }),
    });
    expect(res.status).toBe(401);
  });

  // ── Auth acceptance ──────────────────────────────────────────────────────

  it('POST /api/message returns 202 with correct token', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/message`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: AUTH_HEADER,
      },
      body: JSON.stringify({
        project_id: VALID_UUID,
        agent: 'orcamentista',
        content: 'Qual o custo do item 01.01?',
        context: { active_prancha: 'ARQ-01' },
      }),
    });
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message_id).toBeDefined();
    expect(json.chat_jid).toBe(`api:${VALID_UUID}`);
  });

  // ── Message validation ───────────────────────────────────────────────────

  it('POST /api/message returns 400 for missing content', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/message`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: AUTH_HEADER,
      },
      body: JSON.stringify({ project_id: VALID_UUID }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/message returns 400 for invalid UUID', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/message`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: AUTH_HEADER,
      },
      body: JSON.stringify({ project_id: 'not-a-uuid', content: 'test' }),
    });
    expect(res.status).toBe(400);
  });

  // ── Job endpoint ─────────────────────────────────────────────────────────

  it('POST /api/job returns 202 with valid payload', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/job`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: AUTH_HEADER,
      },
      body: JSON.stringify({ project_id: VALID_UUID, file_id: VALID_UUID2 }),
    });
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.job_id).toBeDefined();
  });

  it('POST /api/job returns 400 for missing file_id', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/job`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: AUTH_HEADER,
      },
      body: JSON.stringify({ project_id: VALID_UUID }),
    });
    expect(res.status).toBe(400);
  });

  // ── Status endpoint ──────────────────────────────────────────────────────

  it('GET /api/status/:project_id returns 200', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/status/${VALID_UUID}`, {
      headers: { authorization: AUTH_HEADER },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.project_id).toBe(VALID_UUID);
    expect(Array.isArray(json.jobs)).toBe(true);
  });

  it('GET /api/status/:bad-id returns 400', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/status/not-a-uuid`, {
      headers: { authorization: AUTH_HEADER },
    });
    expect(res.status).toBe(400);
  });

  // ── 404 ──────────────────────────────────────────────────────────────────

  it('GET /unknown returns 404', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/nonexistent`, {
      headers: { authorization: AUTH_HEADER },
    });
    expect(res.status).toBe(404);
  });
});
