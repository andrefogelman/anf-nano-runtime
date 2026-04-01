import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  OrcamentoItem,
  OrcamentoInsert,
  OrcamentoUpdate,
  BudgetRow,
  BudgetFooterTotals,
  MacroEtapaSubtotal,
} from "@/types/orcamento";

export function useOrcamentoItems(projectId: string) {
  return useQuery({
    queryKey: ["orcamento", projectId],
    queryFn: async (): Promise<OrcamentoItem[]> => {
      const { data, error } = await supabase
        .from("ob_orcamento_items")
        .select("*")
        .eq("project_id", projectId)
        .order("eap_code", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

/** Build hierarchical tree from flat orcamento items */
export function buildBudgetTree(items: OrcamentoItem[]): BudgetRow[] {
  const level1Items = items.filter((i) => i.eap_level === 1);
  const level2Items = items.filter((i) => i.eap_level === 2);
  const level3Items = items.filter((i) => i.eap_level === 3);

  return level1Items.map((l1) => {
    const l1Prefix = l1.eap_code;
    const children2 = level2Items
      .filter((l2) => l2.eap_code.startsWith(l1Prefix + "."))
      .map((l2) => {
        const l2Prefix = l2.eap_code;
        const children3 = level3Items
          .filter((l3) => l3.eap_code.startsWith(l2Prefix + "."))
          .map((l3) => ({
            item: l3,
            children: [],
            isExpanded: true,
          }));
        return {
          item: l2,
          children: children3,
          isExpanded: true,
        };
      });
    return {
      item: l1,
      children: children2,
      isExpanded: true,
    };
  });
}

/** Calculate subtotals for each level-1 macro-etapa */
export function calculateSubtotals(items: OrcamentoItem[]): MacroEtapaSubtotal[] {
  const level1Items = items.filter((i) => i.eap_level === 1);

  return level1Items.map((l1) => {
    const prefix = l1.eap_code;
    const children = items.filter(
      (i) => i.eap_level > 1 && i.eap_code.startsWith(prefix + ".")
    );

    const leafItems = children.filter((child) => {
      return !children.some((other) => other.eap_code.startsWith(child.eap_code + "."));
    });

    const custo_material = leafItems.reduce((sum, i) => sum + (i.custo_material ?? 0), 0);
    const custo_mao_obra = leafItems.reduce((sum, i) => sum + (i.custo_mao_obra ?? 0), 0);
    const custo_total = leafItems.reduce((sum, i) => sum + (i.custo_total ?? 0), 0);
    const adm_total = leafItems.reduce(
      (sum, i) => sum + ((i.custo_total ?? 0) * (i.adm_percentual / 100)),
      0
    );

    return {
      eap_code: l1.eap_code,
      descricao: l1.descricao,
      custo_material,
      custo_mao_obra,
      custo_total,
      adm_total,
    };
  });
}

/** Calculate footer totals */
export function calculateFooterTotals(
  items: OrcamentoItem[],
  impostoPercentual = 0
): BudgetFooterTotals {
  const leafItems = items.filter((item) => {
    return !items.some((other) => other.eap_code.startsWith(item.eap_code + ".") && other.id !== item.id);
  });

  const custo_direto_total = leafItems.reduce((sum, i) => sum + (i.custo_total ?? 0), 0);
  const administracao_total = leafItems.reduce(
    (sum, i) => sum + ((i.custo_total ?? 0) * (i.adm_percentual / 100)),
    0
  );
  const subtotal = custo_direto_total + administracao_total;
  const impostos = subtotal * (impostoPercentual / 100);
  const preco_total_obra = subtotal + impostos;

  return {
    custo_direto_total,
    administracao_total,
    impostos,
    preco_total_obra,
  };
}

export function useUpdateOrcamentoItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: { id: string; projectId: string } & OrcamentoUpdate) => {
      const { data, error } = await supabase
        .from("ob_orcamento_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, projectId } as OrcamentoItem & { projectId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orcamento", (data as OrcamentoItem & { projectId: string }).projectId] });
    },
  });
}

export function useCreateOrcamentoItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: OrcamentoInsert) => {
      const { data, error } = await supabase
        .from("ob_orcamento_items")
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data as OrcamentoItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orcamento", data.project_id] });
    },
  });
}

export function useDeleteOrcamentoItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("ob_orcamento_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orcamento", data.projectId] });
    },
  });
}
