import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { BudgetRow } from "./BudgetRow";
import type { NavigateDirection } from "./BudgetCell";
import { BudgetFooter } from "./BudgetFooter";
import { BudgetToolbar } from "./BudgetToolbar";
import { ContextMenu, type ContextMenuAction } from "./ContextMenu";
import { ImportQuantitativos } from "./ImportQuantitativos";
import { ImportPropostas } from "./ImportPropostas";
import { PriceSourceDialog } from "./PriceSourceDialog";
import type { PreviousPriceData } from "@/hooks/useApplyPriceSource";
import {
  buildBudgetTree,
  calculateFooterTotals,
  useOrcamentoItems,
  useUpdateOrcamentoItem,
  useCreateOrcamentoItem,
  useBulkDeleteOrcamentoItems,
  useBulkCreateOrcamentoItems,
} from "@/hooks/useOrcamento";
import { useUndoStack } from "@/hooks/useUndoStack";
import { exportBudgetToExcel } from "@/lib/excel-export";
import { supabase } from "@/lib/supabase";
import {
  computeRenumberPatch,
  snapshotAffected,
  formatEapCode,
} from "@/lib/eap";
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
  const bulkDelete = useBulkDeleteOrcamentoItems();
  const bulkCreate = useBulkCreateOrcamentoItems();
  const undoStack = useUndoStack();
  const queryClient = useQueryClient();

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDisciplina, setFilterDisciplina] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPropostasOpen, setImportPropostasOpen] = useState(false);
  const [priceSourceItem, setPriceSourceItem] = useState<OrcamentoItem | null>(null);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    let result = items;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      // Find all items that match the query
      const matched = new Set(
        result
          .filter(
            (i) =>
              i.descricao.toLowerCase().includes(q) ||
              i.eap_code.includes(q)
          )
          .map((i) => i.id)
      );
      // Also include parent items so the tree structure is preserved
      const matchedCodes = result
        .filter((i) => matched.has(i.id))
        .map((i) => i.eap_code);
      const parentCodes = new Set<string>();
      for (const code of matchedCodes) {
        const parts = code.split(".");
        for (let len = 1; len < parts.length; len++) {
          parentCodes.add(parts.slice(0, len).join("."));
        }
      }
      result = result.filter(
        (i) => matched.has(i.id) || parentCodes.has(i.eap_code)
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

  // ─── Flat row list for keyboard navigation ─────────────────────
  const flatRows = useMemo(() => {
    if (!tree) return [] as OrcamentoItem[];
    const flat: OrcamentoItem[] = [];
    function walk(rows: BudgetRowType[]) {
      for (const row of rows) {
        flat.push(row.item);
        if (isExpanded(row.item.eap_code) && row.children.length > 0) {
          walk(row.children);
        }
      }
    }
    walk(tree);
    return flat;
  }, [tree, isExpanded]);

  const TOTAL_COLS = 8;

  const handleCellFocus = useCallback(
    (rowIndex: number, colIndex: number) => {
      setFocusedCell({ row: rowIndex, col: colIndex });
    },
    []
  );

  const handleCellNavigate = useCallback(
    (_rowIndex: number, colIndex: number, direction: NavigateDirection) => {
      setFocusedCell((prev) => {
        const rowIndex = prev?.row ?? 0;
        let newRow = rowIndex;
        let newCol = colIndex;

        switch (direction) {
          case "up":
            newRow = Math.max(0, rowIndex - 1);
            break;
          case "down":
            newRow = Math.min(flatRows.length - 1, rowIndex + 1);
            break;
          case "left":
            newCol = Math.max(0, colIndex - 1);
            break;
          case "right":
            newCol = Math.min(TOTAL_COLS - 1, colIndex + 1);
            break;
          case "tab":
            if (colIndex < TOTAL_COLS - 1) {
              newCol = colIndex + 1;
            } else {
              newRow = Math.min(flatRows.length - 1, rowIndex + 1);
              newCol = 0;
            }
            break;
          case "shift-tab":
            if (colIndex > 0) {
              newCol = colIndex - 1;
            } else if (rowIndex > 0) {
              newRow = rowIndex - 1;
              newCol = TOTAL_COLS - 1;
            }
            break;
        }

        return { row: newRow, col: newCol };
      });
    },
    [flatRows.length]
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
      if (!items) return;
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      // Push to undo stack
      const previousData: Record<string, unknown> = { [field]: item[field] };
      const updates: Record<string, string | number> = { [field]: value };

      // Auto-recalculate custo_unitario and custo_total
      if (field === "custo_material" || field === "custo_mao_obra") {
        const material = field === "custo_material" ? Number(value) : (item.custo_material ?? 0);
        const maoObra = field === "custo_mao_obra" ? Number(value) : (item.custo_mao_obra ?? 0);
        const custoUnitario = material + maoObra;
        const quantidade = item.quantidade ?? 0;
        updates.custo_unitario = custoUnitario;
        updates.custo_total = custoUnitario * quantidade;
        previousData.custo_unitario = item.custo_unitario;
        previousData.custo_total = item.custo_total;
      }

      if (field === "quantidade") {
        const quantidade = Number(value);
        const custoUnitario = item.custo_unitario ?? 0;
        updates.custo_total = quantidade * custoUnitario;
        previousData.custo_total = item.custo_total;
      }

      if (field === "custo_unitario") {
        const custoUnitario = Number(value);
        const quantidade = item.quantidade ?? 0;
        updates.custo_total = custoUnitario * quantidade;
        previousData.custo_total = item.custo_total;
      }

      // ── eap_code change: cascade rename to all descendants ──
      if (field === "eap_code" && typeof value === "string" && value !== item.eap_code) {
        const oldPrefix = item.eap_code;
        const newPrefix = value;
        const patch: { id: string; eap_code: string }[] = [
          { id: item.id, eap_code: newPrefix },
        ];
        const snapshot: { id: string; eap_code: string }[] = [
          { id: item.id, eap_code: oldPrefix },
        ];
        for (const desc of items) {
          if (desc.eap_code.startsWith(oldPrefix + ".")) {
            const suffix = desc.eap_code.slice(oldPrefix.length);
            patch.push({ id: desc.id, eap_code: newPrefix + suffix });
            snapshot.push({ id: desc.id, eap_code: desc.eap_code });
          }
        }
        undoStack.push({
          type: "delete-with-renumber" as const,
          projectId,
          deletedItems: [],
          snapshot,
        });
        supabase.rpc("renumber_eap_items", {
          p_project_id: projectId,
          p_patches: patch,
        }).then(({ error }) => {
          if (error) {
            console.error("eap_code cascade rename failed:", error);
            toast.error("Erro ao renumerar");
          } else {
            queryClient.invalidateQueries({ queryKey: ["orcamento", projectId] });
          }
        });
        return;
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
    [items, projectId, updateItem, undoStack, recalculateParentTotals, supabase, queryClient]
  );

  // ─── Insert Item at Position ───────────────────────────────────
  const handleInsertAt = useCallback(
    async (level: 1 | 2 | 3, parentPrefix: string, atPosition: number) => {
      if (!items) return;

      // Compute renumber patch + snapshot for undo
      const patch = computeRenumberPatch(items, {
        kind: "insert",
        level,
        parentPrefix,
        atPosition,
      });
      const snapshot = snapshotAffected(items, patch);

      // Apply renumbering atomically (if any)
      if (patch.length > 0) {
        const { error } = await supabase.rpc("renumber_eap_items", {
          p_project_id: projectId,
          p_patches: patch,
        });
        if (error) {
          toast.error("Erro ao renumerar");
          console.error("renumber_eap_items failed:", error);
          return;
        }
      }

      // Create the new item with the now-free eap_code
      const newCode = formatEapCode(parentPrefix, atPosition, level);

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
              type: "insert-with-renumber",
              projectId,
              createdItemId: data.id,
              snapshot,
            });
          },
          onError: async (err) => {
            console.error("createItem failed, reverting renumber", err);
            if (snapshot.length > 0) {
              await supabase.rpc("revert_renumber", {
                p_project_id: projectId,
                p_snapshot: snapshot,
              });
            }
            toast.error("Erro ao criar item");
          },
        }
      );
    },
    [items, projectId, createItem, undoStack]
  );

  // ─── Delete Item with auto-renumber (inline Sim/Não in BudgetRow) ──
  const handleDeleteRequest = useCallback(
    async (item: OrcamentoItem) => {
      if (!items) return;

      // Determine what will be removed (item + all descendants)
      const toDelete = items.filter(
        (i) => i.id === item.id || i.eap_code.startsWith(item.eap_code + ".")
      );

      // Compute patch for subsequent sibling renumbering (+ descendants)
      const patch = computeRenumberPatch(items, {
        kind: "delete",
        deletedCode: item.eap_code,
        level: item.eap_level as 1 | 2 | 3,
      });
      const snapshot = snapshotAffected(items, patch);

      // 1) Bulk delete
      try {
        await bulkDelete.mutateAsync({
          ids: toDelete.map((i) => i.id),
          projectId,
        });
      } catch (err) {
        console.error("bulkDelete failed:", err);
        toast.error("Erro ao excluir");
        return;
      }

      // 2) Renumber subsequent siblings
      if (patch.length > 0) {
        const { error } = await supabase.rpc("renumber_eap_items", {
          p_project_id: projectId,
          p_patches: patch,
        });
        if (error) {
          console.error("renumber_eap_items failed after delete:", error);
          toast.error("Itens excluídos, mas renumeração falhou");
          return;
        }
      }

      // 3) Invalidate cache to reflect renumbered items
      queryClient.invalidateQueries({ queryKey: ["orcamento", projectId] });

      // 4) Push composite entry to undoStack
      undoStack.push({
        type: "delete-with-renumber",
        projectId,
        deletedItems: toDelete,
        snapshot,
      });

      toast.success(`${toDelete.length} item(ns) excluído(s)`);
    },
    [items, projectId, bulkDelete, undoStack, supabase, queryClient]
  );

  // ─── Context Menu ──────────────────────────────────────────────
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: OrcamentoItem) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, item });
    },
    []
  );

  /** Insert a new sibling relative to the target item (used by context menu) */
  const insertRelative = useCallback(
    (target: OrcamentoItem, position: "above" | "below") => {
      const level = target.eap_level as 1 | 2 | 3;
      const parts = target.eap_code.split(".");
      const parentPrefix = parts.slice(0, -1).join(".");
      const targetLastSeg = parseInt(parts[parts.length - 1], 10);

      const atPosition =
        position === "above" ? targetLastSeg : targetLastSeg + 1;

      handleInsertAt(level, parentPrefix, atPosition);
    },
    [handleInsertAt]
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

  // ─── Import Propostas ──────────────────────────────────────
  const handleImportPropostas = useCallback(
    (
      importItems: Array<{
        eap_code: string;
        eap_level: number;
        descricao: string;
        unidade: string | null;
        quantidade: number | null;
        custo_unitario: number | null;
        custo_total: number | null;
        fonte: string | null;
      }>
    ) => {
      const inserts = importItems.map((item) => ({
        project_id: projectId,
        eap_code: item.eap_code,
        eap_level: item.eap_level,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        fonte: item.fonte,
        fonte_codigo: null,
        fonte_data_base: null,
        custo_unitario: item.custo_unitario,
        custo_material: item.eap_level === 1 ? null : (item.custo_total ?? 0),
        custo_mao_obra: item.eap_level === 1 ? null : 0,
        custo_total: item.eap_level === 1 ? null : (item.custo_total ?? 0),
        adm_percentual: 12,
        peso_percentual: null,
        curva_abc_classe: null,
        quantitativo_id: null,
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
        }
      );
    },
    [projectId, bulkCreate, undoStack]
  );

  // ─── Price Source Applied ──────────────────────────────────────
  const handlePriceApplied = useCallback(
    (args: { item: OrcamentoItem; previousData: PreviousPriceData }) => {
      undoStack.push({
        type: "update",
        table: "ob_orcamento_items",
        itemId: args.item.id,
        projectId,
        previousData: args.previousData as Record<string, unknown>,
      });
    },
    [projectId, undoStack]
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
      const rowIndex = flatRows.indexOf(row.item);
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
          onFindPriceSource={setPriceSourceItem}
          rowIndex={rowIndex}
          focusedCol={focusedCell?.row === rowIndex ? focusedCell.col : null}
          onCellFocus={handleCellFocus}
          onCellNavigate={handleCellNavigate}
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
    <div className="flex flex-col h-full max-w-fit">
      <BudgetToolbar
        items={items ?? []}
        onInsertAt={handleInsertAt}
        onExportExcel={handleExportExcel}
        onSearch={setSearchQuery}
        filterDisciplina={filterDisciplina}
        onFilterDisciplina={setFilterDisciplina}
        onImportQuantitativos={() => setImportOpen(true)}
        onImportPropostas={() => setImportPropostasOpen(true)}
        onUndo={undoStack.undo}
      />

      <ScrollArea className="flex-1">
        <table className="border-collapse">
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

      {/* Import Propostas Modal */}
      <ImportPropostas
        open={importPropostasOpen}
        onOpenChange={setImportPropostasOpen}
        projectId={projectId}
        existingItems={items ?? []}
        onImport={handleImportPropostas}
      />

      {/* Price Source Dialog */}
      <PriceSourceDialog
        item={priceSourceItem}
        open={!!priceSourceItem}
        onOpenChange={(open) => {
          if (!open) setPriceSourceItem(null);
        }}
        onApplied={handlePriceApplied}
      />
    </div>
  );
}
