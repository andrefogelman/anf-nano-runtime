import { useState, useMemo, useCallback } from "react";
import { Copy, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { BudgetRow } from "./BudgetRow";
import { BudgetFooter } from "./BudgetFooter";
import { BudgetToolbar } from "./BudgetToolbar";
import { ContextMenu, type ContextMenuAction } from "./ContextMenu";
import { ImportQuantitativos } from "./ImportQuantitativos";
import {
  buildBudgetTree,
  calculateFooterTotals,
  useOrcamentoItems,
  useUpdateOrcamentoItem,
  useCreateOrcamentoItem,
  useDeleteOrcamentoItem,
  useBulkDeleteOrcamentoItems,
  useBulkCreateOrcamentoItems,
} from "@/hooks/useOrcamento";
import { useUndoStack, type UndoAction } from "@/hooks/useUndoStack";
import { exportBudgetToExcel } from "@/lib/excel-export";
import type { OrcamentoItem, BudgetRow as BudgetRowType } from "@/types/orcamento";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BudgetTableProps {
  projectId: string;
  projectName: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: OrcamentoItem;
}

export function BudgetTable({ projectId, projectName }: BudgetTableProps) {
  const { data: items, isLoading } = useOrcamentoItems(projectId);
  const updateItem = useUpdateOrcamentoItem();
  const createItem = useCreateOrcamentoItem();
  const deleteItem = useDeleteOrcamentoItem();
  const bulkDelete = useBulkDeleteOrcamentoItems();
  const bulkCreate = useBulkCreateOrcamentoItems();
  const undoStack = useUndoStack();

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDisciplina, setFilterDisciplina] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    let result = items;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.descricao.toLowerCase().includes(q) ||
          i.eap_code.includes(q)
      );
    }

    return result;
  }, [items, searchQuery]);

  const tree = useMemo(() => buildBudgetTree(filteredItems), [filteredItems]);

  const footerTotals = useMemo(
    () => calculateFooterTotals(items ?? []),
    [items]
  );

  const handleToggle = useCallback((eapCode: string) => {
    setExpandedMap((prev) => ({ ...prev, [eapCode]: !prev[eapCode] }));
  }, []);

  const isExpanded = useCallback(
    (eapCode: string) => expandedMap[eapCode] !== false,
    [expandedMap]
  );

  // ─── Recalculate totals automatically ──────────────────────────
  const recalculateParentTotals = useCallback(
    (changedItem: OrcamentoItem) => {
      if (!items) return;

      // Find the parent level-1 etapa
      const parts = changedItem.eap_code.split(".");
      if (parts.length < 2) return; // already level 1

      const l1Code = parts[0];
      const l1Item = items.find(
        (i) => i.eap_level === 1 && i.eap_code === l1Code
      );
      if (!l1Item) return;

      // Sum all leaf children under this etapa
      const children = items.filter(
        (i) => i.eap_level > 1 && i.eap_code.startsWith(l1Code + ".")
      );
      const leafItems = children.filter(
        (child) =>
          !children.some((other) =>
            other.eap_code.startsWith(child.eap_code + ".")
          )
      );

      const totalMaterial = leafItems.reduce(
        (sum, i) => sum + (i.id === changedItem.id ? (changedItem.custo_material ?? 0) : (i.custo_material ?? 0)),
        0
      );
      const totalMaoObra = leafItems.reduce(
        (sum, i) => sum + (i.id === changedItem.id ? (changedItem.custo_mao_obra ?? 0) : (i.custo_mao_obra ?? 0)),
        0
      );
      const totalCusto = leafItems.reduce(
        (sum, i) => sum + (i.id === changedItem.id ? (changedItem.custo_total ?? 0) : (i.custo_total ?? 0)),
        0
      );

      updateItem.mutate({
        id: l1Item.id,
        projectId,
        custo_material: totalMaterial,
        custo_mao_obra: totalMaoObra,
        custo_total: totalCusto,
      });
    },
    [items, projectId, updateItem]
  );

  const handleUpdate = useCallback(
    (itemId: string, field: keyof OrcamentoItem, value: string | number) => {
      const item = items?.find((i) => i.id === itemId);
      if (!item) return;

      // Push to undo stack
      const previousData: Record<string, unknown> = { [field]: item[field] };
      const updates: Record<string, string | number> = { [field]: value };

      // Auto-recalculate custo_total
      if (field === "custo_material" || field === "custo_mao_obra") {
        const material = field === "custo_material" ? Number(value) : (item.custo_material ?? 0);
        const maoObra = field === "custo_mao_obra" ? Number(value) : (item.custo_mao_obra ?? 0);
        updates.custo_total = material + maoObra;
        previousData.custo_total = item.custo_total;
      }

      if (field === "quantidade" || field === "custo_unitario") {
        const quantidade = field === "quantidade" ? Number(value) : (item.quantidade ?? 0);
        const custoUnitario = field === "custo_unitario" ? Number(value) : (item.custo_unitario ?? 0);
        if (quantidade && custoUnitario) {
          updates.custo_total = quantidade * custoUnitario;
          previousData.custo_total = item.custo_total;
        }
      }

      undoStack.push({
        type: "update",
        table: "ob_orcamento_items",
        itemId,
        projectId,
        previousData,
      });

      updateItem.mutate(
        { id: itemId, projectId, ...updates },
        {
          onSuccess: () => {
            // Recalculate parent after update
            const updatedItem = {
              ...item,
              ...updates,
            } as OrcamentoItem;
            recalculateParentTotals(updatedItem);
          },
        }
      );
    },
    [items, projectId, updateItem, undoStack, recalculateParentTotals]
  );

  // ─── Add Item ──────────────────────────────────────────────────
  const handleAddItem = useCallback(
    (level: number) => {
      if (!items) return;

      const sameLevel = items.filter((i) => i.eap_level === level);
      let newCode: string;

      if (level === 1) {
        const maxNum = sameLevel.reduce((max, i) => {
          const num = parseInt(i.eap_code, 10);
          return num > max ? num : max;
        }, 0);
        newCode = String(maxNum + 1).padStart(2, "0");
      } else if (level === 2) {
        const level1Codes = items.filter((i) => i.eap_level === 1).map((i) => i.eap_code);
        const lastL1 = level1Codes[level1Codes.length - 1] ?? "01";
        const childrenOfLast = sameLevel.filter((i) => i.eap_code.startsWith(lastL1 + "."));
        const maxSub = childrenOfLast.reduce((max, i) => {
          const parts = i.eap_code.split(".");
          const num = parseInt(parts[1], 10);
          return num > max ? num : max;
        }, 0);
        newCode = `${lastL1}.${String(maxSub + 1).padStart(2, "0")}`;
      } else {
        const level2Codes = items.filter((i) => i.eap_level === 2).map((i) => i.eap_code);
        const lastL2 = level2Codes[level2Codes.length - 1] ?? "01.01";
        const childrenOfLast = items.filter(
          (i) => i.eap_level === 3 && i.eap_code.startsWith(lastL2 + ".")
        );
        const maxSub = childrenOfLast.reduce((max, i) => {
          const parts = i.eap_code.split(".");
          const num = parseInt(parts[2], 10);
          return num > max ? num : max;
        }, 0);
        newCode = `${lastL2}.${String(maxSub + 1).padStart(3, "0")}`;
      }

      createItem.mutate(
        {
          project_id: projectId,
          eap_code: newCode,
          eap_level: level,
          descricao: level === 1 ? "NOVA ETAPA" : "Novo item",
          unidade: level === 1 ? null : "un",
          quantidade: level === 1 ? null : 0,
          fonte: null,
          fonte_codigo: null,
          fonte_data_base: null,
          custo_unitario: null,
          custo_material: level === 1 ? null : 0,
          custo_mao_obra: level === 1 ? null : 0,
          custo_total: level === 1 ? null : 0,
          adm_percentual: 12,
          peso_percentual: null,
          curva_abc_classe: null,
          quantitativo_id: null,
        },
        {
          onSuccess: (data) => {
            undoStack.push({
              type: "create",
              table: "ob_orcamento_items",
              itemId: data.id,
              projectId,
              previousData: {},
            });
          },
        }
      );
    },
    [items, projectId, createItem, undoStack]
  );

  // ─── Delete Item (called after inline Sim/Não confirmation in BudgetRow) ──
  const handleDeleteRequest = useCallback(
    (item: OrcamentoItem) => {
      if (!items) return;

      if (item.eap_level === 1) {
        // Delete all children + the item itself
        const toDelete = items.filter(
          (i) => i.id === item.id || i.eap_code.startsWith(item.eap_code + ".")
        );

        for (const d of toDelete) {
          const { id: _id, ...rest } = d;
          undoStack.push({
            type: "delete",
            table: "ob_orcamento_items",
            itemId: d.id,
            projectId,
            previousData: { id: d.id, ...rest },
          });
        }

        bulkDelete.mutate(
          { ids: toDelete.map((i) => i.id), projectId },
          {
            onSuccess: () => toast.success(`${toDelete.length} item(ns) excluído(s)`),
            onError: () => toast.error("Erro ao excluir itens"),
          }
        );
      } else {
        // Single delete
        const { id: _id, ...rest } = item;
        undoStack.push({
          type: "delete",
          table: "ob_orcamento_items",
          itemId: item.id,
          projectId,
          previousData: { id: item.id, ...rest },
        });

        deleteItem.mutate(
          { id: item.id, projectId },
          {
            onSuccess: () => toast.success("Item excluído"),
            onError: () => toast.error("Erro ao excluir item"),
          }
        );
      }
    },
    [items, projectId, deleteItem, bulkDelete, undoStack]
  );

  // ─── Context Menu ──────────────────────────────────────────────
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: OrcamentoItem) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, item });
    },
    []
  );

  /** Insert a new sibling relative to the target item */
  const insertRelative = useCallback(
    (target: OrcamentoItem, position: "above" | "below") => {
      if (!items) return;

      const level = target.eap_level;
      const parts = target.eap_code.split(".");

      // Find the parent prefix
      const parentPrefix = parts.slice(0, -1).join(".");

      // Find siblings
      const siblings = items.filter((i) => {
        if (i.eap_level !== level) return false;
        if (level === 1) return true;
        return i.eap_code.startsWith(parentPrefix + ".");
      }).sort((a, b) => a.eap_code.localeCompare(b.eap_code));

      const targetIndex = siblings.findIndex((s) => s.id === target.id);

      // Calculate the new code: take the target's last segment and shift
      const lastSegment = parseInt(parts[parts.length - 1], 10);
      const padLength = level === 3 ? 3 : 2;

      let newCode: string;
      if (position === "below") {
        // Insert after this item, before the next sibling
        const nextSibling = siblings[targetIndex + 1];
        if (nextSibling) {
          // Renumber from next sibling onwards
          const itemsToRenumber = siblings.slice(targetIndex + 1);
          for (const item of itemsToRenumber.reverse()) {
            const itemParts = item.eap_code.split(".");
            const currentNum = parseInt(itemParts[itemParts.length - 1], 10);
            itemParts[itemParts.length - 1] = String(currentNum + 1).padStart(padLength, "0");
            const newEapCode = itemParts.join(".");
            updateItem.mutate({ id: item.id, projectId, eap_code: newEapCode });
          }
        }
        const newNum = lastSegment + 1;
        if (parentPrefix) {
          newCode = `${parentPrefix}.${String(newNum).padStart(padLength, "0")}`;
        } else {
          newCode = String(newNum).padStart(padLength, "0");
        }
      } else {
        // Insert before this item, renumber from this item onwards
        const itemsToRenumber = siblings.slice(targetIndex);
        for (const item of itemsToRenumber.reverse()) {
          const itemParts = item.eap_code.split(".");
          const currentNum = parseInt(itemParts[itemParts.length - 1], 10);
          itemParts[itemParts.length - 1] = String(currentNum + 1).padStart(padLength, "0");
          const newEapCode = itemParts.join(".");
          updateItem.mutate({ id: item.id, projectId, eap_code: newEapCode });
        }
        if (parentPrefix) {
          newCode = `${parentPrefix}.${String(lastSegment).padStart(padLength, "0")}`;
        } else {
          newCode = String(lastSegment).padStart(padLength, "0");
        }
      }

      createItem.mutate(
        {
          project_id: projectId,
          eap_code: newCode,
          eap_level: level,
          descricao: level === 1 ? "NOVA ETAPA" : "Novo item",
          unidade: level === 1 ? null : "un",
          quantidade: level === 1 ? null : 0,
          fonte: null,
          fonte_codigo: null,
          fonte_data_base: null,
          custo_unitario: null,
          custo_material: level === 1 ? null : 0,
          custo_mao_obra: level === 1 ? null : 0,
          custo_total: level === 1 ? null : 0,
          adm_percentual: 12,
          peso_percentual: null,
          curva_abc_classe: null,
          quantitativo_id: null,
        },
        {
          onSuccess: (data) => {
            undoStack.push({
              type: "create",
              table: "ob_orcamento_items",
              itemId: data.id,
              projectId,
              previousData: {},
            });
          },
        }
      );
    },
    [items, projectId, createItem, updateItem, undoStack]
  );

  /** Duplicate a row */
  const duplicateItem = useCallback(
    (item: OrcamentoItem) => {
      if (!items) return;

      const level = item.eap_level;
      const parts = item.eap_code.split(".");
      const parentPrefix = parts.slice(0, -1).join(".");
      const padLength = level === 3 ? 3 : 2;

      // Find siblings to determine next code
      const siblings = items.filter((i) => {
        if (i.eap_level !== level) return false;
        if (level === 1) return true;
        return i.eap_code.startsWith(parentPrefix + ".");
      });

      const maxNum = siblings.reduce((max, i) => {
        const p = i.eap_code.split(".");
        const num = parseInt(p[p.length - 1], 10);
        return num > max ? num : max;
      }, 0);

      const newCode = parentPrefix
        ? `${parentPrefix}.${String(maxNum + 1).padStart(padLength, "0")}`
        : String(maxNum + 1).padStart(padLength, "0");

      createItem.mutate(
        {
          project_id: projectId,
          eap_code: newCode,
          eap_level: level,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: item.quantidade,
          fonte: item.fonte,
          fonte_codigo: item.fonte_codigo,
          fonte_data_base: item.fonte_data_base,
          custo_unitario: item.custo_unitario,
          custo_material: item.custo_material,
          custo_mao_obra: item.custo_mao_obra,
          custo_total: item.custo_total,
          adm_percentual: item.adm_percentual,
          peso_percentual: item.peso_percentual,
          curva_abc_classe: item.curva_abc_classe,
          quantitativo_id: item.quantitativo_id,
        },
        {
          onSuccess: (data) => {
            undoStack.push({
              type: "create",
              table: "ob_orcamento_items",
              itemId: data.id,
              projectId,
              previousData: {},
            });
            toast.success("Item duplicado");
          },
        }
      );
    },
    [items, projectId, createItem, undoStack]
  );

  const contextMenuActions = useMemo((): ContextMenuAction[] => {
    if (!contextMenu) return [];
    const { item } = contextMenu;
    return [
      {
        label: "Inserir acima",
        icon: <ArrowUp className="h-4 w-4" />,
        onClick: () => insertRelative(item, "above"),
      },
      {
        label: "Inserir abaixo",
        icon: <ArrowDown className="h-4 w-4" />,
        onClick: () => insertRelative(item, "below"),
      },
      {
        label: "Duplicar",
        icon: <Copy className="h-4 w-4" />,
        onClick: () => duplicateItem(item),
      },
      {
        label: "Excluir",
        icon: <Trash2 className="h-4 w-4" />,
        danger: true,
        onClick: () => handleDeleteRequest(item),
      },
    ];
  }, [contextMenu, insertRelative, duplicateItem, handleDeleteRequest]);

  // ─── Import Quantitativos ──────────────────────────────────────
  const handleImportQuantitativos = useCallback(
    (
      importItems: Array<{
        eap_code: string;
        eap_level: number;
        descricao: string;
        unidade: string | null;
        quantidade: number | null;
        quantitativo_id: string;
      }>
    ) => {
      const inserts = importItems.map((item) => ({
        project_id: projectId,
        eap_code: item.eap_code,
        eap_level: item.eap_level,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        fonte: null,
        fonte_codigo: null,
        fonte_data_base: null,
        custo_unitario: null,
        custo_material: item.eap_level === 1 ? null : 0,
        custo_mao_obra: item.eap_level === 1 ? null : 0,
        custo_total: item.eap_level === 1 ? null : 0,
        adm_percentual: 12,
        peso_percentual: null,
        curva_abc_classe: null,
        quantitativo_id: item.quantitativo_id || null,
      }));

      bulkCreate.mutate(
        { items: inserts },
        {
          onSuccess: (data) => {
            for (const created of data) {
              undoStack.push({
                type: "create",
                table: "ob_orcamento_items",
                itemId: created.id,
                projectId,
                previousData: {},
              });
            }
          },
          onError: () => toast.error("Erro ao importar quantitativos"),
        }
      );
    },
    [projectId, bulkCreate, undoStack]
  );

  // ─── Export Excel ──────────────────────────────────────────────
  const handleExportExcel = useCallback(async () => {
    if (!items) return;
    try {
      await exportBudgetToExcel(items, footerTotals, projectName);
      toast.success("Planilha exportada com sucesso");
    } catch {
      toast.error("Erro ao exportar planilha");
    }
  }, [items, footerTotals, projectName]);

  // ─── Render tree ───────────────────────────────────────────────
  function renderTree(rows: BudgetRowType[]): React.ReactNode[] {
    const result: React.ReactNode[] = [];
    for (const row of rows) {
      const expanded = isExpanded(row.item.eap_code);
      result.push(
        <BudgetRow
          key={row.item.id}
          item={row.item}
          isExpanded={expanded}
          hasChildren={row.children.length > 0}
          onToggle={() => handleToggle(row.item.eap_code)}
          onUpdate={(field, value) => handleUpdate(row.item.id, field, value)}
          onDelete={handleDeleteRequest}
          onContextMenu={handleContextMenu}
        />
      );
      if (expanded && row.children.length > 0) {
        result.push(...renderTree(row.children));
      }
    }
    return result;
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <BudgetToolbar
        onAddItem={handleAddItem}
        onExportExcel={handleExportExcel}
        onSearch={setSearchQuery}
        filterDisciplina={filterDisciplina}
        onFilterDisciplina={setFilterDisciplina}
        onImportQuantitativos={() => setImportOpen(true)}
        onUndo={undoStack.undo}
      />

      <ScrollArea className="flex-1">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b text-xs font-medium text-muted-foreground">
              <th className="w-20 border-r px-2 py-2 text-left">Item</th>
              <th className="min-w-[200px] border-r px-2 py-2 text-left">Descricao</th>
              <th className="w-16 border-r px-2 py-2 text-center">Unid</th>
              <th className="w-20 border-r px-2 py-2 text-right">Qtde</th>
              <th className="w-28 border-r px-2 py-2 text-right">Material</th>
              <th className="w-28 border-r px-2 py-2 text-right">Mao de Obra</th>
              <th className="w-28 border-r px-2 py-2 text-right">Custo Total</th>
              <th className="w-16 px-2 py-2 text-right">Adm%</th>
            </tr>
          </thead>
          <tbody>{renderTree(tree)}</tbody>
          <BudgetFooter totals={footerTotals} />
        </table>
      </ScrollArea>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={contextMenuActions}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Import Quantitativos Modal */}
      <ImportQuantitativos
        open={importOpen}
        onOpenChange={setImportOpen}
        projectId={projectId}
        existingItems={items ?? []}
        onImport={handleImportQuantitativos}
      />
    </div>
  );
}
