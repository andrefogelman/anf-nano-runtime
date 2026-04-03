import { useState } from "react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useProjectFiles } from "@/hooks/usePdfJobs";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { PdfUploader } from "@/components/pdf/PdfUploader";
import { PranchaList } from "@/components/pdf/PranchaList";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { PdfProcessPanel } from "@/components/pdf/PdfProcessPanel";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { FileText } from "lucide-react";

export function PdfsTab() {
  const { project, setActivePranchaId } = useProjectContext();
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const { data: files } = useProjectFiles(project?.id ?? "");

  useRealtimeSubscription({
    table: "ob_pdf_jobs",
    queryKeys: [
      ["pdf-jobs", project?.id ?? ""],
      ["project-files", project?.id ?? ""],
      ["review-items", project?.id ?? ""],
    ],
    enabled: !!project?.id,
  });

  useRealtimeSubscription({
    table: "ob_project_files",
    filterColumn: "project_id",
    filterValue: project?.id,
    queryKeys: [["project-files", project?.id ?? ""]],
    enabled: !!project?.id,
  });

  if (!project) return null;

  const activeFile = files?.find((f) => f.id === activeFileId);

  function handleSelectFile(fileId: string) {
    setActiveFileId(fileId);
    setActivePranchaId(fileId);
  }

  return (
    <div className="flex h-full flex-col">
      {(!files || files.length === 0) && (
        <div className="p-6">
          <PdfUploader projectId={project.id} />
        </div>
      )}

      {files && files.length > 0 && (
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          <ResizablePanel defaultSize={30} minSize={20}>
            <div className="flex h-full flex-col">
              <div className="border-b p-3">
                <PdfUploader projectId={project.id} />
              </div>
              <PranchaList
                files={files}
                activeFileId={activeFileId}
                onSelectFile={handleSelectFile}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={40}>
            {activeFile ? (
              activeFile.file_type === "pdf" ? (
                <PdfViewer storagePath={activeFile.storage_path} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground p-8">
                  <div className="rounded-lg bg-muted p-4">
                    <FileText className="h-12 w-12" />
                  </div>
                  <p className="text-sm font-medium">
                    {activeFile.filename}
                  </p>
                  <p className="text-xs text-center">
                    Arquivo {activeFile.file_type?.toUpperCase()} — visualização não disponível no browser.
                    <br />
                    O pipeline de processamento extrai os dados automaticamente.
                  </p>
                  {activeFile.status === "done" && (
                    <span className="text-xs text-green-600 font-medium">✓ Processado com sucesso</span>
                  )}
                  {activeFile.status === "processing" && (
                    <span className="text-xs text-yellow-600 font-medium animate-pulse">⏳ Processando...</span>
                  )}
                  {activeFile.status === "error" && (
                    <span className="text-xs text-red-600 font-medium">✗ Erro no processamento</span>
                  )}
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Selecione uma prancha para visualizar
              </div>
            )}
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={25} minSize={20}>
            <PdfProcessPanel file={activeFile ?? null} projectId={project.id} />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
