// ~/orcabot/src/health.ts
// Health check module — verifies Supabase, LLM proxy, and API channel.

import { supabaseAdmin } from './supabase-client.js';
import { config } from './config.js';

export interface HealthResult {
  supabase: boolean;
  llmProxy: boolean;
  apiChannel: boolean;
}

async function checkSupabase(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('ob_nc_chats')
      .select('jid')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function checkLlmProxy(): Promise<boolean> {
  try {
    const res = await fetch(
      `http://localhost:${config.llmProxyPort}/health`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body.status === 'ok';
  } catch {
    return false;
  }
}

async function checkApiChannel(): Promise<boolean> {
  try {
    const res = await fetch(
      `http://localhost:${config.apiPort}/api/health`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body.status === 'ok';
  } catch {
    return false;
  }
}

export async function runHealthCheck(): Promise<HealthResult> {
  const [supabase, llmProxy, apiChannel] = await Promise.all([
    checkSupabase(),
    checkLlmProxy(),
    checkApiChannel(),
  ]);
  return { supabase, llmProxy, apiChannel };
}
