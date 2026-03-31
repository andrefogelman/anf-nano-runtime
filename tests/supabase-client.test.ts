import { describe, it, expect, beforeAll } from 'vitest';

// Set required env vars before any imports that trigger config.ts
beforeAll(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.API_SECRET = 'test-api-secret';
});

describe('supabase-client', () => {
  it('supabaseAdmin is created and not null', async () => {
    const { supabaseAdmin } = await import('../src/supabase-client.js');
    expect(supabaseAdmin).toBeDefined();
    expect(supabaseAdmin).not.toBeNull();
  });

  it('supabaseAnon is created and not null', async () => {
    const { supabaseAnon } = await import('../src/supabase-client.js');
    expect(supabaseAnon).toBeDefined();
    expect(supabaseAnon).not.toBeNull();
  });

  it('supabaseWithAuth returns a client', async () => {
    const { supabaseWithAuth } = await import('../src/supabase-client.js');
    const client = supabaseWithAuth('fake-jwt-token');
    expect(client).toBeDefined();
    expect(client).not.toBeNull();
  });

  it('legacy aliases are exported', async () => {
    const { supabase, supabaseRealtime } = await import(
      '../src/supabase-client.js'
    );
    expect(supabase).toBeDefined();
    expect(supabaseRealtime).toBeDefined();
  });
});
