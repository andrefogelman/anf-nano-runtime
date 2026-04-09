// ---- Domain types matching Supabase schema (Plan 1) ----

export type Disciplina = 'arquitetonico' | 'estrutural' | 'hidraulico' | 'eletrico' | 'memorial';

export interface Quantitativo {
  id?: string;
  project_id: string;
  disciplina: Disciplina | string;
  item_code: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  calculo_memorial: string;
  origem_prancha: string | null; // -> pdf_pages.id (nullable when no page exists)
  origem_ambiente: string;
  confidence: number;
  needs_review: boolean;
  created_by: string;           // agent slug
  reviewed_by?: string | null;
}

export interface OrcamentoItem {
  id?: string;
  project_id: string;
  eap_code: string;             // e.g. '03.01.001'
  eap_level: number;            // 1 = macro-etapa, 2 = servico, 3 = composicao
  descricao: string;
  unidade: string;
  quantidade: number;
  fonte: 'sinapi' | 'tcpo' | 'cotacao' | 'mercado';
  fonte_codigo: string;
  fonte_data_base: string;      // e.g. '2026-01'
  custo_unitario: number;
  custo_material: number;
  custo_mao_obra: number;
  custo_total: number;
  adm_percentual: number;
  peso_percentual: number;
  curva_abc_classe: 'A' | 'B' | 'C' | null;
  quantitativo_id: string;      // -> quantitativos.id
}

export interface DelegationTask {
  id: string;
  project_id: string;
  from_agent: string;
  to_agent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  pranchas: string[];           // pdf_pages.id[]
  context: Record<string, unknown>;
  created_at: string;
}

export interface DelegationResult {
  task_id: string;
  from_agent: string;
  status: 'completed' | 'failed';
  quantitativos_created: string[];
  summary: string;
  warnings: string[];
  completed_at: string;
}

export interface SinapiComposicao {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  uf: string;
  data_base: string;
  custo_com_desoneracao: number;
  custo_sem_desoneracao: number;
  tipo: 'composicao' | 'insumo';
  classe: 'material' | 'mao_obra' | 'equipamento';
}

export interface PdfPageData {
  id: string;
  file_id: string;
  page_number: number;
  prancha_id: string;
  tipo: string;
  text_content: string;
  structured_data: Record<string, unknown>;
  confidence: number;
  needs_review: boolean;
}

export interface AgentContext {
  project_id: string;
  tipo_obra: string;
  area_total_m2: number;
  uf: string;
  cidade: string;
  data_base_sinapi: string;
  bdi_percentual: number;
  premissas: Record<string, unknown>;
}
