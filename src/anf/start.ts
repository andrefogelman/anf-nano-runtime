import { startHealthServer } from './health.js';
import { startRealtimeListener } from './realtime-listener.js';
import { registerTask, startScheduler } from './scheduler.js';
import { startChatPolling } from './chat-handler.js';
import { startTaskExecutor } from './task-executor.js';
import { loadFlows } from './flow-engine.js';
import { runAgent } from './agent-runner.js';
import { getAgentTools, getAllAgentSlugs } from './agent-registry.js';
import { notifyAdmin } from './whatsapp.js';

function registerAgentTask(
  agent: string,
  name: string,
  cron: string,
  taskDescription: string,
) {
  const tools = getAgentTools(agent);
  if (!tools) return;
  registerTask({
    agent,
    name,
    cron,
    handler: async () => {
      const result = await runAgent(
        agent,
        taskDescription,
        tools.definitions,
        tools.handlers,
      );
      return result.response;
    },
  });
}

export async function startAnfModules(): Promise<void> {
  console.log('[anf] Starting ANF modules...');
  startHealthServer();
  await loadFlows();
  startRealtimeListener();

  registerAgentTask(
    'suprimentos',
    'verificar_respostas',
    '*/30 * * * *',
    'Verifique novas respostas de fornecedores.',
  );
  registerAgentTask(
    'suprimentos',
    'followup_pendentes',
    '0 9 * * 1-5',
    'Verifique requisições sem resposta há 2+ dias.',
  );
  registerAgentTask(
    'suprimentos',
    'relatorio_semanal',
    '0 8 * * 1',
    'Gere relatório semanal de compras.',
  );
  registerAgentTask(
    'financeiro',
    'verificar_vencimentos',
    '0 8 * * 1-5',
    'Verifique vencimentos do dia.',
  );
  registerAgentTask(
    'financeiro',
    'relatorio_fluxo_caixa',
    '0 9 * * 1',
    'Relatório semanal fluxo de caixa.',
  );
  registerAgentTask(
    'financeiro',
    'fechamento_mensal',
    '0 7 L * *',
    'Inicie fechamento mensal.',
  );
  registerAgentTask(
    'financeiro',
    'docs_contabilidade',
    '0 10 1 * *',
    'Prepare docs para contabilidade.',
  );
  registerAgentTask(
    'financeiro',
    'emprestimos_vencendo',
    '0 14 * * 1-5',
    'Verifique empréstimos vencendo.',
  );
  registerAgentTask(
    'engenharia',
    'verificar_prazos',
    '0 8 * * 1-5',
    'Verifique prazos de obras.',
  );
  registerAgentTask(
    'engenharia',
    'orcado_vs_realizado',
    '0 10 * * 1',
    'Comparativo orçado vs realizado.',
  );
  registerAgentTask(
    'engenharia',
    'medicoes_pendentes',
    '0 7 1,15 * *',
    'Verifique medições pendentes.',
  );

  startScheduler();
  startChatPolling();
  startTaskExecutor();

  const agentes = getAllAgentSlugs().join(', ');
  await notifyAdmin(`Sistema iniciado. Agentes: ${agentes}`);
  console.log('[anf] All ANF modules started');
}
