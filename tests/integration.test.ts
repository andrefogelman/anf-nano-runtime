// ~/orcabot/tests/integration.test.ts
// Integration tests — require a live Supabase connection (.env must have real creds).

import { describe, it, expect, afterEach } from 'vitest';
import { supabaseAdmin } from '../src/supabase-client.js';

// JIDs inserted during tests, cleaned up in afterEach
const insertedJids: string[] = [];

afterEach(async () => {
  if (insertedJids.length > 0) {
    await supabaseAdmin
      .from('ob_nc_chats')
      .delete()
      .in('jid', insertedJids);
    insertedJids.length = 0;
  }
});

describe('Supabase integration', () => {
  it('can insert and read from ob_nc_chats', async () => {
    const testJid = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test`;

    const { error: insertError } = await supabaseAdmin
      .from('ob_nc_chats')
      .insert({ jid: testJid, name: '__integration_test__' });

    expect(insertError).toBeNull();
    insertedJids.push(testJid);

    const { data, error: readError } = await supabaseAdmin
      .from('ob_nc_chats')
      .select('jid, name')
      .eq('jid', testJid)
      .single();

    expect(readError).toBeNull();
    expect(data).toBeDefined();
    expect(data!.jid).toBe(testJid);
    expect(data!.name).toBe('__integration_test__');
  });

  it('ob_organizations table exists', async () => {
    const { error } = await supabaseAdmin
      .from('ob_organizations')
      .select('id')
      .limit(1);

    // No error means the table exists (empty result is fine)
    expect(error).toBeNull();
  });

  it('ob_projects table exists', async () => {
    const { error } = await supabaseAdmin
      .from('ob_projects')
      .select('id')
      .limit(1);

    expect(error).toBeNull();
  });

  it('ob_sinapi_composicoes table exists', async () => {
    const { error } = await supabaseAdmin
      .from('ob_sinapi_composicoes')
      .select('id')
      .limit(1);

    expect(error).toBeNull();
  });
});
