// Organization types
type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  settings: Record<string, unknown>;
  created_at: string;
};

type OrgMemberRow = {
  org_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
};

type ProjectRow = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  tipo_obra: string;
  area_total_m2: number | null;
  uf: string;
  cidade: string | null;
  data_base_sinapi: string | null;
  bdi_percentual: number | null;
  status: "draft" | "processing" | "review" | "done";
  premissas: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type ProjectFileRow = {
  id: string;
  project_id: string;
  storage_path: string;
  filename: string;
  file_type: "pdf" | "dwg" | "xlsx";
  disciplina: "arq" | "est" | "hid" | "ele" | "memorial" | null;
  status: "uploaded" | "processing" | "done" | "error";
  created_at: string;
};

type PdfPageRow = {
  id: string;
  file_id: string;
  page_number: number;
  prancha_id: string | null;
  tipo: string | null;
  text_content: string | null;
  ocr_used: boolean;
  image_path: string | null;
  structured_data: Record<string, unknown> | null;
  confidence: number | null;
  needs_review: boolean;
  review_notes: string | null;
  created_at: string;
};

type PdfJobRow = {
  id: string;
  file_id: string;
  status: "pending" | "processing" | "done" | "error";
  stage: string | null;
  progress: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type QuantitativoRow = {
  id: string;
  project_id: string;
  disciplina: string;
  item_code: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  calculo_memorial: string | null;
  origem_prancha: string | null;
  origem_ambiente: string | null;
  confidence: number | null;
  needs_review: boolean;
  created_by: string | null;
  reviewed_by: string | null;
  created_at: string;
};

type OrcamentoItemRow = {
  id: string;
  project_id: string;
  eap_code: string;
  eap_level: number;
  descricao: string;
  unidade: string | null;
  quantidade: number | null;
  fonte: string | null;
  fonte_codigo: string | null;
  fonte_data_base: string | null;
  custo_unitario: number | null;
  custo_material: number | null;
  custo_mao_obra: number | null;
  custo_total: number | null;
  adm_percentual: number;
  peso_percentual: number | null;
  curva_abc_classe: "A" | "B" | "C" | null;
  quantitativo_id: string | null;
  created_at: string;
  updated_at: string;
};

type AgentConversationRow = {
  id: string;
  project_id: string;
  agent_slug: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls: Record<string, unknown>[] | null;
  created_at: string;
};

type AgentActivityLogRow = {
  id: string;
  project_id: string;
  agent_slug: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  description: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  created_at: string;
};

type SinapiComposicaoRow = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  uf: string;
  data_base: string;
  custo_com_desoneracao: number;
  custo_sem_desoneracao: number;
  tipo: "composicao" | "insumo";
  classe: "material" | "mao_obra" | "equipamento";
};

type CotacaoMercadoRow = {
  id: string;
  project_id: string;
  descricao: string;
  unidade: string;
  fornecedor: string | null;
  valor_unitario: number;
  validade: string | null;
  observacoes: string | null;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      ob_organizations: {
        Row: OrganizationRow;
        Insert: Omit<OrganizationRow, "id" | "created_at">;
        Update: Partial<Omit<OrganizationRow, "id" | "created_at">>;
      };
      ob_org_members: {
        Row: OrgMemberRow;
        Insert: Omit<OrgMemberRow, "created_at">;
        Update: Partial<Omit<OrgMemberRow, "created_at">>;
      };
      ob_projects: {
        Row: ProjectRow;
        Insert: Omit<ProjectRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ProjectRow, "id" | "created_at" | "updated_at">>;
      };
      ob_project_files: {
        Row: ProjectFileRow;
        Insert: Omit<ProjectFileRow, "id" | "created_at">;
        Update: Partial<Omit<ProjectFileRow, "id" | "created_at">>;
      };
      ob_pdf_pages: {
        Row: PdfPageRow;
        Insert: Omit<PdfPageRow, "id" | "created_at">;
        Update: Partial<Omit<PdfPageRow, "id" | "created_at">>;
      };
      ob_pdf_jobs: {
        Row: PdfJobRow;
        Insert: Omit<PdfJobRow, "id" | "created_at">;
        Update: Partial<Omit<PdfJobRow, "id" | "created_at">>;
      };
      ob_quantitativos: {
        Row: QuantitativoRow;
        Insert: Omit<QuantitativoRow, "id" | "created_at">;
        Update: Partial<Omit<QuantitativoRow, "id" | "created_at">>;
      };
      ob_orcamento_items: {
        Row: OrcamentoItemRow;
        Insert: Omit<OrcamentoItemRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<OrcamentoItemRow, "id" | "created_at" | "updated_at">>;
      };
      ob_agent_conversations: {
        Row: AgentConversationRow;
        Insert: Omit<AgentConversationRow, "id" | "created_at">;
        Update: Partial<Omit<AgentConversationRow, "id" | "created_at">>;
      };
      ob_agent_activity_log: {
        Row: AgentActivityLogRow;
        Insert: Omit<AgentActivityLogRow, "id" | "created_at">;
        Update: Partial<Omit<AgentActivityLogRow, "id" | "created_at">>;
      };
      ob_sinapi_composicoes: {
        Row: SinapiComposicaoRow;
        Insert: SinapiComposicaoRow;
        Update: Partial<SinapiComposicaoRow>;
      };
      ob_cotacoes_mercado: {
        Row: CotacaoMercadoRow;
        Insert: Omit<CotacaoMercadoRow, "id" | "created_at">;
        Update: Partial<Omit<CotacaoMercadoRow, "id" | "created_at">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
