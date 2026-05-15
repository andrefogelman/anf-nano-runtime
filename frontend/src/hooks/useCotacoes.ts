import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CotacaoMercado {
  id: string;
  project_id: string;
  descricao: string;
  unidade: string;
  fornecedor: string | null;
  valor_unitario: number;
  validade: string | null; // ISO date
  observacoes: string | null;
  created_at: string;
}

export type CotacaoInput = Omit<CotacaoMercado, "id" | "created_at">;

export function useCotacoes(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["cotacoes-mercado", projectId],
    queryFn: async (): Promise<CotacaoMercado[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("ob_cotacoes_mercado")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CotacaoMercado[];
    },
    enabled: !!projectId,
  });
}

export function useCreateCotacao() {
  const qc = useQueryClient();
  return useMutation<CotacaoMercado, Error, CotacaoInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from("ob_cotacoes_mercado")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CotacaoMercado;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["cotacoes-mercado", data.project_id] });
    },
  });
}

export function useUpdateCotacao() {
  const qc = useQueryClient();
  return useMutation<
    CotacaoMercado,
    Error,
    { id: string; patch: Partial<CotacaoInput> }
  >({
    mutationFn: async ({ id, patch }) => {
      const { data, error } = await supabase
        .from("ob_cotacoes_mercado")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CotacaoMercado;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["cotacoes-mercado", data.project_id] });
    },
  });
}

export function useDeleteCotacao() {
  const qc = useQueryClient();
  return useMutation<{ id: string; project_id: string }, Error, { id: string; project_id: string }>({
    mutationFn: async ({ id, project_id }) => {
      const { error } = await supabase
        .from("ob_cotacoes_mercado")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { id, project_id };
    },
    onSuccess: ({ project_id }) => {
      qc.invalidateQueries({ queryKey: ["cotacoes-mercado", project_id] });
    },
  });
}
