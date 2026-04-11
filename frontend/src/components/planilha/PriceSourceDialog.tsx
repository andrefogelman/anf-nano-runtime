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
            <div className="text-sm text-muted-foreground py-8 text-center">
              Lista SINAPI — a ser implementada
            </div>
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
