import { useState } from "react";
import {
  Loader2,
  Sparkles,
  Database,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { useSinapiMatch, type SinapiMatchResult } from "@/hooks/useSinapiMatch";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

interface Props {
  /** Pré-popula o input. Útil quando vem de uma linha da planilha. */
  initialDescricao?: string;
  /** Callback quando user clica em "Usar este" no resultado. */
  onSelect?: (result: SinapiMatchResult) => void;
}

export function SinapiMatchPanel({ initialDescricao = "", onSelect }: Props) {
  const [descricao, setDescricao] = useState(initialDescricao);
  const [uf, setUf] = useState("SP");
  const [topK, setTopK] = useState(10);
  const [rerankK, setRerankK] = useState(3);
  const match = useSinapiMatch();
  const result = match.data;

  const buscar = async () => {
    if (descricao.trim().length < 3) {
      toast.error("Descreva o serviço (≥3 caracteres)");
      return;
    }
    try {
      const r = await match.mutateAsync({
        descricao: descricao.trim(),
        uf,
        top_k: topK,
        rerank_k: rerankK,
      });
      if (r.n_candidates === 0) {
        toast.warning("Nenhum chunk SINAPI encontrado acima do threshold");
      } else {
        toast.success(
          `${r.n_returned} composição(ões) — ${r.n_candidates} candidatos`,
        );
      }
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Buscar SINAPI por descrição (vector + LLM rerank)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_120px_120px_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="sm-desc">Descrição do serviço</Label>
              <Input
                id="sm-desc"
                placeholder='ex: "demolição de paredes de alvenaria"'
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") buscar();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {UFS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>top_k</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value) || 10)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>rerank_k</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={rerankK}
                onChange={(e) => setRerankK(Number(e.target.value) || 3)}
              />
            </div>
            <Button
              onClick={buscar}
              disabled={match.isPending || descricao.trim().length < 3}
              className="self-end"
            >
              {match.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando…
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader>
          <CardTitle className="text-base">
            Resultados
            {result && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                · {result.n_returned} de {result.n_candidates} candidatos
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <ScrollArea className="flex-1">
            <div className="space-y-3 px-4 pb-4">
              {match.isPending && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Embedding + vector search + LLM rerank…
                </div>
              )}
              {match.isError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {match.error.message}
                </div>
              )}
              {!match.isPending && !match.isError && result?.results.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum resultado. Tente outra descrição ou diminua o threshold.
                </p>
              )}
              {result?.results.map((r, i) => (
                <ResultCard key={`${r.codigo}-${i}`} result={r} onSelect={onSelect} />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultCard({
  result,
  onSelect,
}: {
  result: SinapiMatchResult;
  onSelect?: (r: SinapiMatchResult) => void;
}) {
  const preco = result.preco;
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {result.codigo && (
              <Badge variant="outline" className="font-mono">
                {result.codigo}
              </Badge>
            )}
            <span className="font-medium">{result.titulo}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{result.motivo}</p>
          {result.source_file && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              <span className="font-mono">{result.source_file}</span>
              <Badge variant="secondary" className="ml-1 h-5">
                sim {(result.similarity * 100).toFixed(0)}%
              </Badge>
            </div>
          )}
        </div>
        {onSelect && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSelect(result)}
            disabled={!result.codigo}
          >
            Usar
          </Button>
        )}
      </div>

      {preco && (
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-md bg-muted/30 p-3 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Unidade</div>
            <div className="font-mono">{preco.unidade}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">UF · Data base</div>
            <div className="font-mono">
              {preco.uf} · {preco.data_base}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Sem desoneração</div>
            <div className="font-mono tabular-nums">
              R${" "}
              {preco.custo_sem_desoneracao !== null
                ? Number(preco.custo_sem_desoneracao).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Com desoneração</div>
            <div className="font-mono tabular-nums">
              R${" "}
              {preco.custo_com_desoneracao !== null
                ? Number(preco.custo_com_desoneracao).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </div>
          </div>
        </div>
      )}
      {result.codigo && !preco && (
        <div className="mt-2 flex items-center gap-1 text-xs text-yellow-700">
          <ExternalLink className="h-3 w-3" />
          Código não tem preço cadastrado para esta UF/data — verifique
          ob_sinapi_composicoes.
        </div>
      )}
      {!result.codigo && (
        <div className="mt-2 text-xs text-yellow-700">
          ⚠️ LLM não conseguiu extrair código numérico SINAPI deste chunk.
        </div>
      )}
    </div>
  );
}
