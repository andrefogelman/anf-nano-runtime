import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { BudgetCell, type NavigateDirection } from "./BudgetCell";
import { useProjectContext } from "@/contexts/ProjectContext";
import type { OrcamentoItem } from "@/types/orcamento";

interface BudgetRowProps {
  item: OrcamentoItem;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onUpdate: (field: keyof OrcamentoItem, value: string | number) => void;
  onDelete: (item: OrcamentoItem) => void;
  onContextMenu: (e: React.MouseEvent, item: OrcamentoItem) => void;
  onFindPriceSource: (item: OrcamentoItem) => void;
  rowIndex: number;
  focusedCol: number | null;
  onCellFocus: (rowIndex: number, colIndex: number) => void;
  onCellNavigate: (rowIndex: number, colIndex: number, direction: NavigateDirection) => void;
}

const COLUMNS: Array<{
  field: keyof OrcamentoItem;
  type: string;
  typeLevel1: string;
}> = [
  { field: "eap_code", type: "text", typeLevel1: "text" },
  { field: "descricao", type: "text", typeLevel1: "text" },
  { field: "unidade", type: "unit", typeLevel1: "unit" },
  { field: "quantidade", type: "number", typeLevel1: "readonly-number" },
  { field: "custo_material", type: "currency", typeLevel1: "readonly-currency" },
  { field: "custo_mao_obra", type: "currency", typeLevel1: "readonly-currency" },
  { field: "custo_total", type: "readonly-currency", typeLevel1: "readonly-currency" },
  { field: "adm_percentual", type: "percent", typeLevel1: "readonly-number" },
];

export function BudgetRow({
  item,
  isExpanded,
  hasChildren,
  onToggle,
  onUpdate,
  onDelete,
  onContextMenu,
  onFindPriceSource,
  rowIndex,
  focusedCol,
  onCellFocus,
  onCellNavigate,
}: BudgetRowProps) {
  const { setActiveItemId } = useProjectContext();
  const isLevel1 = item.eap_level === 1;
  const isLevel3 = item.eap_level === 3;
  const [confirmDelete, setConfirmDelete] = useState(false);

  function cellProps(colIndex: number) {
    const col = COLUMNS[colIndex];
    const cellType = isLevel1 ? col.typeLevel1 : col.type;
    const isReadOnly = cellType.startsWith("readonly");
    return {
      value: item[col.field] as string | number | null,
      type: cellType as any,
      onChange: (v: string | number) => onUpdate(col.field, v),
      focused: focusedCol === colIndex,
      onFocus: () => onCellFocus(rowIndex, colIndex),
      onNavigate: (dir: NavigateDirection) => onCellNavigate(rowIndex, colIndex, dir),
      readOnly: isReadOnly || (col.field === "unidade" && isLevel1),
    };
  }

  return (
    <tr
      className={cn(
        "group border-b transition-colors hover:bg-accent/50",
        isLevel1 && "budget-row-level1 bg-primary/5 hover:bg-primary/15",
        !isLevel1 && !isLevel3 && "budget-row-level2",
        isLevel3 && "budget-row-level3"
      )}
      onClick={() => setActiveItemId(item.id)}
      onContextMenu={(e) => onContextMenu(e, item)}
    >
      {/* Col 0: Item code */}
      <td className="w-20 border-r px-0 py-0">
        <div className="flex items-center gap-1 px-2">
          {hasChildren && (
            <button onClick={onToggle} className="p-0.5 hover:bg-accent rounded flex-shrink-0">
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}
          <BudgetCell
            {...cellProps(0)}
            className={cn("text-sm", isLevel1 && "font-bold")}
          />
        </div>
      </td>

      {/* Col 1: Descricao */}
      <td className="min-w-[200px] border-r px-0 py-0">
        <BudgetCell {...cellProps(1)} className={cn(isLevel1 && "font-bold")} />
      </td>

      {/* Col 2: Unidade */}
      <td className="w-16 border-r text-center px-0 py-0">
        <BudgetCell {...cellProps(2)} />
      </td>

      {/* Col 3: Quantidade */}
      <td className="w-20 border-r text-right px-0 py-0">
        <BudgetCell {...cellProps(3)} className="text-right" />
      </td>

      {/* Col 4: Material */}
      <td className="w-28 border-r text-right px-0 py-0">
        <BudgetCell {...cellProps(4)} className="text-right" />
      </td>

      {/* Col 5: Mao de Obra */}
      <td className="w-28 border-r text-right px-0 py-0">
        <BudgetCell {...cellProps(5)} className="text-right" />
      </td>

      {/* Col 6: Custo Total */}
      <td className="w-28 border-r text-right px-0 py-0">
        <BudgetCell
          {...cellProps(6)}
          className={cn("text-right", isLevel1 && "font-bold")}
        />
      </td>

      {/* Col 7: Adm% + actions */}
      <td className="w-16 text-right px-0 py-0">
        <div className="flex items-center justify-end gap-1">
          <BudgetCell {...cellProps(7)} className="text-right" />
          <button
            className="p-0.5 rounded hover:bg-accent flex-shrink-0"
            title="Buscar preco SINAPI/TCPO"
            onClick={(e) => { e.stopPropagation(); onFindPriceSource(item); }}
          >
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                className="h-6 px-2 text-[10px] font-medium rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => { e.stopPropagation(); onDelete(item); setConfirmDelete(false); }}
              >Sim</button>
              <button
                className="h-6 px-2 text-[10px] font-medium rounded border hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
              >Nao</button>
            </div>
          ) : (
            <button
              className="invisible p-0.5 rounded hover:bg-destructive/10 group-hover:visible flex-shrink-0"
              title="Excluir"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive/70 hover:text-destructive" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
