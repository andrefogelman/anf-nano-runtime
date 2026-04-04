import { useCallback, useState } from "react";
import { CadernoChat } from "@/components/cadernos/CadernoChat";
import { PdfViewerModal } from "@/components/cadernos/PdfViewerModal";
import { useCadernoList } from "@/hooks/useCadernos";

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
  const [pdfModal, setPdfModal] = useState<{ open: boolean; url: string; title: string }>({
    open: false, url: "", title: "",
  });

  const openPdfFromChat = useCallback(
    (sourceFile: string, title: string) => {
      if (!sourceFile && !title) return;
      const match = cadernos?.find(
        (c) => c.source_file === sourceFile || c.source_title.toLowerCase() === title.toLowerCase(),
      );
      const url = match
        ? getPdfUrl(match.source_title, match.source_file)
        : getPdfUrl(title, sourceFile);
      setPdfModal({ open: true, url, title: match?.source_title || title });
    },
    [cadernos],
  );

  return (
    <>
      <div className="flex flex-col h-full max-w-3xl">
        <CadernoChat onOpenPdf={openPdfFromChat} />
      </div>

      <PdfViewerModal
        open={pdfModal.open}
        onClose={() => setPdfModal({ open: false, url: "", title: "" })}
        pdfUrl={pdfModal.url}
        title={pdfModal.title}
      />
    </>
  );
}
