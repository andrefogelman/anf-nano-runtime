import { supabase } from './supabase-client.js';
import { getAgentTools } from './agent-registry.js';
import { runOrcabotAgent } from './orcabot-agent-runner.js';
import type { DelegationTask } from '../agents/shared/types.js';

const POLL_INTERVAL_MS = 5000;

/**
 * Fetch and process all pending delegation tasks.
 * Returns the number of tasks processed.
 */
export async function processPendingDelegations(): Promise<number> {
  const { data, error } = await supabase
    .from('ob_delegation_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5);

  if (error) {
    console.error('[delegation-engine] Failed to fetch tasks:', error.message);
    return 0;
  }

  const tasks = (data || []) as DelegationTask[];
  let processed = 0;

  for (const task of tasks) {
    try {
      await processOneTask(task);
      processed++;
    } catch (err: any) {
      console.error(`[delegation-engine] Task ${task.id} failed:`, err.message);
      await supabase
        .from('ob_delegation_tasks')
        .update({ status: 'failed' })
        .eq('id', task.id);
    }
  }

  return processed;
}

/**
 * Process a single delegation task:
 * 1. Mark as in_progress
 * 2. Build task prompt from pranchas and context
 * 3. Run the specialist agent
 * 4. Mark as completed with result summary
 */
export async function processOneTask(task: DelegationTask): Promise<void> {
  console.log(
    `[delegation-engine] Processing task ${task.id} -> ${task.to_agent}`,
  );

  // 1. Mark in_progress
  await supabase
    .from('ob_delegation_tasks')
    .update({ status: 'in_progress' })
    .eq('id', task.id);

  // 2. Get the specialist's tools
  const tools = getAgentTools(task.to_agent);
  if (!tools) {
    throw new Error(`Agent ${task.to_agent} not found in registry`);
  }

  // 3. Build task description from pranchas
  const { data: pages } = await supabase
    .from('ob_pdf_pages')
    .select('id, prancha_id, tipo, structured_data, text_content, confidence')
    .in('id', task.pranchas);

  const pranchasSummary = (pages || [])
    .map(
      (p: any) =>
        `- Prancha ${p.prancha_id} (${p.tipo}): confidence ${p.confidence}`,
    )
    .join('\n');

  const contextStr = Object.entries(task.context)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const _taskDescription = `
Voce recebeu uma tarefa de delegacao do Agente Orcamentista.

**Projeto**: ${task.project_id}
**Contexto**:
${contextStr}

**Pranchas para processar** (${task.pranchas.length}):
${pranchasSummary}

**Instrucoes**: Analise as pranchas estruturadas e crie quantitativos para cada elemento encontrado.
Use suas tools para gravar cada quantitativo no banco. Retorne um resumo do que foi levantado.

Dados estruturados das pranchas:
${JSON.stringify(pages, null, 2)}
`.trim();

  // 4. Run the specialist agent via OrcaBot agent runner
  console.log(
    `[delegation-engine] Running agent ${task.to_agent} for ${task.pranchas.length} pranchas`,
  );

  const result = await runOrcabotAgent(
    task.to_agent,
    _taskDescription,
    tools.definitions,
    tools.handlers,
  );

  console.log(
    `[delegation-engine] Agent ${task.to_agent} finished: ${result.tool_calls.length} tool calls, ${result.tokens_used} tokens, ${result.duration_ms}ms`,
  );

  // 5. Count quantitativos created by this agent for this project
  const { data: quantitativos } = await supabase
    .from('ob_quantitativos')
    .select('id')
    .eq('project_id', task.project_id)
    .eq('created_by', task.to_agent);

  const quantIds = (quantitativos || []).map((q: any) => q.id);

  // 6. Write result back
  const delegationResult = {
    task_id: task.id,
    from_agent: task.to_agent,
    status: 'completed',
    quantitativos_created: quantIds,
    summary: `Processamento concluido: ${quantIds.length} quantitativos criados`,
    warnings: [],
    completed_at: new Date().toISOString(),
  };

  await supabase
    .from('ob_delegation_tasks')
    .update({
      status: 'completed',
      result: delegationResult,
    })
    .eq('id', task.id);

  console.log(
    `[delegation-engine] Task ${task.id} completed: ${quantIds.length} quantitativos created`,
  );
}

/**
 * Start the delegation poller. Runs every POLL_INTERVAL_MS.
 */
export function startDelegationPoller(): NodeJS.Timeout {
  console.log(
    `[delegation-engine] Poller started (interval: ${POLL_INTERVAL_MS}ms)`,
  );

  return setInterval(async () => {
    try {
      const count = await processPendingDelegations();
      if (count > 0) {
        console.log(`[delegation-engine] Processed ${count} delegation tasks`);
      }
    } catch (err: any) {
      console.error('[delegation-engine] Poller error:', err.message);
    }
  }, POLL_INTERVAL_MS);
}
