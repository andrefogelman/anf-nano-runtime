import { supabase } from '../supabase-client.js';
import { runAgent } from './agent-runner.js';
import { routeMessage } from './router.js';
import { getAgentTools } from './agent-registry.js';
import { notifyAdmin } from './whatsapp.js';

// On startup, only process messages created after this timestamp
let lastProcessedAt: string = new Date().toISOString();
// Deduplicate WhatsApp error notifications — only send once per unique error
let lastNotifiedError: string | null = null;

export async function processNewMessages(): Promise<void> {
  // Fetch unprocessed admin messages (only new ones since startup or last processed)
  const query = supabase
    .from('nano_messages')
    .select('*')
    .eq('role', 'admin')
    .gt('created_at', lastProcessedAt)
    .order('created_at', { ascending: true })
    .limit(5);

  const { data: messages, error } = await query;
  if (error || !messages?.length) return;

  for (const msg of messages) {
    lastProcessedAt = msg.created_at;

    // Determine which agent should handle this
    let agentSlug: string;
    if (msg.agent_id) {
      // Message was sent to a specific agent
      const { data: agent } = await supabase
        .from('nano_agents')
        .select('slug')
        .eq('id', msg.agent_id)
        .single();
      agentSlug = agent?.slug || 'orquestrador';
    } else {
      // Route based on message content
      agentSlug = routeMessage(msg.content);
    }

    const tools = getAgentTools(agentSlug);
    if (!tools) {
      console.log(`[chat] Agent ${agentSlug} not available`);
      continue;
    }

    console.log(
      `[chat] Admin message → ${agentSlug}: ${msg.content.slice(0, 80)}`,
    );

    try {
      const result = await runAgent(
        agentSlug,
        `Mensagem do admin: "${msg.content}"\n\nResponda de forma direta e objetiva.`,
        tools.definitions,
        tools.handlers,
      );

      // Save agent response
      const { data: agentData } = await supabase
        .from('nano_agents')
        .select('id')
        .eq('slug', agentSlug)
        .single();

      if (agentData) {
        await supabase.from('nano_messages').insert({
          agent_id: agentData.id,
          role: 'agent',
          content: result.response,
          task_id: msg.task_id,
        });
      }

      // Send response via WhatsApp
      const emoji =
        agentSlug === 'financeiro'
          ? '💰'
          : agentSlug === 'suprimentos'
            ? '📦'
            : agentSlug === 'engenharia'
              ? '🏗️'
              : '🎛️';
      await notifyAdmin(
        `${emoji} ${agentSlug.charAt(0).toUpperCase() + agentSlug.slice(1)}:\n${result.response.slice(0, 1500)}`,
      );

      console.log(
        `[chat] ${agentSlug} responded: ${result.response.slice(0, 80)}`,
      );
    } catch (err: any) {
      console.error(
        `[chat] Error processing message for ${agentSlug}:`,
        err.message,
      );
      // Never spam WhatsApp with errors — only notify once per unique error type
      const errKey = `${agentSlug}:${err.message?.slice(0, 50)}`;
      if (!lastNotifiedError || lastNotifiedError !== errKey) {
        lastNotifiedError = errKey;
        if (
          !err.message?.includes('Rate limited') &&
          !err.message?.includes('cooldown')
        ) {
          await notifyAdmin(
            `⚠️ Erro ao processar mensagem para ${agentSlug}: ${err.message?.slice(0, 200)}`,
          );
        }
      }
    }
  }
}

export function startChatPolling(intervalMs: number = 10000): void {
  console.log(`[chat] Polling every ${intervalMs / 1000}s for admin messages`);

  async function poll() {
    try {
      await processNewMessages();
    } catch (err: any) {
      console.error('[chat] Polling error:', err.message);
    }
    setTimeout(poll, intervalMs);
  }

  poll();
}
