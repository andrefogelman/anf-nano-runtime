import { useEffect, useState } from "react";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import {
  DEFAULT_BDI,
  useCalcBdi,
  useExportXlsx,
  type BdiInput,
  type BdiResult,
} from "@/hooks/useExport";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FIELDS: Array<{ key: keyof BdiInput; label: string; help?: string }> = [
  { key: "lucro_pct", label: "Lucro (%)", help: "Bonificação esperada" },
  { key: "despesas_indiretas_pct", label: "Adm. central (%)", help: "Despesas indiretas" },
  { key: "risco_pct", label: "Risco (%)" },
  { key: "despesas_financeiras_pct", label: "Despesas financeiras (%)", help: "DF — TCU típico 1%" },
  { key: "iss_pct", label: "ISS (%)" },
  { key: "pis_pct", label: "PIS (%)" },
  { key: "cofins_pct", label: "COFINS (%)" },
  { key: "irpj_pct", label: "IRPJ (%)" },
  { key: "csll_pct", label: "CSLL (%)" },
];

export function BdiDialog({ projectId, open, onOpenChange }: Props) {
  const [bdi, setBdi] = useState<BdiInput>(DEFAULT_BDI);
  const calc = useCalcBdi();
  const exportXlsx = useExportXlsx();
  const [result, setResult] = useState<BdiResult | null>(null);

  // Recalcula automaticamente sempre que o user muda algo
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      calc.mutate(bdi, { onSuccess: setResult });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bdi, open]);

  const set = (key: keyof BdiInput, value: string) => {
    const num = Number(value.replace(",", "."));
    if (Number.isNaN(num)) return;
    setBdi((prev) => ({ ...prev, [key]: num }));
  };

  const exportar = async () => {
    try {
      await exportXlsx.mutateAsync({ project_id: projectId, bdi });
      toast.success("XLSX gerado e baixado");
      onOpenChange(false);
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar BDI e exportar XLSX</DialogTitle>
          <DialogDescription>
            Acórdão TCU 2622/2013. Defaults: edificação privada típica.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`bdi-${f.key}`} className="text-xs">
                {f.label}
              </Label>
              <Input
                id={`bdi-${f.key}`}
                type="text"
                inputMode="decimal"
                value={String(bdi[f.key])}
                onChange={(e) => set(f.key, e.target.value)}
              />
              {f.help && <p className="text-[10px] text-muted-foreground">{f.help}</p>}
            </div>
          ))}
        </div>

        <Separator />

        <div className="rounded-md bg-muted/30 p-3">
          {calc.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculando…
            </div>
          )}
          {calc.isError && (
            <div className="text-sm text-red-700">{calc.error.message}</div>
          )}
          {result && (
            <div className="flex flex-wrap items-baseline gap-3">
              <Badge variant="outline" className="text-xs font-mono">
                tributos {result.tributos.total.toFixed(2)}%
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                AC={result.componentes_fracao.AC.toFixed(4)} · L={result.componentes_fracao.L.toFixed(4)}
              </Badge>
              <div className="ml-auto text-right">
                <div className="text-xs text-muted-foreground">BDI calculado</div>
                <div className="text-2xl font-bold tabular-nums text-primary">
                  {result.bdi_pct.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  multiplicador {result.multiplicador.toFixed(4)}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setBdi(DEFAULT_BDI)}>
            Resetar
          </Button>
          <Button onClick={exportar} disabled={exportXlsx.isPending || !result}>
            {exportXlsx.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Exportar XLSX
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
