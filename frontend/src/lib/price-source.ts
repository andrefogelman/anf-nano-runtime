export type TcpoInsumoLite = {
  classe: "MOD" | "MAT" | "EQH";
  total: number | null;
};

export type PriceSplit = {
  custo_unitario: number;
  custo_material: number;
  custo_mao_obra: number;
};

/**
 * Dado o custo_unitario final de uma composição TCPO (custo_com_taxas)
 * e a lista de insumos, calcula a divisão entre material e mão de obra
 * proporcionalmente à soma dos totais dos insumos.
 *
 * Regras:
 * - MOD → mão de obra
 * - MAT + EQH → material
 * - Se insumos somam 0 ou vazios, fallback: tudo em material
 *
 * O custo_unitario final é preservado: custo_material + custo_mao_obra === custo_unitario.
 * Isso importa porque soma dos insumos ≠ custo_com_taxas (LS + BDI).
 */
export function computeTcpoSplit(
  custoUnitario: number,
  insumos: TcpoInsumoLite[]
): PriceSplit {
  const mod = insumos
    .filter((i) => i.classe === "MOD")
    .reduce((s, i) => s + (i.total ?? 0), 0);
  const matEqh = insumos
    .filter((i) => i.classe === "MAT" || i.classe === "EQH")
    .reduce((s, i) => s + (i.total ?? 0), 0);
  const soma = mod + matEqh;

  if (soma <= 0) {
    return {
      custo_unitario: custoUnitario,
      custo_material: custoUnitario,
      custo_mao_obra: 0,
    };
  }

  const fracMod = mod / soma;
  return {
    custo_unitario: custoUnitario,
    custo_mao_obra: custoUnitario * fracMod,
    custo_material: custoUnitario * (1 - fracMod),
  };
}
