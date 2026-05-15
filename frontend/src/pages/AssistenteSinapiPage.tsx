import { useCallback, useState } from "react";
import { CadernoChat } from "@/components/cadernos/CadernoChat";
import { PdfViewerModal } from "@/components/cadernos/PdfViewerModal";
import { SinapiMatchPanel } from "@/components/cadernos/SinapiMatchPanel";
import { useCadernoList } from "@/hooks/useCadernos";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SUPABASE_STORAGE_BASE =
  "https://baebsednxclzqukzxkbg.supabase.co/storage/v1/object/public/sinapi-cadernos";

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

export default function AssistenteSinapiPage() {
  const { data: cadernos } = useCadernoList();
  const [pdfModal, setPdfModal] = useState<{ open: boolean; url: string; title: string; page: number }>({
    open: false, url: "", title: "", page: 1,
  });

  const openPdfFromChat = useCallback(
    (sourceFile: string, title: string, page?: number) => {
      if (!sourceFile && !title) return;
      const match = cadernos?.find(
        (c) => c.source_file === sourceFile || c.source_title.toLowerCase() === title.toLowerCase(),
      );
      const url = match
        ? getPdfUrl(match.source_title, match.source_file)
        : getPdfUrl(title, sourceFile);
      setPdfModal({ open: true, url, title: match?.source_title || title, page: page || 1 });
    },
    [cadernos],
  );

  return (
    <>
      <div className="flex h-full flex-col">
        <Tabs defaultValue="match" className="flex h-full flex-col">
          <TabsList className="mx-4 mt-4 self-start">
            <TabsTrigger value="match">Match SINAPI (vector + LLM)</TabsTrigger>
            <TabsTrigger value="chat">Chat de cadernos (legado)</TabsTrigger>
          </TabsList>
          <TabsContent value="match" className="flex-1 overflow-hidden">
            <SinapiMatchPanel />
          </TabsContent>
          <TabsContent value="chat" className="flex-1 overflow-hidden">
            <div className="mx-auto flex h-full max-w-3xl flex-col">
              <CadernoChat onOpenPdf={openPdfFromChat} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <PdfViewerModal
        open={pdfModal.open}
        onClose={() => setPdfModal({ open: false, url: "", title: "", page: 1 })}
        pdfUrl={pdfModal.url}
        title={pdfModal.title}
        initialPage={pdfModal.page}
      />
    </>
  );
}
