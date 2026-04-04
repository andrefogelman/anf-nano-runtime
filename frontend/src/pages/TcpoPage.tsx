import { useState, useCallback, useEffect, useRef, useMemo, type KeyboardEvent } from "react";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
// ResizablePanel removed — tree is now in sidebar
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronDown, ChevronRight, Database, Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL, parseBRNumber } from "@/lib/format";
import {
  useTcpoSearch,
  useCreateComposicao,
  useUpdateComposicao,
  useDeleteComposicao,
  TCPO_CATEGORIES,
  type TcpoComposicao,
} from "@/hooks/useTcpo";
import { TcpoComposicaoDetail } from "@/components/tcpo/TcpoComposicaoDetail";
// CategoryTree removed — tree is in sidebar

// ── Inline Editable Cell ────────────────────────────────────────
function EditableCell({
  value,
  onSave,
  isEditing,
  type = "text",
  className,
}: {
  value: string;
  onSave: (val: string) => void;
  isEditing: boolean;
  type?: "text" | "currency";
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const commit = () => {
    if (draft !== value) onSave(draft);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") {
      setDraft(value);
    }
  };

  if (!isEditing) return <span className={className}>{type === "currency" ? formatBRL(Number(value)) : value}</span>;

  return (
    <Input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKey}
      className={cn("h-7 text-sm", className)}
    />
  );
}

// ── New Composition Form ────────────────────────────────────────
function NewComposicaoRow({ onCancel }: { onCancel: () => void }) {
  const createMutation = useCreateComposicao();
  const [form, setForm] = useState({
    codigo: "",
    descricao: "",
    unidade: "",
    categoria: TCPO_CATEGORIES[0] as string,
    custo_sem_taxas: "0",
    custo_com_taxas: "0",
  });

  const save = () => {
    if (!form.codigo.trim() || !form.descricao.trim()) return;
    createMutation.mutate(
      {
        codigo: form.codigo.trim(),
        descricao: form.descricao.trim(),
        unidade: form.unidade.trim() || "un",
        categoria: form.categoria,
        regiao: "Sao Paulo",
        data_precos: "",
        ls_percentual: 0,
        bdi_percentual: 0,
        custo_sem_taxas: parseBRNumber(form.custo_sem_taxas),
        custo_com_taxas: parseBRNumber(form.custo_com_taxas),
      },
      { onSuccess: onCancel },
    );
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") onCancel();
  };

  return (
    <TableRow className="bg-blue-50/60 dark:bg-blue-950/20">
      <TableCell colSpan={6} className="p-0">
        <div className="flex w-full items-center gap-2 px-4 py-2">
          <span className="w-8 shrink-0" />
          <Input
            placeholder="Codigo"
            value={form.codigo}
            onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
            onKeyDown={handleKey}
            className="w-28 h-7 text-xs font-mono"
            autoFocus
          />
          <Input
            placeholder="Descricao"
            value={form.descricao}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            onKeyDown={handleKey}
            className="flex-1 h-7 text-sm"
          />
          <Input
            placeholder="Un"
            value={form.unidade}
            onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
            onKeyDown={handleKey}
            className="w-16 h-7 text-sm text-center"
          />
          <Input
            placeholder="R$ Sem Taxas"
            value={form.custo_sem_taxas}
            onChange={(e) => setForm((f) => ({ ...f, custo_sem_taxas: e.target.value }))}
            onKeyDown={handleKey}
            className="w-28 h-7 text-sm text-right font-mono"
          />
          <Input
            placeholder="R$ Com Taxas"
            value={form.custo_com_taxas}
            onChange={(e) => setForm((f) => ({ ...f, custo_com_taxas: e.target.value }))}
            onKeyDown={handleKey}
            className="w-28 h-7 text-sm text-right font-mono"
          />
          <Button size="sm" variant="ghost" onClick={save} disabled={createMutation.isPending}>
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export default function TcpoPage() {
  const location = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // Read category from URL params (set by sidebar tree) — reactive via useLocation
  const selectedCategory = useMemo(() => {
    return new URLSearchParams(location.search).get("cat");
  }, [location.search]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TcpoComposicao | null>(null);
  const [showNewRow, setShowNewRow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const updateMutation = useUpdateComposicao();
  const deleteMutation = useDeleteComposicao();

  // Debounce search input
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [searchInput]);

  // Escape exits edit mode
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingId(null);
        setShowNewRow(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data: composicoes, isLoading } = useTcpoSearch(debouncedQuery, selectedCategory);
  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const saveField = (comp: TcpoComposicao, field: keyof TcpoComposicao, rawValue: string) => {
    const numericFields = ["custo_sem_taxas", "custo_com_taxas"];
    const value = numericFields.includes(field) ? parseBRNumber(rawValue) : rawValue;
    if (value === comp[field]) return;
    updateMutation.mutate({ id: comp.id, [field]: value });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        if (expandedId === deleteTarget.id) setExpandedId(null);
        if (editingId === deleteTarget.id) setEditingId(null);
      },
    });
  };

  const headerText = selectedCategory || "Todos os serviços";

  return (
    <div className="flex flex-col h-full">
          <div className="flex flex-col h-full">
            {/* Orange header bar */}
            <div className="bg-orange-500 text-white px-6 py-2.5 flex items-center gap-3">
              <span className="font-semibold text-sm">
                Mostrando: {headerText}
              </span>
              {composicoes && (
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  {composicoes.length} resultado{composicoes.length !== 1 ? "s" : ""}
                </Badge>
              )}
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { setShowNewRow(true); setEditingId(null); }}
                  className="gap-1.5 h-7 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova Composicao
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b">
              <div className="relative max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar composicao por descricao..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Results table */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : composicoes && composicoes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="w-28">Codigo</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="w-16">Un</TableHead>
                      <TableHead className="w-36 text-right">R$ Sem Taxas</TableHead>
                      <TableHead className="w-36 text-right">R$ Com Taxas</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showNewRow && (
                      <NewComposicaoRow onCancel={() => setShowNewRow(false)} />
                    )}
                    {composicoes.map((comp) => {
                      const isExpanded = expandedId === comp.id;
                      const isEditing = editingId === comp.id;
                      return (
                        <TableRow
                          key={comp.id}
                          className={cn("group", isEditing && "ring-2 ring-blue-400/50 bg-blue-50/30 dark:bg-blue-950/10")}
                        >
                          <TableCell colSpan={7} className="p-0">
                            {/* Row content */}
                            <div className="flex w-full items-center px-4 py-3">
                              {/* Expand toggle */}
                              <button
                                onClick={() => toggleExpand(comp.id)}
                                className="w-8 shrink-0 hover:bg-muted/50 rounded p-0.5"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>

                              {/* Codigo */}
                              <span className="w-28 shrink-0">
                                <EditableCell
                                  value={comp.codigo}
                                  onSave={(v) => saveField(comp, "codigo", v)}
                                  isEditing={isEditing}
                                  className="font-mono text-xs"
                                />
                              </span>

                              {/* Descricao */}
                              <span className="flex-1 pr-4">
                                <EditableCell
                                  value={comp.descricao}
                                  onSave={(v) => saveField(comp, "descricao", v)}
                                  isEditing={isEditing}
                                  className="truncate"
                                />
                              </span>

                              {/* Unidade */}
                              <span className="w-16 shrink-0 text-center">
                                <EditableCell
                                  value={comp.unidade}
                                  onSave={(v) => saveField(comp, "unidade", v)}
                                  isEditing={isEditing}
                                  className="text-muted-foreground"
                                />
                              </span>

                              {/* Custo sem taxas */}
                              <span className="w-36 shrink-0 text-right">
                                <EditableCell
                                  value={String(comp.custo_sem_taxas)}
                                  onSave={(v) => saveField(comp, "custo_sem_taxas", v)}
                                  isEditing={isEditing}
                                  type="currency"
                                  className="font-mono"
                                />
                              </span>

                              {/* Custo com taxas */}
                              <span className="w-36 shrink-0 text-right">
                                <EditableCell
                                  value={String(comp.custo_com_taxas)}
                                  onSave={(v) => saveField(comp, "custo_com_taxas", v)}
                                  isEditing={isEditing}
                                  type="currency"
                                  className="font-mono font-semibold text-primary"
                                />
                              </span>

                              {/* Action buttons */}
                              <span className="w-20 shrink-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(isEditing ? null : comp.id);
                                  }}
                                  title={isEditing ? "Parar edicao" : "Editar"}
                                >
                                  {isEditing ? (
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  ) : (
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(comp);
                                  }}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </span>
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && (
                              <TcpoComposicaoDetail composicao={comp} />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Database className="h-12 w-12 mb-4 opacity-40" />
                  <p className="text-lg font-medium">Nenhuma composicao encontrada</p>
                  <p className="text-sm">Tente alterar os filtros ou a busca.</p>
                </div>
              )}
            </div>
          </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir composicao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a composicao{" "}
              <strong>{deleteTarget?.codigo}</strong> — {deleteTarget?.descricao}?
              Todos os insumos associados tambem serao excluidos.
              Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
