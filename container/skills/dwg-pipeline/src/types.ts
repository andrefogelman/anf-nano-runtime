// container/skills/dwg-pipeline/src/types.ts
import { z } from "zod";

// --- Re-export shared types from pdf-pipeline ---
// We re-declare the shared schemas here to avoid cross-skill imports at runtime.
// These MUST stay in sync with container/skills/pdf-pipeline/src/types.ts.

export const PageTipo = z.enum([
  "arquitetonico-planta-baixa",
  "arquitetonico-corte",
  "arquitetonico-fachada",
  "arquitetonico-cobertura",
  "arquitetonico-situacao",
  "estrutural-forma",
  "estrutural-armacao",
  "estrutural-detalhe",
  "hidraulico-agua-fria",
  "hidraulico-esgoto",
  "hidraulico-pluvial",
  "eletrico-pontos",
  "eletrico-caminhamento",
  "eletrico-unifilar",
  "legenda",
  "memorial",
  "quadro-areas",
  "quadro-acabamentos",
  "capa",
  "outro",
]);
export type PageTipo = z.infer<typeof PageTipo>;

export const AberturaSchema = z.object({
  tipo: z.enum(["porta", "janela", "portao", "basculante", "maxim-ar", "outro"]),
  dim: z.string().describe("Dimensions as WxH in meters, e.g. '0.80x2.10'"),
  qtd: z.number().int().positive(),
  codigo: z.string().optional().describe("Door/window code from legend, e.g. P1, J2"),
});
export type Abertura = z.infer<typeof AberturaSchema>;

export const AcabamentosSchema = z.object({
  piso: z.string(),
  parede: z.string(),
  forro: z.string(),
  rodape: z.string().optional(),
  soleira: z.string().optional(),
});
export type Acabamentos = z.infer<typeof AcabamentosSchema>;

export const AmbienteSchema = z.object({
  nome: z.string(),
  area_m2: z.number().positive(),
  perimetro_m: z.number().positive(),
  pe_direito_m: z.number().positive(),
  acabamentos: AcabamentosSchema,
  aberturas: z.array(AberturaSchema),
  confidence: z.number().min(0).max(1),
});
export type Ambiente = z.infer<typeof AmbienteSchema>;

export const ReviewItemSchema = z.object({
  ambiente: z.string(),
  campo: z.string(),
  motivo: z.string(),
  confidence: z.number().min(0).max(1),
});
export type ReviewItem = z.infer<typeof ReviewItemSchema>;

// --- DWG-specific Disciplina ---

export const Disciplina = z.enum(["arq", "est", "hid", "ele", "cotas", "anotacoes", "ignorar"]);
export type Disciplina = z.infer<typeof Disciplina>;

export const ComponenteDisciplina = z.enum(["arq", "est", "hid", "ele", "geral"]);
export type ComponenteDisciplina = z.infer<typeof ComponenteDisciplina>;

// --- DXF Layer ---

export const DxfLayerSchema = z.object({
  name: z.string(),
  color: z.number(),
  is_on: z.boolean(),
  is_frozen: z.boolean(),
  entity_counts: z.record(z.string(), z.number()),
});
export type DxfLayer = z.infer<typeof DxfLayerSchema>;

// --- DXF Entity (geometric) ---

export const DxfEntitySchema = z.object({
  type: z.enum(["LINE", "LWPOLYLINE", "CIRCLE", "ARC", "ELLIPSE"]),
  layer: z.string(),
  start: z.tuple([z.number(), z.number()]).optional(),
  end: z.tuple([z.number(), z.number()]).optional(),
  vertices: z.array(z.tuple([z.number(), z.number()])).optional(),
  center: z.tuple([z.number(), z.number()]).optional(),
  radius: z.number().optional(),
  start_angle: z.number().optional(),
  end_angle: z.number().optional(),
  major_axis: z.tuple([z.number(), z.number()]).optional(),
  ratio: z.number().optional(),
  length: z.number().optional(),
  area: z.number().optional(),
  is_closed: z.boolean().optional(),
});
export type DxfEntity = z.infer<typeof DxfEntitySchema>;

// --- DXF Block (INSERT) ---

export const DxfBlockSchema = z.object({
  name: z.string(),
  position: z.tuple([z.number(), z.number()]),
  rotation: z.number(),
  scale_x: z.number(),
  scale_y: z.number(),
  layer: z.string(),
  count: z.number().describe("Total insertions of this block name across the drawing"),
  internal_entities: z.array(DxfEntitySchema).optional().describe("Geometric content inside the block definition"),
});
export type DxfBlock = z.infer<typeof DxfBlockSchema>;

// --- DXF Dimension ---

export const DxfDimensionSchema = z.object({
  type: z.enum(["linear", "angular", "radial", "diameter", "ordinate"]),
  actual_measurement: z.number(),
  position: z.tuple([z.number(), z.number()]),
  layer: z.string(),
});
export type DxfDimension = z.infer<typeof DxfDimensionSchema>;

// --- DXF Text ---

export const DxfTextSchema = z.object({
  type: z.enum(["TEXT", "MTEXT"]),
  content: z.string(),
  position: z.tuple([z.number(), z.number()]),
  height: z.number(),
  rotation: z.number(),
  layer: z.string(),
});
export type DxfText = z.infer<typeof DxfTextSchema>;

// --- DXF Hatch ---

export const DxfHatchSchema = z.object({
  layer: z.string(),
  pattern: z.string(),
  area: z.number(),
  vertices: z.array(z.array(z.number()).length(2)).optional(),
});
export type DxfHatch = z.infer<typeof DxfHatchSchema>;

/** Minimum area in mm² to consider a closed polyline as a room boundary */
export const MIN_ROOM_AREA_MM2 = 500_000; // 0.5 m²

// --- Full extraction result from Python extractor ---

export const ExtractedDxfDataSchema = z.object({
  filename: z.string(),
  units: z.string().describe("Drawing units: mm, cm, m, in, ft"),
  layers: z.array(DxfLayerSchema),
  entities: z.array(DxfEntitySchema),
  blocks: z.array(DxfBlockSchema),
  dimensions: z.array(DxfDimensionSchema),
  texts: z.array(DxfTextSchema),
  hatches: z.array(DxfHatchSchema),
  stats: z.object({
    total_layers: z.number(),
    total_entities: z.number(),
    total_blocks: z.number(),
    total_dimensions: z.number(),
    total_texts: z.number(),
    total_hatches: z.number(),
  }),
});
export type ExtractedDxfData = z.infer<typeof ExtractedDxfDataSchema>;

// --- Block Mapping (persisted per org) ---

export const BlockMappingSchema = z.object({
  id: z.string().uuid().optional(),
  org_id: z.string().uuid(),
  block_name: z.string(),
  componente: z.string(),
  disciplina: ComponenteDisciplina,
  unidade: z.string(),
  confirmed: z.boolean().default(false),
});
export type BlockMapping = z.infer<typeof BlockMappingSchema>;

// --- Layer Mapping (persisted per org) ---

export const LayerMappingSchema = z.object({
  id: z.string().uuid().optional(),
  org_id: z.string().uuid(),
  layer_name: z.string(),
  disciplina: Disciplina,
  confirmed: z.boolean().default(false),
});
export type LayerMapping = z.infer<typeof LayerMappingSchema>;

// --- Classified Layer (runtime, not persisted directly) ---

export const ClassifiedLayerSchema = z.object({
  name: z.string(),
  disciplina: Disciplina,
  confidence: z.number().min(0).max(1),
  method: z.enum(["regex", "content", "llm", "cached"]),
});
export type ClassifiedLayer = z.infer<typeof ClassifiedLayerSchema>;

// --- Mapped Block (runtime) ---

export const MappedBlockSchema = z.object({
  name: z.string(),
  componente: z.string(),
  disciplina: ComponenteDisciplina,
  unidade: z.string(),
  contagem: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
  needs_review: z.boolean(),
});
export type MappedBlock = z.infer<typeof MappedBlockSchema>;

// --- DWG Bloco output (for structured JSON) ---

export const DwgBlocoSchema = z.object({
  nome: z.string(),
  contagem: z.number().int().positive(),
  disciplina: ComponenteDisciplina.nullable(),
  confidence: z.number().min(0).max(1),
  needs_review: z.boolean(),
});
export type DwgBloco = z.infer<typeof DwgBlocoSchema>;

// --- DWG Tubulacao output ---

export const DwgTubulacaoSchema = z.object({
  diametro_mm: z.number().positive(),
  material: z.string(),
  comprimento_m: z.number().positive(),
  layer: z.string(),
});
export type DwgTubulacao = z.infer<typeof DwgTubulacaoSchema>;

// --- DWG Page Output (extends shared PageOutput concept) ---

export const DwgPageOutputSchema = z.object({
  prancha: z.string().describe("Drawing sheet ID, e.g. ARQ-01"),
  tipo: PageTipo,
  source: z.literal("dwg"),
  pavimento: z.string().describe("Floor level: terreo, superior, subsolo, cobertura"),
  page_number: z.number().int().positive(),
  ambientes: z.array(AmbienteSchema),
  blocos: z.array(DwgBlocoSchema),
  tubulacoes: z.array(DwgTubulacaoSchema),
  needs_review: z.array(z.string()).describe("Block or item names that need human review"),
});
export type DwgPageOutput = z.infer<typeof DwgPageOutputSchema>;

// --- Conversion result ---

export const ConversionResultSchema = z.object({
  success: z.boolean(),
  dxfPath: z.string().optional(),
  error: z.string().optional(),
});
export type ConversionResult = z.infer<typeof ConversionResultSchema>;

// --- Pipeline job status (reused from pdf-pipeline) ---

export type JobStatus = "pending" | "processing" | "done" | "error" | "needs_conversion";

export type DwgJobStage =
  | "pending"
  | "ingestion"
  | "conversion"
  | "extraction"
  | "classification"
  | "structured_output"
  | "done"
  | "error";

export interface DwgJob {
  id: string;
  file_id: string;
  status: JobStatus;
  stage: DwgJobStage;
  progress: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

// Confidence thresholds
export const CONFIDENCE_DXF_GEOMETRY = 0.97;
export const CONFIDENCE_BLOCK_REGEX = 0.95;
export const CONFIDENCE_LAYER_REGEX = 0.95;
export const CONFIDENCE_LAYER_CONTENT = 0.85;
export const CONFIDENCE_TEXT_POSITION = 0.80;
export const CONFIDENCE_LAYER_LLM = 0.75;
export const CONFIDENCE_BLOCK_LLM = 0.70;
