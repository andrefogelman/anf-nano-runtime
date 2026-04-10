import { supabase } from '../../src/supabase-client.js';
import { logActivity } from '../../src/anf/activity-log.js';

const AGENT_SLUG = 'suprimentos';

async function getAgentId(): Promise<string> {
  const { data } = await supabase
    .from('nano_agents')
    .select('id')
    .eq('slug', AGENT_SLUG)
    .single();
  return data!.id;
}

// ===== 1. query_requisicoes =====
export async function query_requisicoes(params: {
  status?: string;
  obra_id?: number;
  limit?: number;
}): Promise<unknown> {
  let query = supabase
    .from('requisicao')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit || 20);

  if (params.status) query = query.eq('status', params.status);
  if (params.obra_id) query = query.eq('id_obracada', params.obra_id);

  const { data, error } = await query;
  if (error) throw new Error(`query_requisicoes: ${error.message}`);
  return data;
}

// ===== 2. create_requisicao =====
export async function create_requisicao(params: {
  descricao: string;
  id_obracada: number;
  itens: Array<{ produto: string; quantidade: number; unidade: string }>;
}): Promise<unknown> {
  const agentId = await getAgentId();

  const { data, error } = await supabase
    .from('requisicao')
    .insert({
      descricao: params.descricao,
      id_obracada: params.id_obracada,
      status: 'nova',
    })
    .select()
    .single();

  if (error) throw new Error(`create_requisicao: ${error.message}`);

  await logActivity({
    agent_id: agentId,
    action: 'write',
    target_table: 'requisicao',
    target_id: String(data.id),
    description: `Criou requisição: ${params.descricao}`,
    output: data as Record<string, unknown>,
  });

  return data;
}

// ===== 3. query_cotacoes =====
export async function query_cotacoes(params: {
  requisicao_id?: number;
  status?: string;
  limit?: number;
}): Promise<unknown> {
  let query = supabase
    .from('cotacao')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit || 20);

  if (params.requisicao_id) query = query.eq('id_requisicao_jarvis', params.requisicao_id);
  if (params.status) query = query.eq('status', params.status);

  const { data, error } = await query;
  if (error) throw new Error(`query_cotacoes: ${error.message}`);
  return data;
}

// ===== 4. create_cotacao =====
export async function create_cotacao(params: {
  id_requisicao: number;
  descricao: string;
  fornecedores: Array<{ fornecedor_id: number; valor: number; prazo: string; condicoes: string }>;
}): Promise<unknown> {
  const agentId = await getAgentId();

  const { data, error } = await supabase
    .from('cotacao')
    .insert({
      id_requisicao_jarvis: params.id_requisicao,
      descricao: params.descricao,
      status: 'aberta',
    })
    .select()
    .single();

  if (error) throw new Error(`create_cotacao: ${error.message}`);

  await logActivity({
    agent_id: agentId,
    action: 'write',
    target_table: 'cotacao',
    target_id: String(data.id),
    description: `Criou cotação para requisição ${params.id_requisicao}`,
    input: { fornecedores: params.fornecedores.length } as Record<string, unknown>,
    output: data as Record<string, unknown>,
  });

  return data;
}

// ===== 5. query_fornecedores =====
export async function query_fornecedores(params: {
  ids?: number[];
  phones?: string[];
  search?: string;
}): Promise<unknown> {
  if (params.ids?.length) {
    const { data, error } = await supabase.rpc('get_fornecedores_by_ids', {
      p_ids: params.ids,
    });
    if (error) throw new Error(`query_fornecedores: ${error.message}`);
    return data;
  }

  if (params.phones?.length) {
    const { data, error } = await supabase.rpc('get_fornecedores_by_phones', {
      p_phones: params.phones,
    });
    if (error) throw new Error(`query_fornecedores: ${error.message}`);
    return data;
  }

  if (params.search) {
    const { data, error } = await supabase.rpc('search_fornecedores', {
      p_search: params.search,
      p_limit: 20,
    });
    if (error) throw new Error(`query_fornecedores search: ${error.message}`);
    return data;
  }

  return [];
}

// ===== 6. enviar_requisicao_fornecedor =====
export async function enviar_requisicao_fornecedor(params: {
  requisicao_id: number;
  fornecedor_id: number;
  canal: 'whatsapp' | 'email';
  mensagem: string;
}): Promise<unknown> {
  const agentId = await getAgentId();

  const edgeFunction = params.canal === 'whatsapp'
    ? 'agent-enviar-requisicao'
    : 'agent-responder-email';

  const { data, error } = await supabase.functions.invoke(edgeFunction, {
    body: {
      requisicao_id: params.requisicao_id,
      fornecedor_id: params.fornecedor_id,
      mensagem: params.mensagem,
    },
  });

  if (error) throw new Error(`enviar_requisicao: ${error.message}`);

  await logActivity({
    agent_id: agentId,
    action: 'write',
    target_table: 'requisicao_envio_tracking',
    description: `Enviou requisição ${params.requisicao_id} para fornecedor ${params.fornecedor_id} via ${params.canal}`,
    input: params as unknown as Record<string, unknown>,
    output: data as Record<string, unknown>,
  });

  return data;
}

// ===== 7. analisar_proposta =====
export async function analisar_proposta(params: {
  proposta_id: number;
}): Promise<unknown> {
  const { data, error } = await supabase
    .from('proposta_analise')
    .select('*')
    .eq('id', params.proposta_id)
    .single();

  if (error) throw new Error(`analisar_proposta: ${error.message}`);
  return data;
}

// ===== 8. query_tracking =====
export async function query_tracking(params: {
  requisicao_id?: number;
  status?: string;
}): Promise<unknown> {
  let query = supabase
    .from('requisicao_envio_tracking')
    .select('*')
    .order('created_at', { ascending: false });

  if (params.requisicao_id) query = query.eq('id_requisicao', params.requisicao_id);
  if (params.status) query = query.eq('status', params.status);

  const { data, error } = await query;
  if (error) throw new Error(`query_tracking: ${error.message}`);
  return data;
}

// ===== 9. responder_fornecedor =====
export async function responder_fornecedor(params: {
  fornecedor_id: number;
  canal: 'whatsapp' | 'email';
  mensagem: string;
  requisicao_id?: number;
}): Promise<unknown> {
  const agentId = await getAgentId();

  const edgeFunction = params.canal === 'whatsapp'
    ? 'agent-responder-whatsapp'
    : 'agent-responder-email';

  const { data, error } = await supabase.functions.invoke(edgeFunction, {
    body: {
      fornecedor_id: params.fornecedor_id,
      mensagem: params.mensagem,
      requisicao_id: params.requisicao_id,
    },
  });

  if (error) throw new Error(`responder_fornecedor: ${error.message}`);

  await logActivity({
    agent_id: agentId,
    action: 'write',
    target_table: 'fornecedor',
    target_id: String(params.fornecedor_id),
    description: `Respondeu fornecedor ${params.fornecedor_id} via ${params.canal}`,
    input: params as unknown as Record<string, unknown>,
    output: data as Record<string, unknown>,
  });

  return data;
}

// ===== Tool definitions para Claude Agent SDK =====
export const toolDefinitions = [
  {
    name: 'query_requisicoes',
    description: 'Consulta requisições de compra com filtros opcionais por status e obra',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filtrar por status: recebida, aprovada, cotacao, pedido, recusada' },
        obra_id: { type: 'number', description: 'Filtrar por ID da obra' },
        limit: { type: 'number', description: 'Máximo de resultados (default 20)' },
      },
    },
  },
  {
    name: 'create_requisicao',
    description: 'Cria nova requisição de compra para uma obra',
    input_schema: {
      type: 'object' as const,
      properties: {
        descricao: { type: 'string', description: 'Descrição da requisição' },
        id_obracada: { type: 'number', description: 'ID da obra' },
        itens: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              produto: { type: 'string' },
              quantidade: { type: 'number' },
              unidade: { type: 'string' },
            },
            required: ['produto', 'quantidade', 'unidade'],
          },
          description: 'Itens da requisição',
        },
      },
      required: ['descricao', 'id_obracada', 'itens'],
    },
  },
  {
    name: 'query_cotacoes',
    description: 'Consulta cotações com filtros opcionais. Cotações com status "aberta" têm tracking ativo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        requisicao_id: { type: 'number', description: 'Filtrar por requisição' },
        status: { type: 'string', description: 'Filtrar por status: aberta, aprovada, concluida, pedido, recusada' },
        limit: { type: 'number', description: 'Máximo de resultados (default 20)' },
      },
    },
  },
  {
    name: 'create_cotacao',
    description: 'Gera cotação consolidada a partir de propostas de fornecedores',
    input_schema: {
      type: 'object' as const,
      properties: {
        id_requisicao: { type: 'number', description: 'ID da requisição' },
        descricao: { type: 'string', description: 'Descrição da cotação' },
        fornecedores: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fornecedor_id: { type: 'number' },
              valor: { type: 'number' },
              prazo: { type: 'string' },
              condicoes: { type: 'string' },
            },
            required: ['fornecedor_id', 'valor', 'prazo', 'condicoes'],
          },
        },
      },
      required: ['id_requisicao', 'descricao', 'fornecedores'],
    },
  },
  {
    name: 'query_fornecedores',
    description: 'Busca fornecedores por IDs, telefones ou texto. Usa RPCs SECURITY DEFINER por causa de RLS.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Buscar por IDs' },
        phones: { type: 'array', items: { type: 'string' }, description: 'Buscar por telefones' },
        search: { type: 'string', description: 'Busca por texto (razão social, nome fantasia)' },
      },
    },
  },
  {
    name: 'enviar_requisicao_fornecedor',
    description: 'Envia requisição de compra para um fornecedor via WhatsApp ou email',
    input_schema: {
      type: 'object' as const,
      properties: {
        requisicao_id: { type: 'number', description: 'ID da requisição' },
        fornecedor_id: { type: 'number', description: 'ID do fornecedor' },
        canal: { type: 'string', enum: ['whatsapp', 'email'], description: 'Canal de envio' },
        mensagem: { type: 'string', description: 'Mensagem a enviar' },
      },
      required: ['requisicao_id', 'fornecedor_id', 'canal', 'mensagem'],
    },
  },
  {
    name: 'analisar_proposta',
    description: 'Recupera dados de uma proposta analisada para avaliação',
    input_schema: {
      type: 'object' as const,
      properties: {
        proposta_id: { type: 'number', description: 'ID da proposta' },
      },
      required: ['proposta_id'],
    },
  },
  {
    name: 'query_tracking',
    description: 'Consulta status de envio de requisições por fornecedor',
    input_schema: {
      type: 'object' as const,
      properties: {
        requisicao_id: { type: 'number', description: 'Filtrar por requisição' },
        status: { type: 'string', description: 'Filtrar por status (enviado, respondido, proposta)' },
      },
    },
  },
  {
    name: 'responder_fornecedor',
    description: 'Responde a um fornecedor via WhatsApp ou email (dúvidas, follow-up)',
    input_schema: {
      type: 'object' as const,
      properties: {
        fornecedor_id: { type: 'number', description: 'ID do fornecedor' },
        canal: { type: 'string', enum: ['whatsapp', 'email'], description: 'Canal de resposta' },
        mensagem: { type: 'string', description: 'Mensagem de resposta' },
        requisicao_id: { type: 'number', description: 'ID da requisição (opcional, para contexto)' },
      },
      required: ['fornecedor_id', 'canal', 'mensagem'],
    },
  },
] as const;

// Map nome → função para dispatch
export const toolHandlers: Record<string, (params: any) => Promise<unknown>> = {
  query_requisicoes,
  create_requisicao,
  query_cotacoes,
  create_cotacao,
  query_fornecedores,
  enviar_requisicao_fornecedor,
  analisar_proposta,
  query_tracking,
  responder_fornecedor,
};
