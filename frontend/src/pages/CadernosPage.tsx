import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  FileText,
  Eye,
  Search,
} from "lucide-react";
import { useCadernoList, type CadernoSummary } from "@/hooks/useCadernos";
import { PdfViewerModal } from "@/components/cadernos/PdfViewerModal";

const SUPABASE_STORAGE_BASE =
  "https://baebsednxclzqukzxkbg.supabase.co/storage/v1/object/public/sinapi-cadernos";

/**
 * Derive the PDF filename from source_title or source_file.
 */
function getPdfUrl(sourceTitle: string, sourceFile: string): string {
  const filename = sourceFile.split("/").pop() ?? sourceFile;
  if (filename.toLowerCase().endsWith(".pdf")) {
    return `${SUPABASE_STORAGE_BASE}/${encodeURIComponent(filename)}`;
  }
  const slug = sourceTitle
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return `${SUPABASE_STORAGE_BASE}/SINAPI-CT-${slug}.pdf`;
}

function CadernoCard({
  caderno,
  onViewPdf,
}: {
  caderno: CadernoSummary;
  onViewPdf: (caderno: CadernoSummary) => void;
}) {
  return (
    <div className="group flex flex-col gap-2 rounded-xl border bg-card p-3 hover:shadow-md transition-all hover:border-primary/20">
      <div className="flex items-start gap-2.5">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/5 shrink-0 group-hover:bg-primary/10 transition-colors">
          <FileText className="h-4.5 w-4.5 text-primary/60" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight truncate" title={caderno.source_title}>
            {caderno.source_title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {caderno.chunk_count} trechos indexados
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 h-8 text-xs"
        onClick={() => onViewPdf(caderno)}
      >
        <Eye className="h-3.5 w-3.5" />
        Ver PDF
      </Button>
    </div>
  );
}

export default function CadernosPage() {
  const { data: cadernos, isLoading: isLoadingList } = useCadernoList();

  const [pdfModal, setPdfModal] = useState<{
    open: boolean;
    url: string;
    title: string;
  }>({ open: false, url: "", title: "" });

  const [filter, setFilter] = useState("");

  const filteredCadernos = useMemo(() => {
    if (!cadernos) return [];
    if (!filter.trim()) return cadernos;
    const lower = filter.toLowerCase();
    return cadernos.filter((c) =>
      c.source_title.toLowerCase().includes(lower),
    );
  }, [cadernos, filter]);

  const totalChunks =
    cadernos?.reduce((sum, c) => sum + c.chunk_count, 0) ?? 0;

  const openPdfForCaderno = useCallback(
    (caderno: CadernoSummary) => {
      const url = getPdfUrl(caderno.source_title, caderno.source_file);
      setPdfModal({ open: true, url, title: caderno.source_title });
    },
    [],
  );

  return (
    <>
      <div className="flex flex-col h-full max-w-fit">
          {/* Header */}
          <div className="px-4 py-3 border-b bg-muted/20 space-y-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Cadernos Técnicos</h1>
            </div>
            {cadernos && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {cadernos.length} cadernos
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {totalChunks.toLocaleString("pt-BR")} trechos
                </Badge>
              </div>
            )}
            {/* Filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filtrar cadernos..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Cadernos grid */}
          <ScrollArea className="flex-1">
            <div className="p-3">
              {isLoadingList ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              ) : filteredCadernos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {filteredCadernos.map((c) => (
                    <CadernoCard
                      key={c.source_file}
                      caderno={c}
                      onViewPdf={openPdfForCaderno}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">
                    {filter.trim()
                      ? "Nenhum caderno encontrado"
                      : "Nenhum caderno indexado"}
                  </p>
                  <p className="text-xs mt-1">
                    {filter.trim()
                      ? "Tente outro termo de busca."
                      : "Execute o script de indexação."}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
      </div>

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        open={pdfModal.open}
        onClose={() => setPdfModal({ open: false, url: "", title: "" })}
        pdfUrl={pdfModal.url}
        title={pdfModal.title}
      />
    </>
  );
}
