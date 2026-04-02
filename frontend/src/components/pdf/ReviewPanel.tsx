import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import {
  useReviewItems,
  useResolveReview,
  useUnmappedBlocks,
  useUnclassifiedLayers,
  useConfirmBlockMapping,
  useConfirmLayerMapping,
} from "@/hooks/usePdfJobs";
import { confidenceLabel } from "@/lib/format";
import type { PdfPage } from "@/types/orcamento";

interface ReviewPanelProps {
  projectId: string;
  orgId?: string;
}

export function ReviewPanel({ projectId, orgId }: ReviewPanelProps) {
  const { data: reviewItems, isLoading } = useReviewItems(projectId);
  const resolveReview = useResolveReview();

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!reviewItems || reviewItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 className="mb-2 h-8 w-8 text-green-600" />
        <p className="text-sm font-medium">Nenhum item pendente de revisão</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          Itens para Revisão ({reviewItems.length})
        </h3>

        {reviewItems.map((item) => (
          <ReviewItemCard
            key={item.id}
            item={item}
            onResolve={(notes) =>
              resolveReview.mutate({ pageId: item.id, reviewNotes: notes })
            }
          />
        ))}

        {orgId && <UnmappedBlocksSection orgId={orgId} />}
        {orgId && <UnclassifiedLayersSection orgId={orgId} />}
      </div>
    </ScrollArea>
  );
}

function ReviewItemCard({
  item,
  onResolve,
}: {
  item: PdfPage;
  onResolve: (notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const conf = confidenceLabel(item.confidence ?? 0);

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">
            Prancha {item.prancha_id ?? "?"} — Pág. {item.page_number}
          </p>
          <p className="text-xs text-muted-foreground">{item.tipo ?? "Tipo desconhecido"}</p>
        </div>
        <Badge
          variant="outline"
          className={
            conf.color === "high"
              ? "text-confidence-high border-confidence-high"
              : conf.color === "medium"
                ? "text-confidence-medium border-confidence-medium"
                : "text-confidence-low border-confidence-low"
          }
        >
          {conf.text}
        </Badge>
      </div>

      {item.review_notes && (
        <p className="text-xs text-muted-foreground bg-muted rounded p-2">
          {item.review_notes}
        </p>
      )}

      <Textarea
        placeholder="Notas de revisão..."
        className="h-16 text-xs"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => onResolve(notes || "Confirmado pelo usuário")}
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Confirmar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => onResolve(notes || "Rejeitado — corrigir")}
        >
          <XCircle className="mr-1 h-3 w-3" />
          Corrigir
        </Button>
      </div>
    </div>
  );
}

// --- Unmapped Blocks Section ---

function UnmappedBlocksSection({ orgId }: { orgId: string }) {
  const { data: blocks } = useUnmappedBlocks(orgId);
  const confirmBlock = useConfirmBlockMapping();

  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        Blocos nao reconhecidos ({blocks.length})
      </h3>

      {blocks.map((block: { id: string; block_name: string; componente: string; disciplina: string; unidade: string }) => (
        <UnmappedBlockCard
          key={block.id}
          block={block}
          onConfirm={(componente, disciplina, unidade) =>
            confirmBlock.mutate({ id: block.id, componente, disciplina, unidade })
          }
        />
      ))}
    </div>
  );
}

function UnmappedBlockCard({
  block,
  onConfirm,
}: {
  block: { id: string; block_name: string; componente: string; disciplina: string; unidade: string };
  onConfirm: (componente: string, disciplina: string, unidade: string) => void;
}) {
  const [componente, setComponente] = useState(block.componente);
  const [disciplina, setDisciplina] = useState(block.disciplina);
  const [unidade, setUnidade] = useState(block.unidade);

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-sm font-medium">Bloco: {block.block_name}</p>
      <div className="grid grid-cols-3 gap-2">
        <Input
          placeholder="Componente"
          value={componente}
          onChange={(e) => setComponente(e.target.value)}
          className="text-xs h-8"
        />
        <Select value={disciplina} onValueChange={setDisciplina}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="arq">Arquitetonico</SelectItem>
            <SelectItem value="est">Estrutural</SelectItem>
            <SelectItem value="hid">Hidraulico</SelectItem>
            <SelectItem value="ele">Eletrico</SelectItem>
            <SelectItem value="geral">Geral</SelectItem>
          </SelectContent>
        </Select>
        <Select value={unidade} onValueChange={setUnidade}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="un">un</SelectItem>
            <SelectItem value="pt">pt</SelectItem>
            <SelectItem value="m">m</SelectItem>
            <SelectItem value="m2">m2</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => onConfirm(componente, disciplina, unidade)}
      >
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Confirmar Mapeamento
      </Button>
    </div>
  );
}

// --- Unclassified Layers Section ---

function UnclassifiedLayersSection({ orgId }: { orgId: string }) {
  const { data: layers } = useUnclassifiedLayers(orgId);
  const confirmLayer = useConfirmLayerMapping();

  if (!layers || layers.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-purple-600" />
        Layers nao classificados ({layers.length})
      </h3>

      {layers.map((layer: { id: string; layer_name: string; disciplina: string }) => (
        <UnclassifiedLayerCard
          key={layer.id}
          layer={layer}
          onConfirm={(disciplina) =>
            confirmLayer.mutate({ id: layer.id, disciplina })
          }
        />
      ))}
    </div>
  );
}

function UnclassifiedLayerCard({
  layer,
  onConfirm,
}: {
  layer: { id: string; layer_name: string; disciplina: string };
  onConfirm: (disciplina: string) => void;
}) {
  const [disciplina, setDisciplina] = useState(layer.disciplina);

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-sm font-medium">Layer: {layer.layer_name}</p>
      <p className="text-xs text-muted-foreground">Sugestao: {layer.disciplina}</p>
      <div className="flex gap-2">
        <Select value={disciplina} onValueChange={setDisciplina}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="arq">Arquitetonico</SelectItem>
            <SelectItem value="est">Estrutural</SelectItem>
            <SelectItem value="hid">Hidraulico</SelectItem>
            <SelectItem value="ele">Eletrico</SelectItem>
            <SelectItem value="cotas">Cotas</SelectItem>
            <SelectItem value="anotacoes">Anotacoes</SelectItem>
            <SelectItem value="ignorar">Ignorar</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onConfirm(disciplina)}
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Confirmar
        </Button>
      </div>
    </div>
  );
}
