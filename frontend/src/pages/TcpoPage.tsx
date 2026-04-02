import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronDown, ChevronRight, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import {
  useTcpoSearch,
  useTcpoCategoryCounts,
  TCPO_CATEGORIES,
} from "@/hooks/useTcpo";
import { TcpoComposicaoDetail } from "@/components/tcpo/TcpoComposicaoDetail";

export default function TcpoPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [searchInput]);

  const { data: composicoes, isLoading } = useTcpoSearch(debouncedQuery, selectedCategory);
  const { data: categoryCounts } = useTcpoCategoryCounts();

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategory((prev) => (prev === cat ? null : cat));
    setExpandedId(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Base TCPO</h1>
          {composicoes && (
            <Badge variant="secondary" className="ml-2">
              {composicoes.length} resultado{composicoes.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar composição por descrição..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {TCPO_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            const count = categoryCounts?.[cat] ?? 0;
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted"
                )}
              >
                {cat}
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-1.5 text-xs min-w-[1.25rem]",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : composicoes && composicoes.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="w-28">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-16">Un</TableHead>
                <TableHead className="w-36 text-right">R$ Sem Taxas</TableHead>
                <TableHead className="w-36 text-right">R$ Com Taxas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {composicoes.map((comp) => {
                const isExpanded = expandedId === comp.id;
                return (
                  <TableRow
                    key={comp.id}
                    className="group"
                  >
                    <TableCell colSpan={6} className="p-0">
                      {/* Clickable row */}
                      <button
                        onClick={() => toggleExpand(comp.id)}
                        className="flex w-full items-center text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <span className="w-8 shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        <span className="w-28 shrink-0 font-mono text-xs">
                          {comp.codigo}
                        </span>
                        <span className="flex-1 truncate pr-4">{comp.descricao}</span>
                        <span className="w-16 shrink-0 text-center text-muted-foreground">
                          {comp.unidade}
                        </span>
                        <span className="w-36 shrink-0 text-right font-mono">
                          {formatBRL(comp.custo_sem_taxas)}
                        </span>
                        <span className="w-36 shrink-0 text-right font-mono font-semibold text-primary">
                          {formatBRL(comp.custo_com_taxas)}
                        </span>
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <TcpoComposicaoDetail composicao={comp} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Database className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Nenhuma composição encontrada</p>
            <p className="text-sm">Tente alterar os filtros ou a busca.</p>
          </div>
        )}
      </div>
    </div>
  );
}
