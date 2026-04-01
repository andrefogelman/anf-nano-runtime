import { useState } from "react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useProjectFiles } from "@/hooks/usePdfJobs";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { PdfUploader } from "@/components/pdf/PdfUploader";
import { PranchaList } from "@/components/pdf/PranchaList";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { ReviewPanel } from "@/components/pdf/ReviewPanel";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

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
          <ResizablePanel defaultSize={20} minSize={15}>
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

          <ResizablePanel defaultSize={55}>
            {activeFile ? (
              <PdfViewer storagePath={activeFile.storage_path} />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Selecione uma prancha para visualizar
              </div>
            )}
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={25} minSize={20}>
            <ReviewPanel projectId={project.id} />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
