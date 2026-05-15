import { useMemo, useState } from "react";
import { Loader2, Layers, Sparkles, Database } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useProjectFiles } from "@/hooks/usePdfJobs";
import {
  DISCIPLINA_LABELS,
  useExtract,
  type Disciplina,
  type ExtractProvider,
  type ExtractReasoning,
  type ExtractResult,
} from "@/hooks/useExtract";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  projectId: string;
}

export function ExtractStructuredPanel({ projectId }: Props) {
  const { data: files, isLoading: loadingFiles } = useProjectFiles(projectId);
  const extract = useExtract();

  const pdfFiles = useMemo(
    () => (files ?? []).filter((f) => f.file_type === "pdf"),
    [files],
  );

  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [disciplina, setDisciplina] = useState<Disciplina>("arq");
  const [provider, setProvider] = useState<ExtractProvider>("openai");
  const [reasoning, setReasoning] = useState<ExtractReasoning>("medium");
  const [saveQuant, setSaveQuant] = useState(false);
  const [resultado, setResultado] = useState<ExtractResult | null>(null);

  const selectedFile = pdfFiles.find((f) => f.id === selectedFileId);

  const enviar = async () => {
    if (!selectedFile) {
      toast.error("Selecione um PDF antes");
      return;
    }
    setResultado(null);

    let pdfBlob: Blob;
    try {
      const { data, error } = await supabase.storage
        .from("project-pdfs")
        .download(selectedFile.storage_path);
      if (error) throw error;
      pdfBlob = data;
    } catch (e) {
      toast.error(`Falha ao baixar PDF: ${(e as Error).message}`);
      return;
    }

    try {
      const result = await extract.mutateAsync({
        disciplina,
        pdf: pdfBlob,
        filename: selectedFile.filename,
        provider,
        reasoning_effort: reasoning,
        project_id: projectId,
        save_quantitativos: saveQuant,
      });
      setResultado(result);
      toast.success(
        saveQuant
          ? `Extração ok — ${result.quantitativos_inseridos} quantitativo(s) inseridos`
          : `Extração ok em ${result.duracao_s}s — $${result.custo_usd.toFixed(4)}`,
      );
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extração estruturada por disciplina</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="ext-pdf">PDF</Label>
              <Select value={selectedFileId} onValueChange={setSelectedFileId}>
                <SelectTrigger id="ext-pdf" disabled={loadingFiles}>
                  <SelectValue
                    placeholder={
                      loadingFiles
                        ? "Carregando…"
                        : pdfFiles.length === 0
                          ? "Nenhum PDF"
                          : "Selecione"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {pdfFiles.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ext-disc">Disciplina</Label>
              <Select
                value={disciplina}
                onValueChange={(v) => setDisciplina(v as Disciplina)}
              >
                <SelectTrigger id="ext-disc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DISCIPLINA_LABELS) as Disciplina[]).map((d) => (
                    <SelectItem key={d} value={d}>
                      {DISCIPLINA_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Provedor</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as ExtractProvider)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI gpt-5</SelectItem>
                  <SelectItem value="claude">Claude Sonnet 4.6</SelectItem>
                  <SelectItem value="google">Gemini 3 Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Reasoning</Label>
              <Select
                value={reasoning}
                onValueChange={(v) => setReasoning(v as ExtractReasoning)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">low</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="high">high</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={saveQuant}
                onChange={(e) => setSaveQuant(e.target.checked)}
              />
              Salvar resultados em <code>ob_quantitativos</code> (needs_review)
            </label>
            <div className="flex-1" />
            <Button
              onClick={enviar}
              disabled={extract.isPending || !selectedFileId}
            >
              {extract.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extraindo…
                </>
              ) : (
                <>
                  <Layers className="mr-2 h-4 w-4" />
                  Extrair
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultado && <ResultadoExtractCard result={resultado} />}
    </div>
  );
}

function ResultadoExtractCard({ result }: { result: ExtractResult }) {
  const json = useMemo(() => JSON.stringify(result.data, null, 2), [result.data]);
  const counts = useMemo(() => summarize(result.data), [result.data]);

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          Resultado — {result.label}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {counts.map((c) => (
            <Badge key={c.label} variant="secondary">
              {c.label}: <span className="ml-1 font-mono">{c.value}</span>
            </Badge>
          ))}
          {result.quantitativos_inseridos > 0 && (
            <Badge variant="outline" className="border-confidence-high/30 text-confidence-high">
              <Database className="mr-1 h-3 w-3" />
              {result.quantitativos_inseridos} quantitativos
            </Badge>
          )}
          <Badge variant="outline" className="font-mono">
            <Sparkles className="mr-1 h-3 w-3" />
            {result.model_used} · {result.duracao_s}s · ${result.custo_usd.toFixed(4)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <ScrollArea className="flex-1">
          <pre className="px-4 pb-4 text-xs leading-relaxed">
            <code>{json}</code>
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/** Conta arrays top-level pra mostrar resumo no header. */
function summarize(data: Record<string, unknown>): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) {
      out.push({ label: k, value: v.length });
    }
  }
  return out;
}
