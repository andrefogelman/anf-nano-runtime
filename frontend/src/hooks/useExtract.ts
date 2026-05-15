import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const ORCABOT_API = import.meta.env.VITE_ORCABOT_API_URL || "";

export type Disciplina = "arq" | "est" | "mep" | "acab" | "quadro";
export type ExtractProvider = "openai" | "claude" | "google";
export type ExtractReasoning = "low" | "medium" | "high";

export const DISCIPLINA_LABELS: Record<Disciplina, string> = {
  arq: "Arquitetônica",
  est: "Estrutural",
  mep: "MEP (Hidráulico/Elétrico)",
  acab: "Acabamentos",
  quadro: "Quadro/Tabela genérica",
};

export interface ExtractResult {
  disciplina: string;
  label: string;
  data: Record<string, unknown>;
  duracao_s: number;
  custo_usd: number;
  model_used: string | null;
  quantitativos_inseridos: number;
}

export interface ExtractInput {
  disciplina: Disciplina;
  pdf: Blob;
  filename?: string;
  provider?: ExtractProvider;
  model?: string | null;
  reasoning_effort?: ExtractReasoning;
  project_id?: string | null;
  save_quantitativos?: boolean;
}

async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada — faça login novamente");
  return { Authorization: `Bearer ${token}` };
}

export function useExtract() {
  const qc = useQueryClient();
  return useMutation<ExtractResult, Error, ExtractInput>({
    mutationFn: async (input) => {
      const auth = await authHeader();
      const fd = new FormData();
      fd.append("pdf", input.pdf, input.filename ?? "planta.pdf");
      fd.append("provider", input.provider ?? "openai");
      if (input.model) fd.append("model", input.model);
      fd.append("reasoning_effort", input.reasoning_effort ?? "medium");
      if (input.project_id) fd.append("project_id", input.project_id);
      fd.append("save_quantitativos", String(input.save_quantitativos ?? false));

      const res = await fetch(
        `${ORCABOT_API}/api/extract/${input.disciplina}`,
        { method: "POST", headers: auth, body: fd },
      );
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(
          typeof err.detail === "string"
            ? err.detail
            : JSON.stringify(err.detail),
        );
      }
      return (await res.json()) as ExtractResult;
    },
    onSuccess: (_data, vars) => {
      if (vars.save_quantitativos && vars.project_id) {
        qc.invalidateQueries({ queryKey: ["quantitativos", vars.project_id] });
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────
// DXF tools
// ─────────────────────────────────────────────────────────────

export interface DxfParseResult {
  n_layers: number;
  layers: Array<{ name: string; color: number; linetype: string; is_off: boolean; is_frozen: boolean }>;
  entities_by_layer: Record<string, Record<string, number>>;
  block_inserts: Record<string, number>;
  n_entities_total: number;
}

export interface DxfAreasResult {
  layer_filter: string | null;
  results: Array<{
    layer: string;
    n_polylines: number;
    area_total: number;
    area_largest: number;
    area_smallest: number;
  }>;
}

export interface DxfCountResult {
  block_name: string;
  layer_filter: string | null;
  count: number;
}

export interface DxfTextResult {
  layer_filter: string | null;
  n_items: number;
  items: Array<{ text: string; layer: string; x: number; y: number }>;
}

export type DxfAction = "parse" | "areas" | "count" | "text";

export function useDxfAction<R>() {
  return useMutation<
    R,
    Error,
    {
      action: DxfAction;
      dxf: Blob;
      filename?: string;
      block_name?: string;
      layer_filter?: string | null;
    }
  >({
    mutationFn: async ({ action, dxf, filename = "drawing.dxf", block_name, layer_filter }) => {
      const auth = await authHeader();
      const fd = new FormData();
      fd.append("dxf", dxf, filename);
      if (block_name) fd.append("block_name", block_name);
      if (layer_filter) fd.append("layer_filter", layer_filter);

      const res = await fetch(`${ORCABOT_API}/api/dxf/${action}`, {
        method: "POST",
        headers: auth,
        body: fd,
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(
          typeof err.detail === "string"
            ? err.detail
            : JSON.stringify(err.detail),
        );
      }
      return (await res.json()) as R;
    },
  });
}
