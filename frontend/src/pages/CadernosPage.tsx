import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCadernoSearch,
  useCadernoList,
  type SinapiChunk,
} from "@/hooks/useCadernos";

function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text;
  // Escape regex special chars
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`(${escaped})`, "gi"),
    '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>',
  );
}

function ChunkCard({
  chunk,
  query,
  isExpanded,
  onToggle,
}: {
  chunk: SinapiChunk;
  query: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Show first 200 chars as preview, full text when expanded
  const preview =
    chunk.content.length > 200
      ? chunk.content.slice(0, 200) + "..."
      : chunk.content;

  return (
    <div className="border rounded-lg bg-card transition-shadow hover:shadow-sm">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <span className="mt-0.5 shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </span>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="shrink-0 gap-1">
              <FileText className="h-3 w-3" />
              {chunk.source_title}
            </Badge>
            {chunk.page_number != null && (
              <Badge variant="outline" className="shrink-0">
                Pág. {chunk.page_number}
              </Badge>
            )}
            {chunk.similarity != null && (
              <Badge variant="outline" className="shrink-0 font-mono text-xs">
                {(chunk.similarity * 100).toFixed(1)}%
              </Badge>
            )}
          </div>

          <p
            className={cn(
              "text-sm text-muted-foreground leading-relaxed",
              !isExpanded && "line-clamp-3",
            )}
            dangerouslySetInnerHTML={{
              __html: highlightMatch(
                isExpanded ? chunk.content : preview,
                query,
              ),
            }}
          />
        </div>
      </button>
    </div>
  );
}

export default function CadernosPage() {
  const [searchInput, setSearchInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCadernoList, setShowCadernoList] = useState(false);

  const { data: results, isLoading: isSearching } =
    useCadernoSearch(searchInput);
  const { data: cadernos, isLoading: isLoadingList } = useCadernoList();

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const hasQuery = searchInput.trim().length >= 3;
  const totalChunks = cadernos?.reduce((sum, c) => sum + c.chunk_count, 0) ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Cadernos Técnicos SINAPI</h1>
          {cadernos && (
            <Badge variant="secondary" className="ml-2">
              {cadernos.length} caderno{cadernos.length !== 1 ? "s" : ""}
              {" · "}
              {totalChunks.toLocaleString("pt-BR")} trechos
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nos cadernos técnicos... (min. 3 caracteres)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick stats */}
        {!hasQuery && (
          <button
            onClick={() => setShowCadernoList((prev) => !prev)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {showCadernoList ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Ver lista de cadernos disponíveis
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {/* Caderno list (when no search) */}
        {!hasQuery && showCadernoList && (
          <div className="mb-6">
            {isLoadingList ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : cadernos && cadernos.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {cadernos.map((c) => (
                  <button
                    key={c.source_file}
                    onClick={() => setSearchInput(c.source_title.slice(0, 20))}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{c.source_title}</span>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {c.chunk_count}
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum caderno indexado ainda. Execute o script de indexação.
              </p>
            )}
          </div>
        )}

        {/* Search results */}
        {hasQuery && (
          <>
            {isSearching ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : results && results.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  {results.length} resultado{results.length !== 1 ? "s" : ""}{" "}
                  encontrado{results.length !== 1 ? "s" : ""}
                </p>
                {results.map((chunk) => (
                  <ChunkCard
                    key={chunk.id}
                    chunk={chunk}
                    query={searchInput}
                    isExpanded={expandedId === chunk.id}
                    onToggle={() => toggleExpand(chunk.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BookOpen className="h-12 w-12 mb-4 opacity-40" />
                <p className="text-lg font-medium">Nenhum resultado encontrado</p>
                <p className="text-sm">
                  Tente termos diferentes ou verifique se os cadernos foram indexados.
                </p>
              </div>
            )}
          </>
        )}

        {/* Empty state when no search */}
        {!hasQuery && !showCadernoList && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">Pesquise nos Cadernos Técnicos</p>
            <p className="text-sm">
              Digite pelo menos 3 caracteres para buscar metodologias,
              composições e procedimentos SINAPI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
