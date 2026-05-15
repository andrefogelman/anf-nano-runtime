import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const ORCABOT_API = import.meta.env.VITE_ORCABOT_API_URL || "";

export interface SinapiMatchInput {
  descricao: string;
  uf?: string;
  top_k?: number;
  rerank_k?: number;
  match_threshold?: number;
}

export interface SinapiPriceRow {
  codigo: string;
  descricao: string;
  unidade: string;
  custo_com_desoneracao: number | null;
  custo_sem_desoneracao: number | null;
  data_base: string;
  uf: string;
}

export interface SinapiMatchResult {
  codigo: string;
  titulo: string;
  motivo: string;
  similarity: number;
  source_title?: string | null;
  source_file?: string | null;
  preco?: SinapiPriceRow;
}

export interface SinapiMatchResponse {
  descricao: string;
  uf: string;
  results: SinapiMatchResult[];
  n_candidates: number;
  n_returned: number;
}

async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada — faça login novamente");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function useSinapiMatch() {
  return useMutation<SinapiMatchResponse, Error, SinapiMatchInput>({
    mutationFn: async (input) => {
      const headers = await authHeader();
      const res = await fetch(`${ORCABOT_API}/api/sinapi/match`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          descricao: input.descricao,
          uf: (input.uf ?? "SP").toUpperCase(),
          top_k: input.top_k ?? 10,
          rerank_k: input.rerank_k ?? 3,
          match_threshold: input.match_threshold ?? 0.4,
        }),
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
      return (await res.json()) as SinapiMatchResponse;
    },
  });
}
