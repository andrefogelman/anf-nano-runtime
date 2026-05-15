import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const ORCABOT_API =
  import.meta.env.VITE_ORCABOT_API_URL || "";

export type Provider = "openai" | "claude" | "google";
export type ReasoningEffort = "low" | "medium" | "high";

export interface RespostaOutput {
  valor_numerico: number | null;
  unidade: string | null;
  raciocinio: string;
  confianca: number;
  observacoes: string;
}

export interface AskResult {
  resposta: RespostaOutput;
  cache_hit: boolean;
  custo_usd: number;
  duracao_s: number;
  provider: string;
  model: string;
  query_id: string;
}

export interface PerguntaPayload {
  pergunta: string;
  variaveis?: Record<string, string | number | boolean>;
  provider?: Provider;
  model?: string | null;
  reasoning_effort?: ReasoningEffort;
  include_verification?: boolean;
  project_id?: string | null;
  pdf_page_id?: string | null;
}

export interface AskInput {
  pdf: Blob;
  filename?: string;
  payload: PerguntaPayload;
}

async function getAuthHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada — faça login novamente");
  return { Authorization: `Bearer ${token}` };
}

export function useAsk() {
  const queryClient = useQueryClient();
  return useMutation<AskResult, Error, AskInput>({
    mutationFn: async ({ pdf, filename = "planta.pdf", payload }) => {
      const auth = await getAuthHeader();
      const formData = new FormData();
      formData.append("pdf", pdf, filename);
      formData.append("payload", JSON.stringify(payload));

      // Vercel Pro = 300s (Fluid Compute). Damos 310s pro client cancelar antes
      // de pendurar caso edge tenha algum problema chegar resposta.
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 310_000);

      let res: Response;
      try {
        res = await fetch(`${ORCABOT_API}/api/ask`, {
          method: "POST",
          headers: auth,
          body: formData,
          signal: controller.signal,
        });
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          throw new Error(
            "Timeout cliente (>310s). Provider deve ter pendurado — tente outro modelo ou reasoning mais baixo.",
          );
        }
        throw e;
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (!res.ok) {
        // 504 do Vercel devolve HTML, não JSON
        if (res.status === 504) {
          throw new Error(
            "Timeout 504 — modelo demorou >300s ou plano Hobby ainda ativo (60s). Verifique upgrade Pro no Vercel dashboard.",
          );
        }
        if (res.status === 502) {
          throw new Error(
            "502 — provider externo (OpenAI/Claude/Gemini) falhou. Tente outro provider ou reasoning mais baixo.",
          );
        }
        const err = await res
          .json()
          .catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(
          typeof err.detail === "string"
            ? err.detail
            : JSON.stringify(err.detail),
        );
      }
      return (await res.json()) as AskResult;
    },
    onSuccess: (_data, variables) => {
      if (variables.payload.project_id) {
        queryClient.invalidateQueries({
          queryKey: ["vision-queries", variables.payload.project_id],
        });
      }
    },
  });
}

export interface VisionQueryRow {
  id: string;
  project_id: string | null;
  pdf_page_id: string | null;
  user_id: string | null;
  pergunta: string;
  variaveis: Record<string, unknown> | null;
  provider: string | null;
  model: string | null;
  reasoning_effort: string | null;
  resposta: RespostaOutput;
  cache_hit: boolean;
  custo_usd: number | null;
  duracao_s: number | null;
  created_at: string;
}

export function useVisionQueries(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["vision-queries", projectId],
    queryFn: async (): Promise<VisionQueryRow[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("ob_vision_queries")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as VisionQueryRow[];
    },
    enabled: !!projectId,
  });
}
