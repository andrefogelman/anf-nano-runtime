import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface SinapiComposicao {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  tipo: string;
  classe: string;
  uf: string;
  data_base: string;
  custo_com_desoneracao: number;
  custo_sem_desoneracao: number;
}

export interface SinapiCounts {
  material: number;
  mao_obra: number;
  equipamento: number;
  composicao: number;
  total: number;
}

export interface SinapiSearchResult {
  data: SinapiComposicao[];
  count: number;
  totalPages: number;
}

export function useSinapiSearch(
  query: string,
  tipo: string | null,
  classe: string | null,
  page: number = 1,
  pageSize: number = 50,
) {
  return useQuery<SinapiSearchResult>({
    queryKey: ["sinapi-composicoes", query, tipo, classe, page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from("ob_sinapi_composicoes")
        .select("*", { count: "exact" })
        .order("codigo", { ascending: true })
        .range(from, to);

      if (tipo) q = q.eq("tipo", tipo);
      if (classe) q = q.eq("classe", classe);

      if (query.trim()) {
        // Hybrid: each word must match descricao (SINAPI uses uppercase, ilike is case-insensitive)
        const words = query.trim().split(/\s+/).filter(Boolean);
        for (const word of words) {
          q = q.ilike("descricao", `%${word}%`);
        }
      }

      const { data, error, count } = await q;
      if (error) throw error;

      const total = count ?? 0;
      return {
        data: data ?? [],
        count: total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    },
    placeholderData: (prev) => prev,
  });
}

export function useSinapiCounts() {
  return useQuery<SinapiCounts>({
    queryKey: ["sinapi-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ob_sinapi_composicoes")
        .select("tipo, classe");
      if (error) throw error;

      const counts: SinapiCounts = {
        material: 0,
        mao_obra: 0,
        equipamento: 0,
        composicao: 0,
        total: 0,
      };

      for (const row of data ?? []) {
        counts.total++;
        if (row.tipo === "composicao") {
          counts.composicao++;
        } else if (row.tipo === "insumo") {
          if (row.classe === "material") counts.material++;
          else if (row.classe === "mao_obra") counts.mao_obra++;
          else if (row.classe === "equipamento") counts.equipamento++;
        }
      }

      return counts;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateSinapi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: string | number }) => {
      const { error } = await supabase
        .from("ob_sinapi_composicoes")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sinapi-composicoes"] });
    },
  });
}
