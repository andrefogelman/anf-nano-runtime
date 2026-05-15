import { useState } from "react";
import { Loader2, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";

import {
  useCotacoes,
  useCreateCotacao,
  useDeleteCotacao,
  useUpdateCotacao,
  type CotacaoMercado,
} from "@/hooks/useCotacoes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Props {
  projectId: string;
}

const EMPTY_FORM = {
  descricao: "",
  unidade: "",
  fornecedor: "",
  valor_unitario: "",
  validade: "",
  observacoes: "",
};

export function CotacoesPanel({ projectId }: Props) {
  const { data: cotacoes, isLoading } = useCotacoes(projectId);
  const create = useCreateCotacao();
  const update = useUpdateCotacao();
  const del = useDeleteCotacao();

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (c: CotacaoMercado) => {
    setEditingId(c.id);
    setForm({
      descricao: c.descricao,
      unidade: c.unidade,
      fornecedor: c.fornecedor ?? "",
      valor_unitario: String(c.valor_unitario),
      validade: c.validade ?? "",
      observacoes: c.observacoes ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const submit = async () => {
    if (!form.descricao.trim() || !form.unidade.trim() || !form.valor_unitario.trim()) {
      toast.error("Descrição, unidade e valor são obrigatórios");
      return;
    }
    const valor = Number(form.valor_unitario.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0) {
      toast.error("Valor unitário inválido");
      return;
    }

    const payload = {
      project_id: projectId,
      descricao: form.descricao.trim(),
      unidade: form.unidade.trim(),
      fornecedor: form.fornecedor.trim() || null,
      valor_unitario: valor,
      validade: form.validade || null,
      observacoes: form.observacoes.trim() || null,
    };

    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, patch: payload });
        toast.success("Cotação atualizada");
      } else {
        await create.mutateAsync(payload);
        toast.success("Cotação criada");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  const remove = async (c: CotacaoMercado) => {
    if (!confirm(`Apagar cotação "${c.descricao}"?`)) return;
    try {
      await del.mutateAsync({ id: c.id, project_id: c.project_id });
      toast.success("Cotação removida");
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  return (
    <div className="grid h-full grid-cols-[400px_minmax(0,1fr)] gap-4 p-4">
      {/* Form esquerda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? "Editar cotação" : "Nova cotação de mercado"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cot-desc">Descrição *</Label>
            <Input
              id="cot-desc"
              placeholder="ex: Cimento CP-II 50kg"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cot-un">Unidade *</Label>
              <Input
                id="cot-un"
                placeholder="ex: sc, m3, m2"
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cot-val">Valor unitário (R$) *</Label>
              <Input
                id="cot-val"
                type="text"
                inputMode="decimal"
                placeholder="ex: 42,50"
                value={form.valor_unitario}
                onChange={(e) =>
                  setForm({ ...form, valor_unitario: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cot-forn">Fornecedor</Label>
              <Input
                id="cot-forn"
                placeholder="opcional"
                value={form.fornecedor}
                onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cot-val-data">Validade</Label>
              <Input
                id="cot-val-data"
                type="date"
                value={form.validade}
                onChange={(e) => setForm({ ...form, validade: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cot-obs">Observações</Label>
            <Textarea
              id="cot-obs"
              rows={2}
              placeholder="opcional"
              value={form.observacoes}
              onChange={(e) =>
                setForm({ ...form, observacoes: e.target.value })
              }
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={submit}
              disabled={create.isPending || update.isPending}
              className="flex-1"
            >
              {create.isPending || update.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : editingId ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={cancelEdit}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista direita */}
      <Card className="flex min-h-0 flex-col">
        <CardHeader>
          <CardTitle className="text-base">
            Cotações cadastradas
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {cotacoes ? `(${cotacoes.length})` : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <ScrollArea className="flex-1">
            <div className="space-y-2 px-4 pb-4">
              {isLoading && (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              )}
              {!isLoading && cotacoes?.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma cotação cadastrada ainda.
                </p>
              )}
              {cotacoes?.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{c.descricao}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="font-mono">
                        {c.unidade}
                      </Badge>
                      <span className="font-mono tabular-nums">
                        R${" "}
                        {Number(c.valor_unitario).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      {c.fornecedor && <span>· {c.fornecedor}</span>}
                      {c.validade && (
                        <span>
                          · validade{" "}
                          {new Date(c.validade).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                    {c.observacoes && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.observacoes}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(c)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(c)}
                      disabled={del.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
