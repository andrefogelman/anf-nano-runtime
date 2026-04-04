import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BudgetCell } from "./BudgetCell";
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
}

export function BudgetRow({
  item,
  isExpanded,
  hasChildren,
  onToggle,
  onUpdate,
  onDelete,
  onContextMenu,
}: BudgetRowProps) {
  const { setActiveItemId } = useProjectContext();
  const isLevel1 = item.eap_level === 1;
  const isLevel3 = item.eap_level === 3;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <tr
      className={cn(
        "group border-b transition-colors hover:bg-accent/20",
        isLevel1 && "budget-row-level1 bg-primary/5",
        !isLevel1 && !isLevel3 && "budget-row-level2",
        isLevel3 && "budget-row-level3"
      )}
      onClick={() => setActiveItemId(item.id)}
      onContextMenu={(e) => onContextMenu(e, item)}
    >
      {/* Item code (editable) */}
      <td className="w-20 border-r px-2 py-1">
        <div className="flex items-center gap-1">
          {hasChildren && (
            <button onClick={onToggle} className="p-0.5 hover:bg-accent rounded">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          <BudgetCell
            value={item.eap_code}
            type="text"
            onChange={(v) => onUpdate("eap_code", v)}
            className={cn("text-sm", isLevel1 && "font-bold")}
          />
        </div>
      </td>

      {/* Descricao (always editable, including etapas) */}
      <td className="min-w-[200px] border-r">
        <BudgetCell
          value={item.descricao}
          type="text"
          onChange={(v) => onUpdate("descricao", v)}
          className={cn(isLevel1 && "font-bold")}
        />
      </td>

      {/* Unidade */}
      <td className="w-16 border-r text-center">
        <BudgetCell
          value={item.unidade}
          type="unit"
          onChange={(v) => onUpdate("unidade", v)}
          readOnly={isLevel1}
        />
      </td>

      {/* Quantidade */}
      <td className="w-20 border-r text-right">
        <BudgetCell
          value={item.quantidade}
          type={isLevel1 ? "readonly-number" : "number"}
          onChange={(v) => onUpdate("quantidade", v)}
          className="text-right"
          readOnly={isLevel1}
        />
      </td>

      {/* Material */}
      <td className="w-28 border-r text-right">
        <BudgetCell
          value={item.custo_material}
          type={isLevel1 ? "readonly-currency" : "currency"}
          onChange={(v) => onUpdate("custo_material", v)}
          className="text-right"
        />
      </td>

      {/* Mao de Obra */}
      <td className="w-28 border-r text-right">
        <BudgetCell
          value={item.custo_mao_obra}
          type={isLevel1 ? "readonly-currency" : "currency"}
          onChange={(v) => onUpdate("custo_mao_obra", v)}
          className="text-right"
        />
      </td>

      {/* Custo Total */}
      <td className="w-28 border-r text-right">
        <BudgetCell
          value={item.custo_total}
          type="readonly-currency"
          onChange={() => {}}
          className={cn("text-right", isLevel1 && "font-bold")}
          readOnly
        />
      </td>

      {/* Adm% + Delete */}
      <td className="w-16 text-right">
        <div className="flex items-center justify-end gap-1">
          <BudgetCell
            value={item.adm_percentual}
            type={isLevel1 ? "readonly-number" : "percent"}
            onChange={(v) => onUpdate("adm_percentual", v)}
            className="text-right"
            readOnly={isLevel1}
          />
          {confirmDelete ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                className="h-6 px-2 text-[10px] font-medium rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                  setConfirmDelete(false);
                }}
              >
                Sim
              </button>
              <button
                className="h-6 px-2 text-[10px] font-medium rounded border hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(false);
                }}
              >
                Não
              </button>
            </div>
          ) : (
            <button
              className="invisible p-0.5 rounded hover:bg-destructive/10 group-hover:visible"
              title="Excluir"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive/70 hover:text-destructive" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
