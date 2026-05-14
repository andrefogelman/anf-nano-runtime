import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2, RotateCcw, Brain, Sparkles, Database, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useProjectFiles } from "@/hooks/usePdfJobs";
import {
  useAsk,
  useVisionQueries,
  type AskResult,
  type PerguntaPayload,
  type Provider,
  type ReasoningEffort,
  type VisionQueryRow,
} from "@/hooks/useAsk";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Separator } from "@/components/ui/separator";

type Variavel = { key: string; value: string };

const PERGUNTAS_SUGERIDAS: Record<string, string[]> = {
  arq: [
    "Qual a área construída total em m²?",
    "Quantas portas e quantas janelas, separadas por tipo?",
    "Qual o perímetro total de paredes a pintar internamente?",
  ],
  ele: [
    "Calcule o número de pontos de tomada",
    "Quantos pontos de luz por ambiente?",
    "Metros lineares de eletrodutos visíveis na planta",
  ],
  hid: [
    "Comprimento total de tubulação de água fria por diâmetro",
    "Quantos pontos de hidráulica (torneira, ducha, vaso)?",
  ],
  est: [
    "Volume total de concreto por elemento (pilar, viga, laje)",
    "Massa de aço total estimada",
  ],
};

interface Props {
  projectId: string;
}

export function PerguntaPlantaPanel({ projectId }: Props) {
  const { data: files, isLoading: loadingFiles } = useProjectFiles(projectId);
  const { data: queries } = useVisionQueries(projectId);
  const ask = useAsk();

  const pdfFiles = useMemo(
    () => (files ?? []).filter((f) => f.file_type === "pdf"),
    [files],
  );

  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [pergunta, setPergunta] = useState("");
  const [variaveis, setVariaveis] = useState<Variavel[]>([]);
  const [provider, setProvider] = useState<Provider>("openai");
  const [reasoning, setReasoning] = useState<ReasoningEffort>("medium");
  const [includeVerification, setIncludeVerification] = useState(false);
  const [resultado, setResultado] = useState<AskResult | null>(null);

  const selectedFile = pdfFiles.find((f) => f.id === selectedFileId);
  const sugestoes = selectedFile?.disciplina
    ? PERGUNTAS_SUGERIDAS[selectedFile.disciplina] ?? []
    : [];

  const adicionarVariavel = () =>
    setVariaveis((vs) => [...vs, { key: "", value: "" }]);
  const removerVariavel = (i: number) =>
    setVariaveis((vs) => vs.filter((_, idx) => idx !== i));
  const atualizarVariavel = (i: number, field: "key" | "value", v: string) =>
    setVariaveis((vs) =>
      vs.map((x, idx) => (idx === i ? { ...x, [field]: v } : x)),
    );

  const enviar = async () => {
    if (!selectedFile) {
      toast.error("Selecione um PDF antes");
      return;
    }
    if (pergunta.trim().length < 3) {
      toast.error("A pergunta deve ter ao menos 3 caracteres");
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

    const variaveisObj = variaveis
      .filter((v) => v.key.trim())
      .reduce<Record<string, string | number>>((acc, v) => {
        const num = Number(v.value);
        acc[v.key.trim()] = Number.isNaN(num) || v.value === "" ? v.value : num;
        return acc;
      }, {});

    const payload: PerguntaPayload = {
      pergunta: pergunta.trim(),
      variaveis: variaveisObj,
      provider,
      reasoning_effort: reasoning,
      include_verification: includeVerification,
      project_id: projectId,
    };

    try {
      const result = await ask.mutateAsync({
        pdf: pdfBlob,
        filename: selectedFile.filename,
        payload,
      });
      setResultado(result);
      toast.success(
        result.cache_hit
          ? "Resposta do cache (custo $0)"
          : `Resposta gerada em ${result.duracao_s}s — $${result.custo_usd.toFixed(4)}`,
      );
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  const reusarPergunta = (q: VisionQueryRow) => {
    setPergunta(q.pergunta);
    setVariaveis(
      Object.entries(q.variaveis ?? {}).map(([key, value]) => ({
        key,
        value: String(value),
      })),
    );
    setProvider((q.provider as Provider) ?? "openai");
    setReasoning((q.reasoning_effort as ReasoningEffort) ?? "medium");
  };

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_360px] gap-4 p-4">
      {/* Coluna esquerda: form + resultado */}
      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova pergunta sobre planta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pdf-select">PDF da planta</Label>
                <Select value={selectedFileId} onValueChange={setSelectedFileId}>
                  <SelectTrigger id="pdf-select" disabled={loadingFiles}>
                    <SelectValue
                      placeholder={
                        loadingFiles
                          ? "Carregando…"
                          : pdfFiles.length === 0
                            ? "Nenhum PDF no projeto"
                            : "Selecione um PDF"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {pdfFiles.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.filename}
                        {f.disciplina ? ` · ${f.disciplina}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Provedor / Reasoning</Label>
                <div className="flex gap-2">
                  <Select
                    value={provider}
                    onValueChange={(v) => setProvider(v as Provider)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI gpt-5</SelectItem>
                      <SelectItem value="claude">Claude Sonnet 4.6</SelectItem>
                      <SelectItem value="google">Gemini 3 Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={reasoning}
                    onValueChange={(v) => setReasoning(v as ReasoningEffort)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">low (rápido)</SelectItem>
                      <SelectItem value="medium">medium</SelectItem>
                      <SelectItem value="high">high (~60s)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {reasoning === "high" && (
                  <p className="text-xs text-yellow-700">
                    Pode estourar o limite de 60s no Vercel Hobby.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pergunta">Pergunta em pt-BR</Label>
              <Textarea
                id="pergunta"
                placeholder="Ex: calcule o número de pontos de tomada"
                rows={3}
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
              />
              {sugestoes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sugestoes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPergunta(s)}
                      className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs hover:bg-muted"
                    >
                      <Sparkles className="mr-1 inline h-3 w-3" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Variáveis (opcional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={adicionarVariavel}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
              {variaveis.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="chave (ex: pe_direito_m)"
                    value={v.key}
                    onChange={(e) => atualizarVariavel(i, "key", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="valor (ex: 2.60)"
                    value={v.value}
                    onChange={(e) =>
                      atualizarVariavel(i, "value", e.target.value)
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removerVariavel(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeVerification}
                  onChange={(e) => setIncludeVerification(e.target.checked)}
                />
                Incluir 2ª passada de verificação (mais preciso, mais caro)
              </label>
              <div className="flex-1" />
              <Button
                onClick={enviar}
                disabled={ask.isPending || !selectedFileId || pergunta.length < 3}
              >
                {ask.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando…
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Perguntar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {resultado && <ResultadoCard result={resultado} />}
      </div>

      {/* Coluna direita: histórico */}
      <Card className="flex min-h-0 flex-col">
        <CardHeader>
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="space-y-2 px-4 pb-4">
              {(queries ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma pergunta feita ainda neste projeto.
                </p>
              )}
              {(queries ?? []).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => reusarPergunta(q)}
                  className="w-full rounded-md border border-border p-2 text-left text-sm hover:bg-accent"
                >
                  <div className="line-clamp-2 font-medium">{q.pergunta}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {q.cache_hit && (
                      <Badge variant="secondary" className="h-5">
                        <Database className="mr-1 h-3 w-3" />
                        cache
                      </Badge>
                    )}
                    {q.resposta?.valor_numerico !== null && (
                      <span className="font-mono">
                        {q.resposta?.valor_numerico} {q.resposta?.unidade ?? ""}
                      </span>
                    )}
                    <span className="ml-auto">
                      {new Date(q.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <RotateCcw className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Clique para reusar
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultadoCard({ result }: { result: AskResult }) {
  const r = result.resposta;
  const conf = r.confianca ?? 0;
  const confColor =
    conf >= 0.7
      ? "bg-confidence-high/10 text-confidence-high border-confidence-high/30"
      : conf >= 0.4
        ? "bg-confidence-medium/10 text-confidence-medium border-confidence-medium/30"
        : "bg-confidence-low/10 text-confidence-low border-confidence-low/30";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Resposta</CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {result.cache_hit ? (
            <Badge variant="secondary">
              <Database className="mr-1 h-3 w-3" />
              cache hit
            </Badge>
          ) : (
            <>
              <span className="flex items-center">
                <Clock className="mr-1 h-3 w-3" />
                {result.duracao_s}s
              </span>
              <span className="flex items-center">
                <DollarSign className="mr-1 h-3 w-3" />
                {result.custo_usd.toFixed(4)}
              </span>
            </>
          )}
          <Badge variant="outline" className="font-mono">
            {result.provider}/{result.model}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-3">
          <div className="text-4xl font-bold tabular-nums">
            {r.valor_numerico === null ? "—" : r.valor_numerico}
          </div>
          {r.unidade && (
            <div className="text-xl text-muted-foreground">{r.unidade}</div>
          )}
          <div className="flex-1" />
          <Badge variant="outline" className={confColor}>
            confiança {(conf * 100).toFixed(0)}%
          </Badge>
        </div>

        <Separator />

        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Raciocínio
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {r.raciocinio || "—"}
          </p>
        </div>

        {r.observacoes && (
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Observações
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {r.observacoes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
