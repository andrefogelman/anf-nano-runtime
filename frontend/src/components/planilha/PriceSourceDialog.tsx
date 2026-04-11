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
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import type { OrcamentoItem } from "@/types/orcamento";
import {
  useApplyPriceSource,
  type PriceSelection,
  type PreviousPriceData,
} from "@/hooks/useApplyPriceSource";
import { useSinapiSearch } from "@/hooks/useSinapi";
import { Badge } from "@/components/ui/badge";
import { unitsMatch } from "@/lib/unit";
import { cn } from "@/lib/utils";

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
            <div className="text-sm text-muted-foreground py-8 text-center">
              Lista TCPO — a ser implementada
            </div>
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
  const { data, isLoading, error } = useSinapiSearch(query, null, null, page, 50);

  // Reset page when query changes
  useEffect(() => {
    setPage(1);
  }, [query]);

  if (isLoading && !data) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Buscando...
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        Erro ao buscar SINAPI
      </div>
    );
  }

  const results = data?.data ?? [];
  // Sort: rows with matching unit first, rest preserve server order
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
            return (
              <tr
                key={comp.id}
                className={cn(
                  "cursor-pointer border-b hover:bg-accent",
                  isSelected && "bg-primary/10"
                )}
                onClick={() => onSelect({ kind: "sinapi", composicao: comp })}
                onDoubleClick={() =>
                  onSelect({ kind: "sinapi", composicao: comp })
                }
              >
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
                  R$ {(comp.custo_sem_desoneracao ?? 0).toFixed(2)}
                </td>
              </tr>
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
