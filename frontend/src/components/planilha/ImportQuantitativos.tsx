import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuantitativos } from "@/hooks/useOrcamento";
import { toast } from "sonner";
import type { OrcamentoItem, Quantitativo } from "@/types/orcamento";

/** Map disciplina to a default etapa description */
const DISCIPLINA_ETAPA_MAP: Record<string, string> = {
  arq: "ARQUITETONICO",
  est: "ESTRUTURAL",
  hid: "HIDRAULICO",
  ele: "ELETRICO",
  memorial: "MEMORIAL",
};

interface ImportQuantitativosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  existingItems: OrcamentoItem[];
  onImport: (items: Array<{
    eap_code: string;
    eap_level: number;
    descricao: string;
    unidade: string | null;
    quantidade: number | null;
    quantitativo_id: string;
  }>) => void;
}

export function ImportQuantitativos({
  open,
  onOpenChange,
  projectId,
  existingItems,
  onImport,
}: ImportQuantitativosProps) {
  const { data: quantitativos, isLoading } = useQuantitativos(projectId);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!quantitativos) return;
    const importable = quantitativos.filter(
      (q) => !existingItems.some((i) => i.quantitativo_id === q.id)
    );
    if (selected.size === importable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(importable.map((q) => q.id)));
    }
  };

  /** Find or plan a level-1 etapa for a disciplina */
  function findOrPlanEtapa(disciplina: string): { code: string; needsCreate: boolean; desc: string } {
    const desc = DISCIPLINA_ETAPA_MAP[disciplina] ?? disciplina.toUpperCase();
    const existing = existingItems.find(
      (i) => i.eap_level === 1 && i.descricao.toUpperCase().includes(desc)
    );
    if (existing) return { code: existing.eap_code, needsCreate: false, desc };

    // Calculate next level-1 code
    const l1Items = existingItems.filter((i) => i.eap_level === 1);
    const maxNum = l1Items.reduce((max, i) => {
      const num = parseInt(i.eap_code, 10);
      return num > max ? num : max;
    }, 0);
    return {
      code: String(maxNum + 1).padStart(2, "0"),
      needsCreate: true,
      desc,
    };
  }

  /** Find the next available level-2 code under a level-1 prefix */
  function nextLevel2Code(l1Code: string): string {
    const children = existingItems.filter(
      (i) => i.eap_level === 2 && i.eap_code.startsWith(l1Code + ".")
    );
    const maxSub = children.reduce((max, i) => {
      const num = parseInt(i.eap_code.split(".")[1], 10);
      return num > max ? num : max;
    }, 0);
    return `${l1Code}.${String(maxSub + 1).padStart(2, "0")}`;
  }

  /** Find the next available level-3 code under a level-2 prefix */
  function nextLevel3Code(l2Code: string): string {
    const children = existingItems.filter(
      (i) => i.eap_level === 3 && i.eap_code.startsWith(l2Code + ".")
    );
    const maxSub = children.reduce((max, i) => {
      const num = parseInt(i.eap_code.split(".")[2], 10);
      return num > max ? num : max;
    }, 0);
    return `${l2Code}.${String(maxSub + 1).padStart(3, "0")}`;
  }

  function handleImport() {
    if (!quantitativos || selected.size === 0) return;

    const selectedItems = quantitativos.filter((q) => selected.has(q.id));

    // Group by disciplina
    const byDisciplina = new Map<string, Quantitativo[]>();
    for (const q of selectedItems) {
      const disc = q.disciplina || "arq";
      if (!byDisciplina.has(disc)) byDisciplina.set(disc, []);
      byDisciplina.get(disc)!.push(q);
    }

    const toCreate: Array<{
      eap_code: string;
      eap_level: number;
      descricao: string;
      unidade: string | null;
      quantidade: number | null;
      quantitativo_id: string;
    }> = [];

    // Track new etapas we plan to create so we don't dupe
    const plannedEtapas = new Map<string, string>(); // desc -> code

    for (const [disciplina, items] of byDisciplina) {
      const etapa = findOrPlanEtapa(disciplina);
      let l1Code = etapa.code;

      // If we already planned this etapa, reuse
      if (plannedEtapas.has(etapa.desc)) {
        l1Code = plannedEtapas.get(etapa.desc)!;
      } else if (etapa.needsCreate) {
        toCreate.push({
          eap_code: l1Code,
          eap_level: 1,
          descricao: etapa.desc,
          unidade: null,
          quantidade: null,
          quantitativo_id: "",
        });
        plannedEtapas.set(etapa.desc, l1Code);
      }

      // Create a level-2 group for imported items
      const l2Code = nextLevel2Code(l1Code);
      toCreate.push({
        eap_code: l2Code,
        eap_level: 2,
        descricao: `Itens Importados - ${etapa.desc}`,
        unidade: null,
        quantidade: null,
        quantitativo_id: "",
      });

      // Each quantitativo becomes a level-3 item
      let subCounter = 0;
      for (const q of items) {
        subCounter++;
        const l3Code = `${l2Code}.${String(subCounter).padStart(3, "0")}`;
        toCreate.push({
          eap_code: l3Code,
          eap_level: 3,
          descricao: q.descricao,
          unidade: q.unidade,
          quantidade: q.quantidade,
          quantitativo_id: q.id,
        });
      }
    }

    onImport(toCreate);
    setSelected(new Set());
    onOpenChange(false);
    toast.success(`${selectedItems.length} quantitativo(s) importado(s)`);
  }

  const alreadyImported = new Set(
    existingItems.filter((i) => i.quantitativo_id).map((i) => i.quantitativo_id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Quantitativos</DialogTitle>
          <DialogDescription>
            Selecione os quantitativos para importar como itens do orcamento.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !quantitativos || quantitativos.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Nenhum quantitativo encontrado para este projeto.
          </p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs font-medium text-muted-foreground">
                  <th className="w-8 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={
                        selected.size > 0 &&
                        selected.size ===
                          quantitativos.filter((q) => !alreadyImported.has(q.id)).length
                      }
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-2 py-2 text-left">Descricao</th>
                  <th className="w-16 px-2 py-2 text-center">Unid</th>
                  <th className="w-20 px-2 py-2 text-right">Qtde</th>
                  <th className="w-24 px-2 py-2 text-center">Disciplina</th>
                  <th className="w-20 px-2 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {quantitativos.map((q) => {
                  const imported = alreadyImported.has(q.id);
                  return (
                    <tr
                      key={q.id}
                      className={`border-b transition-colors ${
                        imported
                          ? "opacity-50"
                          : "hover:bg-accent/20 cursor-pointer"
                      }`}
                      onClick={() => !imported && toggleSelection(q.id)}
                    >
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={selected.has(q.id)}
                          disabled={imported}
                          onChange={() => toggleSelection(q.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-2 py-1.5">{q.descricao}</td>
                      <td className="px-2 py-1.5 text-center">{q.unidade}</td>
                      <td className="px-2 py-1.5 text-right">{q.quantidade}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                          {q.disciplina}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs">
                        {imported ? (
                          <span className="text-muted-foreground">Importado</span>
                        ) : (
                          <span className="text-green-600">Disponivel</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={selected.size === 0}>
            Importar {selected.size > 0 ? `(${selected.size})` : ""} Selecionados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
