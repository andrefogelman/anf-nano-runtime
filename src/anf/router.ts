const EVENT_ROUTES: Record<string, Record<string, string>> = {
  requisicao: { INSERT: 'suprimentos', UPDATE: 'suprimentos' },
  cotacao: { INSERT: 'suprimentos', UPDATE: 'suprimentos' },
  proposta_analise: { INSERT: 'suprimentos' },
  requisicao_envio_tracking: { INSERT: 'suprimentos', UPDATE: 'suprimentos' },
  email_document_scan: { INSERT: 'suprimentos' },
  lanca: { INSERT: 'financeiro', UPDATE: 'financeiro' },
  medicao: { INSERT: 'engenharia', UPDATE: 'engenharia' },
  obracada: { UPDATE: 'engenharia' },
  ob_processing_runs: { UPDATE: 'orcamentista' },
};

const AGENT_KEYWORDS: Record<string, string[]> = {
  financeiro: [
    'financeiro',
    'financeira',
    'finanças',
    'caixa',
    'boleto',
    'pagamento',
  ],
  suprimentos: [
    'suprimentos',
    'compras',
    'requisição',
    'cotação',
    'fornecedor',
  ],
  engenharia: ['engenharia', 'obra', 'medição', 'cronograma'],
  orcamentista: [
    'orçamento',
    'orcamento',
    'quantitativo',
    'sinapi',
    'bdi',
    'eap',
    'planilha orçamentária',
  ],
  orquestrador: ['orquestrador', 'geral', 'todos'],
};

export function routeEvent(table: string, event: string): string | null {
  return EVENT_ROUTES[table]?.[event] ?? null;
}

export function routeMessage(message: string): string {
  const lower = message.toLowerCase();

  for (const [agent, keywords] of Object.entries(AGENT_KEYWORDS)) {
    if (agent === 'orquestrador') continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) return agent;
    }
  }

  return 'orquestrador';
}
