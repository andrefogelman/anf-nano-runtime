import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Database,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import { useSinapiSearch } from "@/hooks/useSinapi";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function PaginationControls({
  page,
  totalPages,
  count,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  count: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <span className="text-sm text-muted-foreground">
        Exibindo {from}-{to} de {count.toLocaleString("pt-BR")}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm px-3 py-1 min-w-[120px] text-center">
          Página <strong>{page}</strong> de <strong>{totalPages}</strong>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function SinapiPage() {
  const location = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const tableTopRef = useRef<HTMLDivElement>(null);

  // Debounce 400ms
  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedQuery(searchInput), 400);
    return () => clearTimeout(timerRef.current);
  }, [searchInput]);

  // Reset page when query or filters change
  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [debouncedQuery, location.search, pageSize]);

  // Read filter from URL params (set by sidebar tree)
  const { tipo, classe } = useMemo(() => {
    const filter = new URLSearchParams(location.search).get("filter");
    if (!filter) return { tipo: null, classe: null };
    if (filter === "composicao") return { tipo: "composicao", classe: null };
    if (filter.startsWith("insumo-")) {
      const rawClasse = filter.slice("insumo-".length);
      return { tipo: "insumo", classe: rawClasse };
    }
    return { tipo: null, classe: null };
  }, [location.search]);

  const { data: result, isLoading, isFetching } = useSinapiSearch(
    debouncedQuery,
    tipo,
    classe,
    page,
    pageSize,
  );

  const composicoes = result?.data ?? [];
  const count = result?.count ?? 0;
  const totalPages = result?.totalPages ?? 1;

  // Header text
  const headerText = useMemo(() => {
    const filter = new URLSearchParams(location.search).get("filter");
    if (!filter) return "Todos os itens";
    const labels: Record<string, string> = {
      composicao: "Composições",
      "insumo-material": "Materiais",
      "insumo-mao_obra": "Mão de obra",
      "insumo-equipamento": "Equipamentos",
    };
    return labels[filter] ?? filter;
  }, [location.search]);

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setExpandedId(null);
    tableTopRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function tipoBadge(tipo: string) {
    if (tipo === "insumo") {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0 text-[10px] uppercase tracking-wide">
          Insumo
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700 border-0 text-[10px] uppercase tracking-wide">
        Composição
      </Badge>
    );
  }

  function classeBadge(tipo: string, classe: string) {
    if (tipo !== "insumo" || !classe) return null;
    const labels: Record<string, string> = {
      material: "Material",
      mao_obra: "Mão de obra",
      equipamento: "Equipamento",
    };
    const colors: Record<string, string> = {
      material: "bg-amber-100 text-amber-700",
      mao_obra: "bg-purple-100 text-purple-700",
      equipamento: "bg-slate-100 text-slate-700",
    };
    return (
      <Badge
        variant="secondary"
        className={`${colors[classe] ?? "bg-gray-100 text-gray-700"} border-0 text-[10px] uppercase tracking-wide`}
      >
        {labels[classe] ?? classe}
      </Badge>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Orange header */}
      <div className="bg-orange-500 text-white px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">
            Mostrando: {headerText}
          </span>
          <Badge className="bg-white/20 text-white border-0 text-xs">
            {count.toLocaleString("pt-BR")} iten{count !== 1 ? "s" : ""}
          </Badge>
        </div>
        {totalPages > 1 && (
          <span className="text-xs text-white/80">
            Página {page} de {totalPages}
          </span>
        )}
      </div>

      {/* Search + page size */}
      <div className="px-6 py-3 border-b flex items-center gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Itens por página:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
          >
            <SelectTrigger className="w-20 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top pagination */}
      {count > 0 && (
        <div className="px-6 py-2 border-b">
          <PaginationControls
            page={page}
            totalPages={totalPages}
            count={count}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Table */}
      <div ref={tableTopRef} className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : composicoes.length > 0 ? (
          <div className={isFetching ? "opacity-60 transition-opacity" : ""}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead className="w-28">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-16 text-center">Un</TableHead>
                  <TableHead className="w-24 text-center">Tipo</TableHead>
                  <TableHead className="w-28 text-center">Classe</TableHead>
                  <TableHead className="w-12 text-center">UF</TableHead>
                  <TableHead className="w-24 text-center">Data Base</TableHead>
                  <TableHead className="w-36 text-right">R$ Desonerado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {composicoes.map((comp) => {
                  const isExpanded = expandedId === comp.id;
                  return (
                    <TableRow key={comp.id} className="group">
                      <TableCell colSpan={9} className="p-0">
                        <div
                          className="flex w-full items-center px-4 py-3 cursor-pointer hover:bg-muted/30"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : comp.id)
                          }
                        >
                          <button className="w-8 shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          <span className="w-28 shrink-0 font-mono text-xs text-blue-600">
                            {comp.codigo}
                          </span>
                          <span className="flex-1 pr-4 truncate text-sm">
                            {comp.descricao}
                          </span>
                          <span className="w-16 shrink-0 text-center text-sm text-muted-foreground">
                            {comp.unidade}
                          </span>
                          <span className="w-24 shrink-0 text-center">
                            {tipoBadge(comp.tipo)}
                          </span>
                          <span className="w-28 shrink-0 text-center">
                            {classeBadge(comp.tipo, comp.classe)}
                          </span>
                          <span className="w-12 shrink-0 text-center text-sm text-muted-foreground">
                            {comp.uf}
                          </span>
                          <span className="w-24 shrink-0 text-center text-sm text-muted-foreground">
                            {comp.data_base}
                          </span>
                          <span className="w-36 shrink-0 text-right font-mono font-semibold text-primary">
                            {formatBRL(comp.custo_com_desoneracao)}
                          </span>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="bg-muted/30 p-4 border-t space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Código:
                                </span>{" "}
                                <span className="font-mono font-medium">
                                  {comp.codigo}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Tipo:
                                </span>{" "}
                                <span className="font-medium">
                                  {comp.tipo === "insumo"
                                    ? "Insumo"
                                    : "Composição"}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Classe:
                                </span>{" "}
                                <span className="font-medium">
                                  {comp.classe || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Unidade:
                                </span>{" "}
                                <span className="font-medium">
                                  {comp.unidade}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  UF:
                                </span>{" "}
                                <span className="font-medium">{comp.uf}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Data Base:
                                </span>{" "}
                                <span className="font-medium">
                                  {comp.data_base}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Preço Desonerado:
                                </span>{" "}
                                <span className="font-semibold text-primary">
                                  {formatBRL(comp.custo_com_desoneracao)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Preço Não Desonerado:
                                </span>{" "}
                                <span className="font-semibold">
                                  {formatBRL(comp.custo_sem_desoneracao)}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm">{comp.descricao}</p>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Database className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Nenhum item encontrado</p>
            <p className="text-sm">Tente alterar os filtros ou a busca.</p>
          </div>
        )}
      </div>

      {/* Bottom pagination */}
      {count > 0 && (
        <div className="px-6 py-3 border-t">
          <PaginationControls
            page={page}
            totalPages={totalPages}
            count={count}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
