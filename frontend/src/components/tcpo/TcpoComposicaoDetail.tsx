import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import {
  useTcpoInsumos,
  useCreateInsumo,
  useUpdateInsumo,
  useDeleteInsumo,
  type TcpoComposicao,
  type TcpoInsumo,
} from "@/hooks/useTcpo";
import { formatBRL, formatNumber, formatPercent, parseBRNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const CLASSE_STYLES: Record<string, { label: string; className: string }> = {
  MOD: { label: "MOD", className: "bg-blue-100 text-blue-800 border-blue-200" },
  MAT: { label: "MAT", className: "bg-green-100 text-green-800 border-green-200" },
  EQH: { label: "EQH", className: "bg-orange-100 text-orange-800 border-orange-200" },
};

function ClasseBadge({ classe }: { classe: string }) {
  const style = CLASSE_STYLES[classe] ?? { label: classe, className: "" };
  return <Badge className={style.className}>{style.label}</Badge>;
}

// ── Inline editable cell for insumos ────────────────────────────
function InsumoEditableCell({
  value,
  onSave,
  type = "text",
  className,
  align = "left",
}: {
  value: string;
  onSave: (val: string) => void;
  type?: "text" | "number";
  className?: string;
  align?: "left" | "right" | "center";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { setDraft(value); setEditing(false); }
  };

  if (!editing) {
    return (
      <span
        className={cn("cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 px-1 py-0.5 rounded transition-colors", className)}
        onDoubleClick={() => setEditing(true)}
        title="Duplo clique para editar"
      >
        {type === "number" && !isNaN(Number(value))
          ? (Number(value) >= 1 ? formatBRL(Number(value)) : formatNumber(Number(value), 4))
          : value}
      </span>
    );
  }

  return (
    <Input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKey}
      className={cn("h-6 text-xs px-1", align === "right" && "text-right", className)}
    />
  );
}

// ── New Insumo Row ──────────────────────────────────────────────
function NewInsumoRow({
  composicaoId,
  onCancel,
}: {
  composicaoId: string;
  onCancel: () => void;
}) {
  const createMutation = useCreateInsumo();
  const [form, setForm] = useState({
    codigo: "",
    descricao: "",
    unidade: "un",
    classe: "MAT" as "MOD" | "MAT" | "EQH",
    coeficiente: "1",
    preco_unitario: "0",
  });

  const total = Number(form.coeficiente || 0) * Number(form.preco_unitario || 0);

  const save = () => {
    if (!form.codigo.trim() || !form.descricao.trim()) return;
    createMutation.mutate(
      {
        composicao_id: composicaoId,
        codigo: form.codigo.trim(),
        descricao: form.descricao.trim(),
        unidade: form.unidade.trim(),
        classe: form.classe,
        coeficiente: Number(form.coeficiente) || 0,
        preco_unitario: parseBRNumber(form.preco_unitario),
        total,
        consumo: Number(form.coeficiente) || 0,
      },
      { onSuccess: onCancel },
    );
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") onCancel();
  };

  return (
    <TableRow className="bg-blue-50/60 dark:bg-blue-950/20">
      <TableCell>
        <Input
          placeholder="Código"
          value={form.codigo}
          onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
          onKeyDown={handleKey}
          className="h-6 text-xs font-mono"
          autoFocus
        />
      </TableCell>
      <TableCell>
        <Input
          placeholder="Descrição"
          value={form.descricao}
          onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
          onKeyDown={handleKey}
          className="h-6 text-xs"
        />
      </TableCell>
      <TableCell>
        <Input
          placeholder="Un"
          value={form.unidade}
          onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
          onKeyDown={handleKey}
          className="h-6 text-xs w-14"
        />
      </TableCell>
      <TableCell>
        <select
          value={form.classe}
          onChange={(e) => setForm((f) => ({ ...f, classe: e.target.value as "MOD" | "MAT" | "EQH" }))}
          onKeyDown={handleKey}
          className="h-6 text-xs border rounded px-1 bg-background"
        >
          <option value="MOD">MOD</option>
          <option value="MAT">MAT</option>
          <option value="EQH">EQH</option>
        </select>
      </TableCell>
      <TableCell>
        <Input
          value={form.coeficiente}
          onChange={(e) => setForm((f) => ({ ...f, coeficiente: e.target.value }))}
          onKeyDown={handleKey}
          className="h-6 text-xs text-right w-20"
        />
      </TableCell>
      <TableCell>
        <Input
          value={form.preco_unitario}
          onChange={(e) => setForm((f) => ({ ...f, preco_unitario: e.target.value }))}
          onKeyDown={handleKey}
          className="h-6 text-xs text-right w-24"
        />
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        {formatBRL(total)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={save} disabled={createMutation.isPending}>
            <Check className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onCancel}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Main Detail Component ───────────────────────────────────────
interface Props {
  composicao: TcpoComposicao;
}

export function TcpoComposicaoDetail({ composicao }: Props) {
  const { data: insumos, isLoading } = useTcpoInsumos(composicao.id);
  const updateInsumo = useUpdateInsumo();
  const deleteInsumo = useDeleteInsumo();
  const [showNewRow, setShowNewRow] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TcpoInsumo | null>(null);

  const totals = useMemo(() => {
    if (!insumos) return { mod: 0, mat: 0, eqh: 0, total: 0 };
    const mod = insumos.filter((i) => i.classe === "MOD").reduce((s, i) => s + i.total, 0);
    const mat = insumos.filter((i) => i.classe === "MAT").reduce((s, i) => s + i.total, 0);
    const eqh = insumos.filter((i) => i.classe === "EQH").reduce((s, i) => s + i.total, 0);
    return { mod, mat, eqh, total: mod + mat + eqh };
  }, [insumos]);

  const saveInsumoField = (insumo: TcpoInsumo, field: string, rawValue: string) => {
    const numericFields = ["coeficiente", "preco_unitario", "consumo"];
    const value = numericFields.includes(field) ? parseBRNumber(rawValue) : rawValue;
    if (value === (insumo as unknown as Record<string, unknown>)[field]) return;

    // Auto-recalculate total when coeficiente or preco_unitario changes
    const updates: Record<string, unknown> = { [field]: value };
    if (field === "coeficiente") {
      updates.total = (value as number) * insumo.preco_unitario;
      updates.consumo = value;
    } else if (field === "preco_unitario") {
      updates.total = insumo.coeficiente * (value as number);
    }

    updateInsumo.mutate({
      id: insumo.id,
      composicao_id: insumo.composicao_id,
      ...updates,
    } as { id: string; composicao_id: string } & Partial<TcpoInsumo>);
  };

  const confirmDeleteInsumo = () => {
    if (!deleteTarget) return;
    deleteInsumo.mutate(
      { id: deleteTarget.id, composicao_id: deleteTarget.composicao_id },
      { onSuccess: () => setDeleteTarget(null) },
    );
  };

  return (
    <div className="space-y-4 bg-muted/30 p-4 rounded-b-lg border-x border-b">
      {/* Composition header info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Código:</span>{" "}
          <span className="font-medium">{composicao.codigo}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Unidade:</span>{" "}
          <span className="font-medium">{composicao.unidade}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Região:</span>{" "}
          <span className="font-medium">{composicao.regiao}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Data preços:</span>{" "}
          <span className="font-medium">{composicao.data_precos}</span>
        </div>
        <div>
          <span className="text-muted-foreground">LS:</span>{" "}
          <span className="font-medium">{formatPercent(composicao.ls_percentual)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">BDI:</span>{" "}
          <span className="font-medium">{formatPercent(composicao.bdi_percentual)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Sem taxas:</span>{" "}
          <span className="font-semibold">{formatBRL(composicao.custo_sem_taxas)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Com taxas:</span>{" "}
          <span className="font-semibold text-primary">{formatBRL(composicao.custo_com_taxas)}</span>
        </div>
      </div>

      {/* Insumos table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : insumos && insumos.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-16">Un</TableHead>
                <TableHead className="w-16">Classe</TableHead>
                <TableHead className="w-24 text-right">Coef.</TableHead>
                <TableHead className="w-28 text-right">Preço Unit.</TableHead>
                <TableHead className="w-28 text-right">Total</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insumos.map((insumo: TcpoInsumo) => (
                <TableRow key={insumo.id} className="group">
                  <TableCell className="font-mono text-xs">
                    <InsumoEditableCell
                      value={insumo.codigo}
                      onSave={(v) => saveInsumoField(insumo, "codigo", v)}
                    />
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <InsumoEditableCell
                      value={insumo.descricao}
                      onSave={(v) => saveInsumoField(insumo, "descricao", v)}
                    />
                  </TableCell>
                  <TableCell>
                    <InsumoEditableCell
                      value={insumo.unidade}
                      onSave={(v) => saveInsumoField(insumo, "unidade", v)}
                    />
                  </TableCell>
                  <TableCell>
                    <ClasseBadge classe={insumo.classe} />
                  </TableCell>
                  <TableCell className="text-right">
                    <InsumoEditableCell
                      value={String(insumo.coeficiente)}
                      onSave={(v) => saveInsumoField(insumo, "coeficiente", v)}
                      type="number"
                      align="right"
                      className="font-mono"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <InsumoEditableCell
                      value={String(insumo.preco_unitario)}
                      onSave={(v) => saveInsumoField(insumo, "preco_unitario", v)}
                      type="number"
                      align="right"
                      className="font-mono"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatBRL(insumo.total)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setDeleteTarget(insumo)}
                      title="Excluir insumo"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {showNewRow && (
                <NewInsumoRow
                  composicaoId={composicao.id}
                  onCancel={() => setShowNewRow(false)}
                />
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    <ClasseBadge classe="MOD" /> Mão de obra
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatBRL(totals.mod)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell colSpan={6} className="text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    <ClasseBadge classe="MAT" /> Materiais
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatBRL(totals.mat)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell colSpan={6} className="text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    <ClasseBadge classe="EQH" /> Equipamentos
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatBRL(totals.eqh)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell colSpan={6} className="text-right text-base font-bold">
                  Total geral
                </TableCell>
                <TableCell className="text-right font-mono text-base font-bold text-primary">
                  {formatBRL(totals.total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>

          {/* Add insumo button */}
          {!showNewRow && (
            <div className="flex justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewRow(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar insumo
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum insumo encontrado para esta composição.
          </p>
          {!showNewRow ? (
            <div className="flex justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewRow(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar insumo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-16">Un</TableHead>
                  <TableHead className="w-16">Classe</TableHead>
                  <TableHead className="w-24 text-right">Coef.</TableHead>
                  <TableHead className="w-28 text-right">Preço Unit.</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <NewInsumoRow
                  composicaoId={composicao.id}
                  onCancel={() => setShowNewRow(false)}
                />
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Delete Insumo Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir insumo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o insumo{" "}
              <strong>{deleteTarget?.codigo}</strong> — {deleteTarget?.descricao}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteInsumo}
              disabled={deleteInsumo.isPending}
            >
              {deleteInsumo.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
