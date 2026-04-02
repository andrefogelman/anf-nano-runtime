import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useProcessingRuns } from "@/hooks/usePdfJobs";
import { useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Loader2,
  FileText,
  TableProperties,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { ProjectFile } from "@/types/orcamento";

interface PdfProcessPanelProps {
  file: ProjectFile | null;
  projectId: string;
}

interface ExtractedItem {
  descricao: string;
  quantidade: number;
  unidade: string;
  memorial_calculo?: string;
  ambiente?: string;
  disciplina?: string;
  confidence?: number;
  selected: boolean;
}

const SUGGESTED_PROMPTS: Record<string, string> = {
  "demolir": "Levante todas as áreas de demolição (m²), incluindo paredes, pisos e forros a demolir. Identifique cada item com localização.",
  "medida": "Extraia todas as medidas e cotas do projeto. Liste ambientes com suas dimensões (largura x comprimento), áreas e perímetros.",
  "hidraulic": "Levante tubulações por diâmetro e material, conexões, registros, válvulas e equipamentos sanitários. Separe por sistema (água fria, esgoto, pluvial).",
  "eletric": "Levante pontos elétricos (iluminação, TUGs, TUEs), circuitos, eletrodutos por diâmetro e fiação por seção. Identifique quadros.",
  "forro": "Levante áreas de forro por tipo (gesso, PVC, mineral) e por ambiente. Inclua iluminação embutida se visível.",
  "piso": "Levante áreas de piso por tipo de revestimento e por ambiente. Inclua rodapés, soleiras e peitoris.",
  "revestiment": "Levante áreas de revestimento de parede por tipo (cerâmico, porcelanato, pintura) e por ambiente. Desconte vãos de portas e janelas.",
  "ar condicionado": "Levante equipamentos de ar condicionado: tipo (split, multi-split, VRF), capacidade BTU, pontos de dreno e infraestrutura elétrica.",
};

function getSuggestedPrompt(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const [key, prompt] of Object.entries(SUGGESTED_PROMPTS)) {
    if (lower.includes(key)) return prompt;
  }
  return null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// --- Run History Item ---
function RunCard({
  run,
  projectId,
  fileId,
}: {
  run: {
    id: string;
    prompt: string;
    summary: string | null;
    items: ExtractedItem[];
    needs_review: Array<{ item: string; motivo: string }>;
    status: string;
    error_message: string | null;
    created_at: string;
  };
  projectId: string;
  fileId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<ExtractedItem[]>(() =>
    (run.items || []).map((i: any) => ({ ...i, selected: true }))
  );
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const selectedCount = items.filter((i) => i.selected).length;

  function toggleItem(idx: number) {
    setItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, selected: !item.selected } : item
    ));
  }

  function toggleAll(selected: boolean) {
    setItems((prev) => prev.map((i) => ({ ...i, selected })));
  }

  async function saveToSpreadsheet() {
    const toSave = items.filter((i) => i.selected);
    if (toSave.length === 0) { toast.error("Selecione ao menos um item"); return; }
    setSaving(true);
    try {
      const rows = toSave.map((item, idx) => ({
        project_id: projectId,
        disciplina: item.disciplina || "arquitetonico",
        item_code: String(idx + 1).padStart(2, "0"),
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        calculo_memorial: item.memorial_calculo || "",
        origem_prancha: fileId,
        origem_ambiente: item.ambiente || "",
        confidence: item.confidence ?? 0.7,
        needs_review: (item.confidence ?? 0.7) < 0.7,
        created_by: "usuario",
      }));
      const { error } = await supabase.from("ob_quantitativos").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} itens salvos na planilha`);
      queryClient.invalidateQueries({ queryKey: ["quantitativos", projectId] });
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  const isError = run.status === "error";

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Run header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground">{formatDate(run.created_at)}</span>
        {isError ? (
          <Badge variant="destructive" className="text-[10px] px-1 py-0">erro</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            {items.length} itens
          </Badge>
        )}
        {run.needs_review?.length > 0 && (
          <AlertTriangle className="h-3 w-3 text-orange-500" />
        )}
        <span className="flex-1 text-xs truncate text-muted-foreground italic">
          {run.prompt.slice(0, 60)}...
        </span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="border-t">
          {/* Prompt */}
          <div className="px-3 py-2 bg-primary/5">
            <p className="text-xs font-medium text-muted-foreground mb-1">Prompt:</p>
            <p className="text-xs">{run.prompt}</p>
          </div>

          {/* Error */}
          {isError && (
            <div className="px-3 py-2 bg-red-50 text-red-700 text-xs">
              {run.error_message}
            </div>
          )}

          {/* Summary */}
          {run.summary && (
            <div className="px-3 py-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">Resumo:</p>
              <p className="text-xs whitespace-pre-wrap">{run.summary}</p>
            </div>
          )}

          {/* Needs review */}
          {run.needs_review?.length > 0 && (
            <div className="px-3 py-2 border-t bg-orange-50">
              <p className="text-xs font-medium text-orange-700 mb-1">
                Itens para revisão ({run.needs_review.length}):
              </p>
              {run.needs_review.map((r, i) => (
                <p key={i} className="text-xs text-orange-600">
                  • {r.item}: {r.motivo}
                </p>
              ))}
            </div>
          )}

          {/* Items table */}
          {items.length > 0 && (
            <>
              <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/30">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => toggleAll(true)}>
                    Todos
                  </Button>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => toggleAll(false)}>
                    Nenhum
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="h-6 text-xs"
                  onClick={saveToSpreadsheet}
                  disabled={selectedCount === 0 || saving}
                >
                  {saving ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <TableProperties className="mr-1 h-3 w-3" />
                  )}
                  Salvar {selectedCount} na Planilha
                </Button>
              </div>
              <div className="max-h-[250px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr>
                      <th className="w-6 p-1"></th>
                      <th className="text-left p-1">Descrição</th>
                      <th className="text-right p-1 w-14">Qtd</th>
                      <th className="text-left p-1 w-10">Und</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`border-t cursor-pointer hover:bg-muted/30 ${!item.selected ? "opacity-40" : ""}`}
                        onClick={() => toggleItem(idx)}
                      >
                        <td className="p-1 text-center">
                          <input type="checkbox" checked={item.selected} readOnly className="rounded" />
                        </td>
                        <td className="p-1">
                          <div className="truncate" title={item.descricao}>{item.descricao}</div>
                          {item.memorial_calculo && (
                            <div className="text-[10px] text-muted-foreground truncate" title={item.memorial_calculo}>
                              {item.memorial_calculo}
                            </div>
                          )}
                        </td>
                        <td className="p-1 text-right font-mono">
                          {item.quantidade?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-1">{item.unidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- Main Panel ---
export function PdfProcessPanel({ file, projectId }: PdfProcessPanelProps) {
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { data: runs } = useProcessingRuns(file?.id ?? "");

  // Set suggested prompt when file changes
  useEffect(() => {
    if (!file) return;
    setInput(getSuggestedPrompt(file.filename) ?? "");
  }, [file?.id]);

  if (!file) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Selecione um PDF para processar
        </p>
      </div>
    );
  }

  async function handleSubmit() {
    if (!input.trim() || !file || processing) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-single-pdf", {
        body: { project_id: projectId, file_id: file.id, prompt: input.trim() },
      });
      if (error) throw error;
      toast.success(`${data.items_count} itens extraídos`);
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["processing-runs", file.id] });
      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
    } catch (err: any) {
      toast.error(`Erro: ${err.message || "Falha no processamento"}`);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-medium truncate">{file.filename}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {runs?.length ? `${runs.length} processamento(s)` : "Nenhum processamento ainda"}
        </p>
      </div>

      {/* Processing history */}
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-2">
          {(!runs || runs.length === 0) && !processing && (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Descreva o que levantar e clique enviar
              </p>
            </div>
          )}

          {processing && (
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando PDF com IA...
            </div>
          )}

          {runs?.map((run) => (
            <RunCard key={run.id} run={run as any} projectId={projectId} fileId={file.id} />
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            placeholder="O que levantar deste PDF? Ex: Levantar áreas de demolição..."
            className="min-h-[60px] text-sm resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={processing}
          />
          <Button
            size="icon"
            className="h-[60px] w-[60px]"
            onClick={handleSubmit}
            disabled={!input.trim() || processing}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
