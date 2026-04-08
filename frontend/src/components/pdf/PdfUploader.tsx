import { useCallback, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUploadPdf } from "@/hooks/usePdfJobs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PdfUploaderProps {
  projectId: string;
}

export function PdfUploader({ projectId }: PdfUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [disciplina, setDisciplina] = useState<string>("auto");
  const uploadPdf = useUploadPdf();

  const handleFiles = useCallback(
    async (files: FileList) => {
      const getFileType = (f: File): "pdf" | "dwg" | "dxf" | null => {
        const ext = f.name.toLowerCase().split(".").pop();
        if (ext === "pdf") return "pdf";
        if (ext === "dwg") return "dwg";
        if (ext === "dxf") return "dxf";
        return null;
      };

      const validFiles = Array.from(files).filter(
        (f) => getFileType(f) !== null
      );

      if (validFiles.length === 0) {
        toast.error("Selecione arquivos PDF, DWG ou DXF");
        return;
      }

      for (const file of validFiles) {
        const fileType = getFileType(file)!;
        try {
          await uploadPdf.mutateAsync({
            projectId,
            file,
            disciplina: disciplina === "auto" ? null : disciplina,
            fileType,
          });
          toast.success(`${file.name} enviado com sucesso`);
        } catch {
          toast.error(`Erro ao enviar ${file.name}`);
        }
      }
    },
    [projectId, disciplina, uploadPdf]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={disciplina} onValueChange={setDisciplina}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-detectar</SelectItem>
            <SelectItem value="arq">Arquitetônico</SelectItem>
            <SelectItem value="est">Estrutural</SelectItem>
            <SelectItem value="hid">Hidráulico</SelectItem>
            <SelectItem value="ele">Elétrico</SelectItem>
            <SelectItem value="memorial">Memorial</SelectItem>
            <SelectItem value="proposta">Proposta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">
          Arraste arquivos aqui ou clique para selecionar
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Plantas, cortes, detalhes, memoriais
        </p>
        <input
          type="file"
          accept=".pdf,.dwg,.dxf"
          multiple
          className="hidden"
          id="pdf-upload-input"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => document.getElementById("pdf-upload-input")?.click()}
          disabled={uploadPdf.isPending}
        >
          <FileText className="mr-2 h-4 w-4" />
          {uploadPdf.isPending ? "Enviando..." : "Selecionar Arquivos"}
        </Button>
      </div>
    </div>
  );
}
