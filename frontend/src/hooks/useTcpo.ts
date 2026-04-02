import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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

export type TcpoComposicaoInsert = Omit<TcpoComposicao, "id" | "search_term">;
export type TcpoInsumoInsert = Omit<TcpoInsumo, "id">;

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

// ── CRUD Mutations ──────────────────────────────────────────────

export function useCreateComposicao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comp: Partial<TcpoComposicaoInsert> & { codigo: string; descricao: string; unidade: string }) => {
      const { data, error } = await supabase
        .from("ob_tcpo_composicoes")
        .insert({
          ...comp,
          search_term: `${comp.codigo} ${comp.descricao}`.toLowerCase(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as TcpoComposicao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tcpo-composicoes"] });
      queryClient.invalidateQueries({ queryKey: ["tcpo-category-counts"] });
      toast.success("Composição criada com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar composição", { description: error.message });
    },
  });
}

export function useUpdateComposicao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TcpoComposicao>) => {
      // Rebuild search_term if descricao or codigo changed
      const patch: Record<string, unknown> = { ...updates };
      if (updates.descricao || updates.codigo) {
        // Need to fetch current values for the other field
        const { data: current } = await supabase
          .from("ob_tcpo_composicoes")
          .select("codigo, descricao")
          .eq("id", id)
          .single();
        const codigo = updates.codigo ?? current?.codigo ?? "";
        const descricao = updates.descricao ?? current?.descricao ?? "";
        patch.search_term = `${codigo} ${descricao}`.toLowerCase();
      }

      const { data, error } = await supabase
        .from("ob_tcpo_composicoes")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as TcpoComposicao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tcpo-composicoes"] });
      queryClient.invalidateQueries({ queryKey: ["tcpo-category-counts"] });
      toast.success("Composição atualizada");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar composição", { description: error.message });
    },
  });
}

export function useDeleteComposicao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ob_tcpo_composicoes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tcpo-composicoes"] });
      queryClient.invalidateQueries({ queryKey: ["tcpo-category-counts"] });
      toast.success("Composição excluída");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir composição", { description: error.message });
    },
  });
}

export function useCreateInsumo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insumo: TcpoInsumoInsert) => {
      const { data, error } = await supabase
        .from("ob_tcpo_insumos")
        .insert(insumo)
        .select()
        .single();
      if (error) throw error;
      return data as TcpoInsumo;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tcpo-insumos", variables.composicao_id] });
      toast.success("Insumo adicionado");
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar insumo", { description: error.message });
    },
  });
}

export function useUpdateInsumo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, composicao_id, ...updates }: { id: string; composicao_id: string } & Partial<TcpoInsumo>) => {
      const { data, error } = await supabase
        .from("ob_tcpo_insumos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, composicao_id } as TcpoInsumo;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tcpo-insumos", data.composicao_id] });
      toast.success("Insumo atualizado");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar insumo", { description: error.message });
    },
  });
}

export function useDeleteInsumo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, composicao_id }: { id: string; composicao_id: string }) => {
      const { error } = await supabase
        .from("ob_tcpo_insumos")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return composicao_id;
    },
    onSuccess: (composicao_id) => {
      queryClient.invalidateQueries({ queryKey: ["tcpo-insumos", composicao_id] });
      toast.success("Insumo excluído");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir insumo", { description: error.message });
    },
  });
}
