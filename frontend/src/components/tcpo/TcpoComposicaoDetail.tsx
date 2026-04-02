import { useTcpoInsumos, type TcpoComposicao, type TcpoInsumo } from "@/hooks/useTcpo";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

const CLASSE_STYLES: Record<string, { label: string; className: string }> = {
  MOD: { label: "MOD", className: "bg-blue-100 text-blue-800 border-blue-200" },
  MAT: { label: "MAT", className: "bg-green-100 text-green-800 border-green-200" },
  EQH: { label: "EQH", className: "bg-orange-100 text-orange-800 border-orange-200" },
};

function ClasseBadge({ classe }: { classe: string }) {
  const style = CLASSE_STYLES[classe] ?? { label: classe, className: "" };
  return <Badge className={style.className}>{style.label}</Badge>;
}

interface Props {
  composicao: TcpoComposicao;
}

export function TcpoComposicaoDetail({ composicao }: Props) {
  const { data: insumos, isLoading } = useTcpoInsumos(composicao.id);

  const totals = useMemo(() => {
    if (!insumos) return { mod: 0, mat: 0, eqh: 0, total: 0 };
    const mod = insumos.filter((i) => i.classe === "MOD").reduce((s, i) => s + i.total, 0);
    const mat = insumos.filter((i) => i.classe === "MAT").reduce((s, i) => s + i.total, 0);
    const eqh = insumos.filter((i) => i.classe === "EQH").reduce((s, i) => s + i.total, 0);
    return { mod, mat, eqh, total: mod + mat + eqh };
  }, [insumos]);

  return (
    <div className="space-y-4 bg-muted/30 p-4 rounded-b-lg border-x border-b">
      {/* Composition header info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Código:</span>{" "}
          <span className="font-medium">{composicao.codigo}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Unidade:</span>{" "}
          <span className="font-medium">{composicao.unidade}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Região:</span>{" "}
          <span className="font-medium">{composicao.regiao}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Data preços:</span>{" "}
          <span className="font-medium">{composicao.data_precos}</span>
        </div>
        <div>
          <span className="text-muted-foreground">LS:</span>{" "}
          <span className="font-medium">{formatPercent(composicao.ls_percentual)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">BDI:</span>{" "}
          <span className="font-medium">{formatPercent(composicao.bdi_percentual)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Sem taxas:</span>{" "}
          <span className="font-semibold">{formatBRL(composicao.custo_sem_taxas)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Com taxas:</span>{" "}
          <span className="font-semibold text-primary">{formatBRL(composicao.custo_com_taxas)}</span>
        </div>
      </div>

      {/* Insumos table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : insumos && insumos.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-16">Un</TableHead>
              <TableHead className="w-16">Classe</TableHead>
              <TableHead className="w-24 text-right">Coef.</TableHead>
              <TableHead className="w-28 text-right">Preço Unit.</TableHead>
              <TableHead className="w-28 text-right">Total</TableHead>
              <TableHead className="w-24 text-right">Consumo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {insumos.map((insumo: TcpoInsumo) => (
              <TableRow key={insumo.id}>
                <TableCell className="font-mono text-xs">{insumo.codigo}</TableCell>
                <TableCell className="max-w-xs truncate">{insumo.descricao}</TableCell>
                <TableCell>{insumo.unidade}</TableCell>
                <TableCell>
                  <ClasseBadge classe={insumo.classe} />
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatNumber(insumo.coeficiente, 4)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatBRL(insumo.preco_unitario)}
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  {formatBRL(insumo.total)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatNumber(insumo.consumo, 4)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={6} className="text-right font-medium">
                <span className="inline-flex items-center gap-1">
                  <ClasseBadge classe="MOD" /> Mão de obra
                </span>
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatBRL(totals.mod)}
              </TableCell>
              <TableCell />
            </TableRow>
            <TableRow>
              <TableCell colSpan={6} className="text-right font-medium">
                <span className="inline-flex items-center gap-1">
                  <ClasseBadge classe="MAT" /> Materiais
                </span>
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatBRL(totals.mat)}
              </TableCell>
              <TableCell />
            </TableRow>
            <TableRow>
              <TableCell colSpan={6} className="text-right font-medium">
                <span className="inline-flex items-center gap-1">
                  <ClasseBadge classe="EQH" /> Equipamentos
                </span>
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatBRL(totals.eqh)}
              </TableCell>
              <TableCell />
            </TableRow>
            <TableRow>
              <TableCell colSpan={6} className="text-right text-base font-bold">
                Total geral
              </TableCell>
              <TableCell className="text-right font-mono text-base font-bold text-primary">
                {formatBRL(totals.total)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum insumo encontrado para esta composição.
        </p>
      )}
    </div>
  );
}
