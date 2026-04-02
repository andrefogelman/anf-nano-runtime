import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Download, Filter, Search, Upload, Undo2 } from "lucide-react";
import { useState } from "react";

interface BudgetToolbarProps {
  onAddItem: (level: number) => void;
  onExportExcel: () => void;
  onSearch: (query: string) => void;
  filterDisciplina: string | null;
  onFilterDisciplina: (disciplina: string | null) => void;
  onImportQuantitativos?: () => void;
  onUndo?: () => void;
}

export function BudgetToolbar({
  onAddItem,
  onExportExcel,
  onSearch,
  filterDisciplina,
  onFilterDisciplina,
  onImportQuantitativos,
  onUndo,
}: BudgetToolbarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex items-center gap-3 border-b px-4 py-2">
      {/* Add item buttons */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onAddItem(1)}>
          <Plus className="mr-1 h-3 w-3" />
          Etapa
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAddItem(2)}>
          <Plus className="mr-1 h-3 w-3" />
          Item
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAddItem(3)}>
          <Plus className="mr-1 h-3 w-3" />
          Subitem
        </Button>
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-border" />

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar item..."
          className="h-8 pl-8 text-sm"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onSearch(e.target.value);
          }}
        />
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
        <Button variant="outline" size="sm" onClick={onImportQuantitativos}>
          <Upload className="mr-1 h-3 w-3" />
          Importar Quantitativos
        </Button>
      )}

      {/* Undo */}
      {onUndo && (
        <Button variant="ghost" size="sm" onClick={onUndo} title="Desfazer (Ctrl+Z)">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Export */}
      <Button variant="outline" size="sm" onClick={onExportExcel}>
        <Download className="mr-1 h-3 w-3" />
        Excel
      </Button>
    </div>
  );
}
