import { useQuery } from "@tanstack/react-query";
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

export function useSinapiSearch(query: string, tipo: string | null, classe: string | null) {
  return useQuery<SinapiComposicao[]>({
    queryKey: ["sinapi-composicoes", query, tipo, classe],
    queryFn: async () => {
      let q = supabase
        .from("ob_sinapi_composicoes")
        .select("*")
        .order("codigo", { ascending: true });

      if (tipo) q = q.eq("tipo", tipo);
      if (classe) q = q.eq("classe", classe);

      if (query.trim()) {
        q = q.or(`descricao.ilike.%${query.trim()}%,codigo.ilike.%${query.trim()}%`);
      }

      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data ?? [];
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

      const counts: SinapiCounts = { material: 0, mao_obra: 0, equipamento: 0, composicao: 0, total: 0 };

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
