import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { OrcamentoItem } from "@/types/orcamento";
import {
  useApplyPriceSource,
  type PriceSelection,
  type PreviousPriceData,
} from "@/hooks/useApplyPriceSource";
import { useSinapiSearch, type SinapiComposicao } from "@/hooks/useSinapi";
import { useTcpoSearch, useTcpoInsumos, type TcpoComposicao } from "@/hooks/useTcpo";
import { computeTcpoSplit } from "@/lib/price-source";
import { Badge } from "@/components/ui/badge";
import { unitsMatch } from "@/lib/unit";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

interface PriceSourceDialogProps {
  item: OrcamentoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: (args: { item: OrcamentoItem; previousData: PreviousPriceData }) => void;
}

export function PriceSourceDialog({
  item,
  open,
  onOpenChange,
  onApplied,
}: PriceSourceDialogProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"sinapi" | "tcpo">("sinapi");
  const [selected, setSelected] = useState<PriceSelection | null>(null);
  const apply = useApplyPriceSource();

  // Reset state when opening for a new item
  useEffect(() => {
    if (item && open) {
      setQuery(item.descricao ?? "");
      setSelected(null);
      setTab("sinapi");
    }
  }, [item, open]);

  const handleApply = async () => {
    if (!item || !selected) return;
    try {
      const result = await apply.mutateAsync({ item, selection: selected });
      onApplied?.({ item, previousData: result.previousData });
      onOpenChange(false);
      toast.success("Preço aplicado");
    } catch (err) {
      console.error("apply price source failed:", err);
      toast.error("Erro ao aplicar preço");
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Buscar preço de referência</DialogTitle>
          <div className="text-sm text-muted-foreground mt-1">
            <span className="font-medium">{item.eap_code}</span> — {item.descricao}
            {item.unidade && (
              <>
                {" "}· Unidade: <span className="font-medium">{item.unidade}</span>
              </>
            )}
            {item.quantidade != null && (
              <>
                {" "}· Quantidade: <span className="font-medium">{item.quantidade}</span>
              </>
            )}
          </div>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar composição..."
            className="pl-9 pr-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-muted"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "sinapi" | "tcpo")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sinapi">SINAPI</TabsTrigger>
            <TabsTrigger value="tcpo">TCPO</TabsTrigger>
          </TabsList>
          <TabsContent value="sinapi" className="mt-2">
            <SinapiResultsList
              query={query}
              itemUnit={item.unidade}
              selected={selected}
              onSelect={setSelected}
            />
          </TabsContent>
          <TabsContent value="tcpo" className="mt-2">
            <TcpoResultsList
              query={query}
              itemUnit={item.unidade}
              selected={selected}
              onSelect={setSelected}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={!selected || apply.isPending}>
            {apply.isPending ? "Aplicando..." : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── SINAPI Results ──────────────────────────────────────────────

interface SinapiResultsListProps {
  query: string;
  itemUnit: string | null;
  selected: PriceSelection | null;
  onSelect: (sel: PriceSelection) => void;
}

function SinapiResultsList({
  query,
  itemUnit,
  selected,
  onSelect,
}: SinapiResultsListProps) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading, error } = useSinapiSearch(query, "composicao", null, page, 50);

  useEffect(() => { setPage(1); }, [query]);

  if (isLoading && !data) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Buscando...</div>;
  }
  if (error) {
    return <div className="py-8 text-center text-sm text-destructive">Erro ao buscar SINAPI</div>;
  }

  const results = data?.data ?? [];
  const sorted = [...results].sort((a, b) => {
    const am = unitsMatch(a.unidade, itemUnit) ? 0 : 1;
    const bm = unitsMatch(b.unidade, itemUnit) ? 0 : 1;
    return am - bm;
  });

  return (
    <div className="max-h-[420px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background border-b">
          <tr className="text-left text-xs text-muted-foreground">
            <th className="w-8 px-1 py-2" />
            <th className="w-24 px-2 py-2">Código</th>
            <th className="px-2 py-2">Descrição</th>
            <th className="w-16 px-2 py-2">Unid</th>
            <th className="w-28 px-2 py-2 text-right">Custo s/ desoneração</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((comp) => {
            const isSelected =
              selected?.kind === "sinapi" && selected.composicao.id === comp.id;
            const isMatch = unitsMatch(comp.unidade, itemUnit);
            const preco = comp.custo_sem_desoneracao || comp.custo_com_desoneracao || 0;
            const isExpanded = expandedId === comp.id;
            return (
              <>
                <tr
                  key={comp.id}
                  className={cn(
                    "cursor-pointer border-b hover:bg-accent",
                    isSelected && "bg-primary/10"
                  )}
                  onClick={() => onSelect({ kind: "sinapi", composicao: comp })}
                >
                  <td className="px-1 py-1.5">
                    <button
                      className="p-0.5 rounded hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : comp.id);
                      }}
                    >
                      {isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-xs">{comp.codigo}</td>
                  <td className="px-2 py-1.5">{comp.descricao}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <span>{comp.unidade}</span>
                      {isMatch && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          ✓
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    R$ {preco.toFixed(2)}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${comp.id}-detail`}>
                    <td colSpan={5} className="p-0">
                      <SinapiDetailPanel composicaoId={comp.id} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhum resultado
        </div>
      )}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-2 py-2 text-xs text-muted-foreground">
          <span>
            Página {page} de {data.totalPages} ({data.count} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SINAPI Detail Panel ─────────────────────────────────────────

function SinapiDetailPanel({ composicaoId }: { composicaoId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sinapi-composicao-insumos", composicaoId],
    queryFn: async () => {
      // Get insumo links
      const { data: links, error: linkError } = await supabase
        .from("ob_sinapi_composicao_insumos")
        .select("insumo_id, coeficiente")
        .eq("composicao_id", composicaoId);
      if (linkError) throw linkError;
      if (!links || links.length === 0) return [];

      // Get insumo details
      const ids = links.map((l) => l.insumo_id);
      const { data: insumos, error: insError } = await supabase
        .from("ob_sinapi_composicoes")
        .select("id, codigo, descricao, unidade, tipo, classe, custo_sem_desoneracao, custo_com_desoneracao")
        .in("id", ids);
      if (insError) throw insError;

      const insMap = new Map((insumos ?? []).map((i) => [i.id, i]));
      return links.map((l) => {
        const ins = insMap.get(l.insumo_id);
        if (!ins) return null;
        const custo = ins.custo_sem_desoneracao || ins.custo_com_desoneracao || 0;
        return {
          codigo: ins.codigo,
          descricao: ins.descricao,
          unidade: ins.unidade,
          classe: ins.classe ?? ins.tipo,
          coeficiente: l.coeficiente,
          custo_unitario: custo,
          total: custo * l.coeficiente,
        };
      }).filter(Boolean) as Array<{
        codigo: string;
        descricao: string;
        unidade: string;
        classe: string;
        coeficiente: number;
        custo_unitario: number;
        total: number;
      }>;
    },
    enabled: !!composicaoId,
  });

  if (isLoading) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">Carregando insumos...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">Sem insumos detalhados</div>;
  }

  const totalMat = data.filter((i) => i.classe === "material" || i.classe === "equipamento").reduce((s, i) => s + i.total, 0);
  const totalMod = data.filter((i) => i.classe === "mao_obra").reduce((s, i) => s + i.total, 0);
  const totalGeral = data.reduce((s, i) => s + i.total, 0);

  return (
    <div className="bg-muted/30 border-t border-b px-4 py-2">
      <div className="flex gap-4 mb-2 text-xs font-medium">
        <span>Material+Equip: <span className="font-mono">R$ {totalMat.toFixed(2)}</span></span>
        <span>Mão de Obra: <span className="font-mono">R$ {totalMod.toFixed(2)}</span></span>
        <span className="text-muted-foreground">Total Insumos: <span className="font-mono">R$ {totalGeral.toFixed(2)}</span></span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left py-1 w-16">Código</th>
            <th className="text-left py-1">Descrição</th>
            <th className="text-left py-1 w-16">Classe</th>
            <th className="text-right py-1 w-14">Coef</th>
            <th className="text-right py-1 w-20">Unit</th>
            <th className="text-right py-1 w-20">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((ins, idx) => (
            <tr key={idx} className="border-t border-muted">
              <td className="py-0.5 font-mono">{ins.codigo}</td>
              <td className="py-0.5 truncate max-w-[250px]" title={ins.descricao}>{ins.descricao}</td>
              <td className="py-0.5">
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  {ins.classe === "mao_obra" ? "MOD" : ins.classe === "material" ? "MAT" : ins.classe === "equipamento" ? "EQP" : ins.classe}
                </Badge>
              </td>
              <td className="py-0.5 text-right font-mono">{ins.coeficiente.toFixed(4)}</td>
              <td className="py-0.5 text-right font-mono">R$ {ins.custo_unitario.toFixed(2)}</td>
              <td className="py-0.5 text-right font-mono">R$ {ins.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── TCPO Results ────────────────────────────────────────────────

interface TcpoResultsListProps {
  query: string;
  itemUnit: string | null;
  selected: PriceSelection | null;
  onSelect: (sel: PriceSelection) => void;
}

function TcpoResultsList({
  query,
  itemUnit,
  selected,
  onSelect,
}: TcpoResultsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading, error } = useTcpoSearch(query, null);

  if (isLoading && !data) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Buscando...</div>;
  }
  if (error) {
    return <div className="py-8 text-center text-sm text-destructive">Erro ao buscar TCPO</div>;
  }

  const results = data ?? [];
  const sorted = [...results].sort((a, b) => {
    const am = unitsMatch(a.unidade, itemUnit) ? 0 : 1;
    const bm = unitsMatch(b.unidade, itemUnit) ? 0 : 1;
    return am - bm;
  });

  return (
    <div className="max-h-[420px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background border-b">
          <tr className="text-left text-xs text-muted-foreground">
            <th className="w-8 px-1 py-2" />
            <th className="w-24 px-2 py-2">Código</th>
            <th className="px-2 py-2">Descrição</th>
            <th className="w-16 px-2 py-2">Unid</th>
            <th className="w-28 px-2 py-2 text-right">Custo c/ taxas</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((comp) => {
            const isSelected =
              selected?.kind === "tcpo" && selected.composicao.id === comp.id;
            const isMatch = unitsMatch(comp.unidade, itemUnit);
            const isExpanded = expandedId === comp.id;
            return (
              <>
                <tr
                  key={comp.id}
                  className={cn(
                    "cursor-pointer border-b hover:bg-accent",
                    isSelected && "bg-primary/10"
                  )}
                  onClick={() => onSelect({ kind: "tcpo", composicao: comp })}
                >
                  <td className="px-1 py-1.5">
                    <button
                      className="p-0.5 rounded hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : comp.id);
                      }}
                    >
                      {isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-xs">{comp.codigo}</td>
                  <td className="px-2 py-1.5">{comp.descricao}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <span>{comp.unidade}</span>
                      {isMatch && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          ✓
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    R$ {(comp.custo_com_taxas ?? 0).toFixed(2)}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${comp.id}-detail`}>
                    <td colSpan={5} className="p-0">
                      <TcpoDetailPanel composicao={comp} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhum resultado
        </div>
      )}
    </div>
  );
}

// ── TCPO Detail Panel ───────────────────────────────────────────

function TcpoDetailPanel({ composicao }: { composicao: TcpoComposicao }) {
  const { data: insumos, isLoading } = useTcpoInsumos(composicao.id);

  if (isLoading) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">Carregando insumos...</div>;
  }

  if (!insumos || insumos.length === 0) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">Sem insumos detalhados</div>;
  }

  const split = computeTcpoSplit(
    composicao.custo_com_taxas ?? 0,
    insumos.map((i) => ({ classe: i.classe, total: i.total }))
  );

  const totalMat = insumos.filter((i) => i.classe === "MAT" || i.classe === "EQH").reduce((s, i) => s + (i.total ?? 0), 0);
  const totalMod = insumos.filter((i) => i.classe === "MOD").reduce((s, i) => s + (i.total ?? 0), 0);

  return (
    <div className="bg-muted/30 border-t border-b px-4 py-2">
      <div className="flex gap-4 mb-2 text-xs font-medium">
        <span>Material+Equip: <span className="font-mono">R$ {split.custo_material.toFixed(2)}</span></span>
        <span>Mão de Obra: <span className="font-mono">R$ {split.custo_mao_obra.toFixed(2)}</span></span>
        <span className="text-muted-foreground">
          (Insumos bruto: MAT R$ {totalMat.toFixed(2)} · MOD R$ {totalMod.toFixed(2)} · c/ LS+BDI → R$ {(composicao.custo_com_taxas ?? 0).toFixed(2)})
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left py-1 w-16">Código</th>
            <th className="text-left py-1">Descrição</th>
            <th className="text-left py-1 w-12">Classe</th>
            <th className="text-right py-1 w-14">Coef</th>
            <th className="text-right py-1 w-20">Preço Unit</th>
            <th className="text-right py-1 w-20">Total</th>
          </tr>
        </thead>
        <tbody>
          {insumos.map((ins) => (
            <tr key={ins.id} className="border-t border-muted">
              <td className="py-0.5 font-mono">{ins.codigo}</td>
              <td className="py-0.5 truncate max-w-[250px]" title={ins.descricao}>{ins.descricao}</td>
              <td className="py-0.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1 py-0",
                    ins.classe === "MOD" && "border-blue-300 text-blue-700",
                    ins.classe === "MAT" && "border-green-300 text-green-700",
                    ins.classe === "EQH" && "border-amber-300 text-amber-700",
                  )}
                >
                  {ins.classe}
                </Badge>
              </td>
              <td className="py-0.5 text-right font-mono">{ins.coeficiente.toFixed(4)}</td>
              <td className="py-0.5 text-right font-mono">R$ {ins.preco_unitario.toFixed(2)}</td>
              <td className="py-0.5 text-right font-mono">R$ {(ins.total ?? 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
