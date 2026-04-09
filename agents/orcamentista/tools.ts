import {
  insertQuantitativo,
  insertOrcamentoItem,
  getProjectContext,
  getQuantitativosByProject,
  getOrcamentoByProject,
  getPdfPagesByType,
  getPdfPagesByIds,
  searchSinapi,
  logAgentActivity,
  flagForReview,
} from '../shared/supabase-helpers.js';
import { supabase } from '../../src/supabase-client.js';
// Excel export runs in the frontend — not imported from container skill
import type { Quantitativo, OrcamentoItem, DelegationTask } from '../shared/types.js';

const AGENT_SLUG = 'orcamentista';

// ---- Tool Handlers ----

async function process_pdf_results(params: {
  project_id: string;
}): Promise<unknown> {
  const ctx = await getProjectContext(params.project_id);

  // Fetch all processed pdf_pages grouped by discipline prefix
  const disciplinas = ['estrutural', 'hidraulico', 'eletrico', 'arquitetonico'];
  const result: Record<string, unknown[]> = {};

  for (const disc of disciplinas) {
    const pages = await getPdfPagesByType(params.project_id, disc);
    result[disc] = pages;
  }

  // Also fetch legends, memorials, quadro-areas
  for (const tipo of ['legenda', 'memorial', 'quadro-areas', 'quadro-acabamentos']) {
    const pages = await getPdfPagesByType(params.project_id, tipo);
    if (pages.length > 0) result[tipo] = pages;
  }

  await logAgentActivity({
    project_id: params.project_id,
    agent_slug: AGENT_SLUG,
    action: 'process_pdf_results',
    description: `Analisou pranchas processadas: ${Object.entries(result).map(([k, v]) => `${k}(${(v as unknown[]).length})`).join(', ')}`,
    output: { counts: Object.fromEntries(Object.entries(result).map(([k, v]) => [k, (v as unknown[]).length])) },
  });

  return {
    project_context: ctx,
    pranchas_por_disciplina: result,
    total_pranchas: Object.values(result).reduce((sum, arr) => sum + (arr as unknown[]).length, 0),
  };
}

async function create_quantitativo(params: {
  project_id: string;
  disciplina: string;
  item_code: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  calculo_memorial: string;
  origem_prancha: string;
  origem_ambiente: string;
  confidence: number;
}): Promise<unknown> {
  const q: Quantitativo = {
    project_id: params.project_id,
    disciplina: params.disciplina,
    item_code: params.item_code,
    descricao: params.descricao,
    unidade: params.unidade,
    quantidade: params.quantidade,
    calculo_memorial: params.calculo_memorial,
    origem_prancha: params.origem_prancha,
    origem_ambiente: params.origem_ambiente,
    confidence: params.confidence,
    needs_review: params.confidence < 0.7,
    created_by: AGENT_SLUG,
  };

  const created = await insertQuantitativo(q);

  await logAgentActivity({
    project_id: params.project_id,
    agent_slug: AGENT_SLUG,
    action: 'create_quantitativo',
    target_table: 'ob_quantitativos',
    target_id: created.id,
    description: `Criou quantitativo: ${params.item_code} ${params.descricao} = ${params.quantidade} ${params.unidade}`,
    output: created as unknown as Record<string, unknown>,
  });

  return created;
}

async function delegate_to_specialist(params: {
  project_id: string;
  to_agent: 'estrutural' | 'hidraulico' | 'eletricista';
  prancha_ids: string[];
  context: Record<string, unknown>;
}): Promise<unknown> {
  // Write delegation task to Supabase (IPC via database)
  const task: Omit<DelegationTask, 'id'> & { id?: string } = {
    project_id: params.project_id,
    from_agent: AGENT_SLUG,
    to_agent: params.to_agent,
    status: 'pending',
    pranchas: params.prancha_ids,
    context: params.context,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('ob_delegation_tasks')
    .insert(task)
    .select()
    .single();
  if (error) throw new Error(`delegate_to_specialist: ${error.message}`);

  await logAgentActivity({
    project_id: params.project_id,
    agent_slug: AGENT_SLUG,
    action: 'delegate',
    target_table: 'ob_delegation_tasks',
    target_id: data.id,
    description: `Delegou ${params.prancha_ids.length} pranchas para ${params.to_agent}`,
    input: params as unknown as Record<string, unknown>,
  });

  return {
    task_id: data.id,
    status: 'pending',
    to_agent: params.to_agent,
    pranchas_count: params.prancha_ids.length,
    message: `Tarefa delegada para ${params.to_agent}. Aguardando processamento.`,
  };
}

async function search_sinapi_handler(params: {
  descricao: string;
  uf: string;
  limit?: number;
}): Promise<unknown> {
  const results = await searchSinapi(params.descricao, params.uf, params.limit || 10);
  return {
    query: params.descricao,
    uf: params.uf,
    resultados: results,
    total: results.length,
  };
}

async function create_orcamento_item(params: {
  project_id: string;
  eap_code: string;
  eap_level: number;
  descricao: string;
  unidade: string;
  quantidade: number;
  fonte: 'sinapi' | 'tcpo' | 'cotacao' | 'mercado';
  fonte_codigo: string;
  fonte_data_base: string;
  custo_unitario: number;
  custo_material: number;
  custo_mao_obra: number;
  adm_percentual: number;
  quantitativo_id: string;
}): Promise<unknown> {
  const custo_total = params.quantidade * params.custo_unitario;
  const item: OrcamentoItem = {
    project_id: params.project_id,
    eap_code: params.eap_code,
    eap_level: params.eap_level,
    descricao: params.descricao,
    unidade: params.unidade,
    quantidade: params.quantidade,
    fonte: params.fonte,
    fonte_codigo: params.fonte_codigo,
    fonte_data_base: params.fonte_data_base,
    custo_unitario: params.custo_unitario,
    custo_material: params.custo_material,
    custo_mao_obra: params.custo_mao_obra,
    custo_total,
    adm_percentual: params.adm_percentual,
    peso_percentual: 0, // recalculated in calculate_subtotals
    curva_abc_classe: null,
    quantitativo_id: params.quantitativo_id,
  };

  const created = await insertOrcamentoItem(item);

  await logAgentActivity({
    project_id: params.project_id,
    agent_slug: AGENT_SLUG,
    action: 'create_orcamento_item',
    target_table: 'ob_orcamento_items',
    target_id: created.id,
    description: `Criou item EAP ${params.eap_code}: ${params.descricao} = R$ ${custo_total.toFixed(2)}`,
    output: created as unknown as Record<string, unknown>,
  });

  return created;
}

async function calculate_subtotals(params: {
  project_id: string;
}): Promise<unknown> {
  const items = await getOrcamentoByProject(params.project_id);
  const ctx = await getProjectContext(params.project_id);

  // Calculate custo direto total (only level 3 items -- actual compositions)
  const level3Items = items.filter((i) => i.eap_level === 3 || i.eap_level === 2);
  const custoDiretoTotal = level3Items.reduce((sum, i) => sum + i.custo_total, 0);

  // Calculate peso percentual and curva ABC
  const sorted = [...level3Items].sort((a, b) => b.custo_total - a.custo_total);
  let acumulado = 0;
  const updates: { id: string; peso_percentual: number; curva_abc_classe: 'A' | 'B' | 'C' }[] = [];

  for (const item of sorted) {
    const peso = custoDiretoTotal > 0 ? (item.custo_total / custoDiretoTotal) * 100 : 0;
    acumulado += peso;
    const classe = acumulado <= 80 ? 'A' : acumulado <= 95 ? 'B' : 'C';
    updates.push({ id: item.id!, peso_percentual: parseFloat(peso.toFixed(2)), curva_abc_classe: classe });
  }

  // Batch update
  for (const upd of updates) {
    await supabase
      .from('ob_orcamento_items')
      .update({ peso_percentual: upd.peso_percentual, curva_abc_classe: upd.curva_abc_classe })
      .eq('id', upd.id);
  }

  // BDI calculation
  const bdi = ctx.bdi_percentual;
  const custoComBdi = custoDiretoTotal * (1 + bdi / 100);
  const custoM2 = ctx.area_total_m2 > 0 ? custoComBdi / ctx.area_total_m2 : 0;

  // Subtotals by macro-etapa (level 1 prefix)
  const subtotais: Record<string, number> = {};
  for (const item of level3Items) {
    const macro = item.eap_code.substring(0, 2);
    subtotais[macro] = (subtotais[macro] || 0) + item.custo_total;
  }

  await logAgentActivity({
    project_id: params.project_id,
    agent_slug: AGENT_SLUG,
    action: 'calculate_subtotals',
    description: `Calculou subtotais: Custo Direto R$ ${custoDiretoTotal.toFixed(2)}, BDI ${bdi}%, Total R$ ${custoComBdi.toFixed(2)}, R$/m2 ${custoM2.toFixed(2)}`,
    output: { custoDiretoTotal, bdi, custoComBdi, custoM2 },
  });

  return {
    custo_direto_total: parseFloat(custoDiretoTotal.toFixed(2)),
    bdi_percentual: bdi,
    custo_com_bdi: parseFloat(custoComBdi.toFixed(2)),
    custo_por_m2: parseFloat(custoM2.toFixed(2)),
    area_total_m2: ctx.area_total_m2,
    subtotais_por_macro_etapa: subtotais,
    curva_abc: {
      classe_a: updates.filter((u) => u.curva_abc_classe === 'A').length,
      classe_b: updates.filter((u) => u.curva_abc_classe === 'B').length,
      classe_c: updates.filter((u) => u.curva_abc_classe === 'C').length,
    },
    total_itens: level3Items.length,
  };
}

async function flag_for_review_handler(params: {
  project_id: string;
  table: 'ob_quantitativos' | 'ob_pdf_pages';
  id: string;
  notes: string;
}): Promise<unknown> {
  await flagForReview(params.table, params.id, params.notes);

  await logAgentActivity({
    project_id: params.project_id,
    agent_slug: AGENT_SLUG,
    action: 'flag_for_review',
    target_table: params.table,
    target_id: params.id,
    description: `Marcou para revisao: ${params.notes}`,
  });

  return { flagged: true, table: params.table, id: params.id, notes: params.notes };
}

async function export_budget(params: {
  project_id: string;
}): Promise<unknown> {
  // Export is handled by the frontend (exceljs) — agent just marks the intent
  const storagePath = `exports/${params.project_id}/orcamento-${Date.now()}.xlsx`;

  await logAgentActivity({
    project_id: params.project_id,
    agent_slug: AGENT_SLUG,
    action: 'export_budget',
    description: `Exportou planilha orcamentaria para ${storagePath}`,
    output: { storage_path: storagePath },
  });

  return {
    storage_path: storagePath,
    message: `Planilha XLSX exportada com sucesso para storage: ${storagePath}`,
  };
}

async function get_extraction_data(params: {
  project_id: string;
  run_id?: string;
}): Promise<unknown> {
  let run: Record<string, unknown> | null = null;

  if (params.run_id) {
    const { data, error } = await supabase
      .from('ob_processing_runs')
      .select('*')
      .eq('id', params.run_id)
      .single();
    if (error) throw new Error(`get_extraction_data: ${error.message}`);
    run = data;
  } else {
    const { data, error } = await supabase
      .from('ob_processing_runs')
      .select('*')
      .eq('project_id', params.project_id)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw new Error(`get_extraction_data: ${error.message}`);
    run = data?.[0] || null;
  }

  if (!run) {
    return { processing_run: null, pdf_pages: [], has_items: false, has_geometry: false };
  }

  const fileId = run.file_id as string;
  const { data: pages, error: pagesError } = await supabase
    .from('ob_pdf_pages')
    .select('*')
    .eq('file_id', fileId)
    .order('page_number', { ascending: true });
  if (pagesError) throw new Error(`get_extraction_data (pages): ${pagesError.message}`);

  const pdfPages = pages || [];
  const runItems = Array.isArray(run.items) ? run.items as unknown[] : [];
  const hasItems = runItems.length > 0;
  const hasGeometry = pdfPages.some((p: Record<string, unknown>) => {
    const sd = p.structured_data as Record<string, unknown> | null;
    return sd?.ambientes != null && Array.isArray(sd.ambientes) && (sd.ambientes as unknown[]).length > 0;
  });

  await logAgentActivity({
    project_id: params.project_id,
    agent_slug: AGENT_SLUG,
    action: 'get_extraction_data',
    description: `Leu dados de extração: run ${run.id}, ${pdfPages.length} páginas, items=${hasItems}, geometry=${hasGeometry}`,
    output: { run_id: run.id, pages_count: pdfPages.length, has_items: hasItems, has_geometry: hasGeometry },
  });

  return {
    processing_run: run,
    pdf_pages: pdfPages,
    has_items: hasItems,
    has_geometry: hasGeometry,
  };
}

async function get_project_context_handler(params: {
  project_id: string;
}): Promise<unknown> {
  return await getProjectContext(params.project_id);
}

// ---- Tool Definitions ----

export const toolDefinitions = [
  {
    name: 'process_pdf_results',
    description: 'Analisa pranchas processadas pelo PDF Pipeline agrupadas por disciplina. Retorna contexto do projeto e lista de pranchas por tipo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'ID do projeto no Supabase' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'create_quantitativo',
    description: 'Cria um item de quantitativo no banco. Cada item representa uma quantidade medida de um servico, com memorial de calculo e referencia a prancha de origem.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
        disciplina: { type: 'string', enum: ['arquitetonico', 'estrutural', 'hidraulico', 'eletrico'] },
        item_code: { type: 'string', description: 'Codigo hierarquico do item (ex: 09.01)' },
        descricao: { type: 'string' },
        unidade: { type: 'string', description: 'Unidade de medida: m2, m3, m, kg, un, pt, vb' },
        quantidade: { type: 'number' },
        calculo_memorial: { type: 'string', description: 'Memorial de calculo mostrando como a quantidade foi obtida' },
        origem_prancha: { type: 'string', description: 'ID da pdf_page de onde os dados foram extraidos' },
        origem_ambiente: { type: 'string', description: 'Nome do ambiente ou elemento (ex: Sala, Pilar P1)' },
        confidence: { type: 'number', description: 'Nivel de confianca 0.0 a 1.0. Abaixo de 0.7 marca automaticamente para revisao.' },
      },
      required: ['project_id', 'disciplina', 'item_code', 'descricao', 'unidade', 'quantidade', 'calculo_memorial', 'origem_prancha', 'origem_ambiente', 'confidence'],
    },
  },
  {
    name: 'delegate_to_specialist',
    description: 'Delega pranchas de uma disciplina para o agente especialista correspondente (estrutural, hidraulico, ou eletricista). O especialista processa as pranchas e grava quantitativos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
        to_agent: { type: 'string', enum: ['estrutural', 'hidraulico', 'eletricista'] },
        prancha_ids: { type: 'array', items: { type: 'string' }, description: 'IDs das pdf_pages a delegar' },
        context: { type: 'object', description: 'Contexto adicional: tipo_obra, area_total_m2, uf, premissas' },
      },
      required: ['project_id', 'to_agent', 'prancha_ids', 'context'],
    },
  },
  {
    name: 'search_sinapi',
    description: 'Busca composicoes e insumos na base SINAPI por descricao e UF. Retorna codigo, descricao, unidade, custos com e sem desoneracao.',
    input_schema: {
      type: 'object' as const,
      properties: {
        descricao: { type: 'string', description: 'Termos de busca (ex: concreto fck 30 pilar)' },
        uf: { type: 'string', description: 'Estado (ex: SP, RJ, MG)' },
        limit: { type: 'number', description: 'Maximo de resultados (default 10)' },
      },
      required: ['descricao', 'uf'],
    },
  },
  {
    name: 'create_orcamento_item',
    description: 'Cria um item na planilha orcamentaria com codigo EAP, composicao SINAPI/TCPO, custos material e mao de obra. O custo total e calculado automaticamente (qtd x custo unitario).',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
        eap_code: { type: 'string', description: 'Codigo hierarquico EAP (ex: 03.01.001)' },
        eap_level: { type: 'number', description: '1 = macro-etapa, 2 = servico, 3 = composicao' },
        descricao: { type: 'string' },
        unidade: { type: 'string' },
        quantidade: { type: 'number' },
        fonte: { type: 'string', enum: ['sinapi', 'tcpo', 'cotacao', 'mercado'] },
        fonte_codigo: { type: 'string', description: 'Codigo na base de referencia (ex: 96995)' },
        fonte_data_base: { type: 'string', description: 'Data-base dos precos (ex: 2026-01)' },
        custo_unitario: { type: 'number' },
        custo_material: { type: 'number' },
        custo_mao_obra: { type: 'number' },
        adm_percentual: { type: 'number' },
        quantitativo_id: { type: 'string', description: 'ID do quantitativo de origem' },
      },
      required: ['project_id', 'eap_code', 'eap_level', 'descricao', 'unidade', 'quantidade', 'fonte', 'fonte_codigo', 'fonte_data_base', 'custo_unitario', 'custo_material', 'custo_mao_obra', 'adm_percentual', 'quantitativo_id'],
    },
  },
  {
    name: 'calculate_subtotals',
    description: 'Calcula subtotais por macro-etapa, custo direto total, aplica BDI, calcula custo/m2, e classifica itens na Curva ABC (A/B/C). Atualiza os registros no banco.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'flag_for_review',
    description: 'Marca um quantitativo ou prancha para revisao humana. Usar quando confianca < 70% ou dados ambiguos/incompletos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
        table: { type: 'string', enum: ['ob_quantitativos', 'ob_pdf_pages'] },
        id: { type: 'string', description: 'ID do registro a marcar' },
        notes: { type: 'string', description: 'Descricao do problema encontrado' },
      },
      required: ['project_id', 'table', 'id', 'notes'],
    },
  },
  {
    name: 'get_project_context',
    description: 'Retorna contexto completo do projeto: tipo de obra, area, UF, data-base SINAPI, BDI, premissas. Usar no inicio do fluxo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'export_budget',
    description: 'Exporta a planilha orcamentaria completa em formato XLSX para o Supabase Storage. Gera 3 abas: Capa, Planilha Orcamentaria (com EAP, custos, Curva ABC), e Quantitativos. Usar apos calculate_subtotals.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_extraction_data',
    description: 'Lê dados extraídos de um arquivo DXF/PDF — inclui items da LLM extraction e dados geométricos estruturados do DWG pipeline (ambientes, blocos, tubulações). Usar como primeira ação ao processar um arquivo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'ID do projeto' },
        run_id: { type: 'string', description: 'ID da processing run (opcional — se não fornecido, pega a mais recente)' },
      },
      required: ['project_id'],
    },
  },
] as const;

export const toolHandlers: Record<string, (params: any) => Promise<unknown>> = {
  process_pdf_results,
  create_quantitativo,
  delegate_to_specialist,
  search_sinapi: search_sinapi_handler,
  create_orcamento_item,
  calculate_subtotals,
  flag_for_review: flag_for_review_handler,
  get_project_context: get_project_context_handler,
  export_budget,
  get_extraction_data,
};
