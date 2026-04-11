import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUpdateOrcamentoItem } from "./useOrcamento";
import { computeTcpoSplit, type TcpoInsumoLite } from "@/lib/price-source";
import type { OrcamentoItem } from "@/types/orcamento";
import type { SinapiComposicao } from "./useSinapi";
import type { TcpoComposicao } from "./useTcpo";

export type PriceSelection =
  | { kind: "sinapi"; composicao: SinapiComposicao }
  | { kind: "tcpo"; composicao: TcpoComposicao };

export type PreviousPriceData = {
  custo_unitario: number | null;
  custo_material: number | null;
  custo_mao_obra: number | null;
  custo_total: number | null;
  fonte: string | null;
  fonte_codigo: string | null;
  fonte_data_base: string | null;
};

export type ApplyResult = {
  previousData: PreviousPriceData;
};

export function useApplyPriceSource() {
  const updateItem = useUpdateOrcamentoItem();

  return useMutation<
    ApplyResult,
    Error,
    { item: OrcamentoItem; selection: PriceSelection }
  >({
    mutationFn: async ({ item, selection }) => {
      const qty = item.quantidade ?? 0;

      let custo_unitario: number;
      let custo_material: number;
      let custo_mao_obra: number;
      let fonte: "sinapi" | "tcpo";
      let fonte_codigo: string;
      let fonte_data_base: string;

      if (selection.kind === "sinapi") {
        custo_unitario = selection.composicao.custo_sem_desoneracao ?? 0;
        custo_material = 0;
        custo_mao_obra = 0;
        fonte = "sinapi";
        fonte_codigo = selection.composicao.codigo;
        fonte_data_base = selection.composicao.data_base;
      } else {
        const { data: insumos, error } = await supabase
          .from("ob_tcpo_insumos")
          .select("classe, total")
          .eq("composicao_id", selection.composicao.id);
        if (error) throw error;

        const split = computeTcpoSplit(
          selection.composicao.custo_com_taxas ?? 0,
          (insumos ?? []) as TcpoInsumoLite[]
        );
        custo_unitario = split.custo_unitario;
        custo_material = split.custo_material;
        custo_mao_obra = split.custo_mao_obra;
        fonte = "tcpo";
        fonte_codigo = selection.composicao.codigo;
        fonte_data_base = selection.composicao.data_precos;
      }

      const custo_total = custo_unitario * qty;

      const previousData: PreviousPriceData = {
        custo_unitario: item.custo_unitario,
        custo_material: item.custo_material,
        custo_mao_obra: item.custo_mao_obra,
        custo_total: item.custo_total,
        fonte: item.fonte,
        fonte_codigo: item.fonte_codigo,
        fonte_data_base: item.fonte_data_base,
      };

      await updateItem.mutateAsync({
        id: item.id,
        projectId: item.project_id,
        custo_unitario,
        custo_material,
        custo_mao_obra,
        custo_total,
        fonte,
        fonte_codigo,
        fonte_data_base,
      });

      return { previousData };
    },
  });
}
