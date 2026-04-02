import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectFile } from "@/types/orcamento";
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
} from "lucide-react";
import { useDeleteFile } from "@/hooks/usePdfJobs";
import { toast } from "sonner";

const FILE_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  pdf: { label: "PDF", className: "bg-red-100 text-red-700 border-red-200" },
  dwg: { label: "DWG", className: "bg-blue-100 text-blue-700 border-blue-200" },
  dxf: { label: "DXF", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

interface PranchaListProps {
  files: ProjectFile[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
}

const STATUS_ICON = {
  uploaded: Clock,
  processing: Loader2,
  done: CheckCircle2,
  error: AlertCircle,
};

const DISCIPLINA_LABELS: Record<string, string> = {
  arq: "Arquitetônico",
  est: "Estrutural",
  hid: "Hidráulico",
  ele: "Elétrico",
  memorial: "Memorial",
};

export function PranchaList({ files, activeFileId, onSelectFile }: PranchaListProps) {
  const deleteFile = useDeleteFile();
  const grouped = files.reduce<Record<string, ProjectFile[]>>((acc, file) => {
    const key = file.disciplina ?? "sem-disciplina";
    if (!acc[key]) acc[key] = [];
    acc[key].push(file);
    return acc;
  }, {});

  return (
    <ScrollArea className="h-full w-64 border-r">
      <div className="p-3 space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Pranchas</h3>

        {Object.entries(grouped).map(([disciplina, groupFiles]) => (
          <div key={disciplina} className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              {DISCIPLINA_LABELS[disciplina] ?? "Outros"}
            </p>
            {groupFiles.map((file) => {
              const StatusIcon = STATUS_ICON[file.status];
              const isActive = file.id === activeFileId;

              return (
                <button
                  key={file.id}
                  onClick={() => onSelectFile(file.id)}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                >
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="flex-1 truncate">{file.filename}</span>
                  {(() => {
                    const badge = FILE_TYPE_BADGE[file.file_type] ?? FILE_TYPE_BADGE.pdf;
                    return (
                      <Badge variant="outline" className={cn("text-[10px] px-1 py-0 h-4", badge.className)}>
                        {badge.label}
                      </Badge>
                    );
                  })()}
                  <StatusIcon
                    className={cn(
                      "h-3.5 w-3.5 flex-shrink-0",
                      file.status === "processing" && "animate-spin text-yellow-600",
                      file.status === "done" && "text-green-600",
                      file.status === "error" && "text-red-600",
                      file.status === "uploaded" && "text-muted-foreground"
                    )}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Excluir ${file.filename}?`)) {
                        deleteFile.mutate(
                          { fileId: file.id, storagePath: file.storage_path, projectId: file.project_id },
                          {
                            onSuccess: () => toast.success(`${file.filename} excluído`),
                            onError: () => toast.error(`Erro ao excluir ${file.filename}`),
                          }
                        );
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                    title="Excluir arquivo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              );
            })}
          </div>
        ))}

        {files.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhum arquivo enviado
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
