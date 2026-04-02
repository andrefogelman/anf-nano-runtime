import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface TcpoComposicao {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  categoria: string;
  regiao: string;
  data_precos: string;
  ls_percentual: number;
  bdi_percentual: number;
  custo_sem_taxas: number;
  custo_com_taxas: number;
  search_term: string;
}

export interface TcpoInsumo {
  id: string;
  composicao_id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  classe: "MOD" | "MAT" | "EQH";
  coeficiente: number;
  preco_unitario: number;
  total: number;
  consumo: number;
}

export const TCPO_CATEGORIES = [
  "06. Alvenarias",
  "20. Revestimentos",
  "21. Forros",
  "22. Pisos",
  "23. Rev. Paredes",
  "24. Pinturas",
] as const;

export function useTcpoSearch(query: string, category: string | null) {
  return useQuery<TcpoComposicao[]>({
    queryKey: ["tcpo-composicoes", query, category],
    queryFn: async () => {
      let q = supabase
        .from("ob_tcpo_composicoes")
        .select("*")
        .order("codigo", { ascending: true });

      if (category) {
        q = q.eq("categoria", category);
      }

      if (query.trim()) {
        q = q.ilike("search_term", `%${query.trim()}%`);
      }

      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: (prev) => prev,
  });
}

export function useTcpoInsumos(composicaoId: string | null) {
  return useQuery<TcpoInsumo[]>({
    queryKey: ["tcpo-insumos", composicaoId],
    queryFn: async () => {
      if (!composicaoId) return [];
      const { data, error } = await supabase
        .from("ob_tcpo_insumos")
        .select("*")
        .eq("composicao_id", composicaoId)
        .order("classe", { ascending: true })
        .order("descricao", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!composicaoId,
  });
}

export function useTcpoCategoryCounts() {
  return useQuery<Record<string, number>>({
    queryKey: ["tcpo-category-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ob_tcpo_composicoes")
        .select("categoria");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.categoria] = (counts[row.categoria] ?? 0) + 1;
      }
      return counts;
    },
    staleTime: 1000 * 60 * 5,
  });
}
