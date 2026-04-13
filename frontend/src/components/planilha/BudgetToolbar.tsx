import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Plus, Download, Filter, Search, Upload, Undo2, X } from "lucide-react";
import { useState } from "react";
import { InsertPositionPopover } from "./InsertPositionPopover";
import type { OrcamentoItem } from "@/types/orcamento";

interface BudgetToolbarProps {
  items: OrcamentoItem[];
  onInsertAt: (level: 1 | 2 | 3, parentPrefix: string, atPosition: number) => void;
  onExportExcel: () => void;
  onSearch: (query: string) => void;
  filterDisciplina: string | null;
  onFilterDisciplina: (disciplina: string | null) => void;
  onImportQuantitativos?: () => void;
  onImportPropostas?: () => void;
  onUndo?: () => void;
}

export function BudgetToolbar({
  items,
  onInsertAt,
  onExportExcel,
  onSearch,
  filterDisciplina,
  onFilterDisciplina,
  onImportQuantitativos,
  onImportPropostas,
  onUndo,
}: BudgetToolbarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex items-center gap-3 border-b px-4 py-2">
      {/* Add item buttons */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <InsertPositionPopover
            level={1}
            items={items}
            onSelect={(prefix, pos) => onInsertAt(1, prefix, pos)}
          >
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Etapa
              </Button>
            </TooltipTrigger>
          </InsertPositionPopover>
          <TooltipContent>Adicionar nova etapa ao orçamento</TooltipContent>
        </Tooltip>
        <Tooltip>
          <InsertPositionPopover
            level={2}
            items={items}
            onSelect={(prefix, pos) => onInsertAt(2, prefix, pos)}
          >
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Item
              </Button>
            </TooltipTrigger>
          </InsertPositionPopover>
          <TooltipContent>Adicionar item dentro de uma etapa</TooltipContent>
        </Tooltip>
        <Tooltip>
          <InsertPositionPopover
            level={3}
            items={items}
            onSelect={(prefix, pos) => onInsertAt(3, prefix, pos)}
          >
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Subitem
              </Button>
            </TooltipTrigger>
          </InsertPositionPopover>
          <TooltipContent>Adicionar subitem dentro de um item</TooltipContent>
        </Tooltip>
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-border" />

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar item..."
          className="h-8 pl-8 pr-8 text-sm"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onSearch(e.target.value);
          }}
        />
        {searchQuery && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted"
            onClick={() => {
              setSearchQuery("");
              onSearch("");
            }}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Filter by disciplina */}
      <Select
        value={filterDisciplina ?? "all"}
        onValueChange={(v) => onFilterDisciplina(v === "all" ? null : v)}
      >
        <SelectTrigger className="h-8 w-40">
          <Filter className="mr-2 h-3 w-3" />
          <SelectValue placeholder="Filtrar..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas disciplinas</SelectItem>
          <SelectItem value="arq">Arquitetônico</SelectItem>
          <SelectItem value="est">Estrutural</SelectItem>
          <SelectItem value="hid">Hidráulico</SelectItem>
          <SelectItem value="ele">Elétrico</SelectItem>
        </SelectContent>
      </Select>

      {/* Import Quantitativos */}
      {onImportQuantitativos && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onImportQuantitativos}>
              <Upload className="mr-1 h-3 w-3" />
              Importar Quantitativos
            </Button>
          </TooltipTrigger>
          <TooltipContent>Importar quantitativos extraídos dos projetos</TooltipContent>
        </Tooltip>
      )}

      {/* Import Propostas */}
      {onImportPropostas && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onImportPropostas}>
              <Upload className="mr-1 h-3 w-3" />
              Importar Proposta
            </Button>
          </TooltipTrigger>
          <TooltipContent>Importar proposta de fornecedor (PDF)</TooltipContent>
        </Tooltip>
      )}

      {/* Undo */}
      {onUndo && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onUndo}>
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
        </Tooltip>
      )}

      {/* Export */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={onExportExcel}>
            <Download className="mr-1 h-3 w-3" />
            Excel
          </Button>
        </TooltipTrigger>
        <TooltipContent>Exportar planilha para Excel</TooltipContent>
      </Tooltip>
    </div>
  );
}
