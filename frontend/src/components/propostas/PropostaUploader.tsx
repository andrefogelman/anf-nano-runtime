import { useCallback, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadPdf } from "@/hooks/usePdfJobs";
import { useCreateProposta } from "@/hooks/usePropostas";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PropostaUploaderProps {
  projectId: string;
}

export function PropostaUploader({ projectId }: PropostaUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const uploadPdf = useUploadPdf();
  const createProposta = useCreateProposta();

  const handleFiles = useCallback(
    async (files: FileList) => {
      const pdfFiles = Array.from(files).filter(
        (f) => f.name.toLowerCase().endsWith(".pdf")
      );

      if (pdfFiles.length === 0) {
        toast.error("Selecione arquivos PDF de propostas");
        return;
      }

      for (const file of pdfFiles) {
        try {
          const fileRecord = await uploadPdf.mutateAsync({
            projectId,
            file,
            disciplina: "proposta",
            fileType: "pdf",
          });

          await createProposta.mutateAsync({
            project_id: projectId,
            file_id: fileRecord.id,
            fornecedor: file.name.replace(/\.pdf$/i, ""),
            status: "pending",
          });

          toast.success(`${file.name} enviado para extração`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Upload proposta error:", err);
          toast.error(`Erro ao enviar ${file.name}: ${msg}`);
        }
      }
    },
    [projectId, uploadPdf, createProposta]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors",
        dragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      )}
    >
      <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">
        Arraste PDFs de propostas aqui
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Propostas comerciais de fornecedores
      </p>
      <input
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        id="proposta-upload-input"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
        }}
      />
      <Button
        variant="outline"
        className="mt-3"
        onClick={() => document.getElementById("proposta-upload-input")?.click()}
        disabled={uploadPdf.isPending}
      >
        <FileText className="mr-2 h-4 w-4" />
        {uploadPdf.isPending ? "Enviando..." : "Selecionar PDFs"}
      </Button>
    </div>
  );
}
