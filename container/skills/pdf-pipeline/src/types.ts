// container/skills/pdf-pipeline/src/types.ts
import { z } from "zod";

// --- Page classification types ---

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

// --- Abertura (opening) ---

export const AberturaSchema = z.object({
  tipo: z.enum(["porta", "janela", "portao", "basculante", "maxim-ar", "outro"]),
  dim: z.string().describe("Dimensions as WxH in meters, e.g. '0.80x2.10'"),
  qtd: z.number().int().positive(),
  codigo: z.string().optional().describe("Door/window code from legend, e.g. P1, J2"),
});
export type Abertura = z.infer<typeof AberturaSchema>;

// --- Acabamentos (finishes) ---

export const AcabamentosSchema = z.object({
  piso: z.string(),
  parede: z.string(),
  forro: z.string(),
  rodape: z.string().optional(),
  soleira: z.string().optional(),
});
export type Acabamentos = z.infer<typeof AcabamentosSchema>;

// --- Ambiente (room/environment) ---

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

// --- Review item ---

export const ReviewItemSchema = z.object({
  ambiente: z.string(),
  campo: z.string(),
  motivo: z.string(),
  confidence: z.number().min(0).max(1),
});
export type ReviewItem = z.infer<typeof ReviewItemSchema>;

// --- Page output (main schema) ---

export const PageOutputSchema = z.object({
  prancha: z.string().describe("Drawing sheet ID, e.g. ARQ-01"),
  tipo: PageTipo,
  pavimento: z.string().describe("Floor level: terreo, superior, subsolo, cobertura"),
  page_number: z.number().int().positive(),
  ambientes: z.array(AmbienteSchema),
  needs_review: z.array(ReviewItemSchema),
});
export type PageOutput = z.infer<typeof PageOutputSchema>;

// --- Pipeline job status ---

export type JobStatus = "pending" | "processing" | "done" | "error";

export type JobStage =
  | "pending"
  | "ingestion"
  | "extraction"
  | "classification"
  | "interpretation"
  | "structured_output"
  | "done"
  | "error";

export interface PdfJob {
  id: string;
  file_id: string;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

// --- Extraction result per page ---

export interface ExtractedPage {
  page_number: number;
  text_content: string;
  ocr_used: boolean;
  char_count: number;
}

// --- Classification result per page ---

export interface ClassifiedPage extends ExtractedPage {
  tipo: PageTipo;
  prancha: string;
  pavimento: string;
  classification_confidence: number;
}

// --- Renderer output ---

export interface RenderedPage {
  page_number: number;
  image_path: string;
  width: number;
  height: number;
}

// --- Interpretation result ---

export interface InterpretedPage extends ClassifiedPage {
  ambientes: Ambiente[];
  needs_review: ReviewItem[];
  image_path: string;
}

// Minimum characters per page before OCR fallback triggers
export const MIN_NATIVE_TEXT_CHARS = 50;

// Confidence threshold for needs_review flagging
export const CONFIDENCE_THRESHOLD = 0.7;
