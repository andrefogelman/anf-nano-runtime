import { useState, useCallback, useMemo } from "react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatNumber, confidenceLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import type { Quantitativo } from "@/types/orcamento";

const DISCIPLINA_LABELS: Record<string, string> = {
  arq: "Arquitetônico",
  est: "Estrutural",
  hid: "Hidráulico",
  ele: "Elétrico",
  geral: "Geral",
};

function EditableCell({
  value,
  type = "text",
  align = "left",
  mono = false,
  onSave,
}: {
  value: string | number;
  type?: "text" | "number";
  align?: "left" | "right" | "center";
  mono?: boolean;
  onSave: (val: string | number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  function commit() {
    setEditing(false);
    const newVal = type === "number" ? parseFloat(draft.replace(",", ".")) || 0 : draft;
    if (newVal !== value) onSave(newVal);
  }

  if (editing) {
    return (
      <input
        autoFocus
        className={`w-full border-0 bg-transparent outline-none ring-1 ring-primary/40 rounded px-1 py-0.5 text-xs ${
          align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
        } ${mono ? "font-mono" : ""}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <span
      className={`cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 block ${mono ? "font-mono" : ""}`}
      onDoubleClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      title="Duplo-clique para editar"
    >
      {type === "number" ? formatNumber(value as number) : value}
    </span>
  );
}

export function QuantitativosTab() {
  const { project } = useProjectContext();
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: quantitativos, isLoading } = useQuery({
    queryKey: ["quantitativos", project?.id],
    queryFn: async (): Promise<Quantitativo[]> => {
      const { data, error } = await supabase
        .from("ob_quantitativos")
        .select("*")
        .eq("project_id", project!.id)
        .order("disciplina", { ascending: true })
        .order("item_code", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!project?.id,
  });

  const updateRow = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: string | number }) => {
      const { error } = await supabase
        .from("ob_quantitativos")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quantitativos", project?.id] });
    },
    onError: () => toast.error("Erro ao salvar alteração"),
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ob_quantitativos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quantitativos", project?.id] });
      toast.success("Item excluído");
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  const handleUpdate = useCallback(
    (id: string, field: string, value: string | number) => {
      updateRow.mutate({ id, field, value });
    },
    [updateRow],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteRow.mutate(id);
      setConfirmDeleteId(null);
    },
    [deleteRow],
  );

  const filteredQuantitativos = useMemo(() => {
    if (!quantitativos) return [];
    if (!searchQuery) return quantitativos;
    const q = searchQuery.toLowerCase();
    return quantitativos.filter(
      (item) =>
        item.descricao.toLowerCase().includes(q) ||
        item.item_code.toLowerCase().includes(q) ||
        item.disciplina.toLowerCase().includes(q) ||
        (item.origem_ambiente ?? "").toLowerCase().includes(q) ||
        item.unidade.toLowerCase().includes(q),
    );
  }, [quantitativos, searchQuery]);

  if (!project) return null;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-fit">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-bold">Quantitativos Extraídos</h2>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar item..."
              className="h-8 pl-8 pr-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !quantitativos || quantitativos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum quantitativo extraído ainda.</p>
            <p className="text-sm mt-1">Envie arquivos para que os agentes processem.</p>
          </div>
        ) : filteredQuantitativos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum resultado para "{searchQuery}"</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Disciplina</TableHead>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-16 text-center">Unid</TableHead>
                <TableHead className="w-20 text-right">Qtde</TableHead>
                <TableHead className="w-24">Origem</TableHead>
                <TableHead className="w-20 text-center">Confiança</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuantitativos.map((q) => {
                const conf = confidenceLabel(q.confidence ?? 0);
                const isConfirming = confirmDeleteId === q.id;

                return (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {DISCIPLINA_LABELS[q.disciplina] ?? q.disciplina}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{q.item_code}</TableCell>
                    <TableCell>
                      <EditableCell
                        value={q.descricao}
                        onSave={(val) => handleUpdate(q.id, "descricao", val)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <EditableCell
                        value={q.unidade}
                        align="center"
                        onSave={(val) => handleUpdate(q.id, "unidade", val)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCell
                        value={q.quantidade}
                        type="number"
                        align="right"
                        mono
                        onSave={(val) => handleUpdate(q.id, "quantidade", val)}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {q.origem_ambiente ?? q.origem_prancha ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {q.needs_review ? (
                        <AlertTriangle className="mx-auto h-4 w-4 text-orange-600" />
                      ) : (
                        <span
                          className={`text-xs font-medium ${
                            conf.color === "high"
                              ? "text-confidence-high"
                              : conf.color === "medium"
                                ? "text-confidence-medium"
                                : "text-confidence-low"
                          }`}
                        >
                          {Math.round((q.confidence ?? 0) * 100)}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isConfirming ? (
                        <div className="flex items-center gap-1">
                          <button
                            className="h-6 px-2 text-[10px] font-medium rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(q.id)}
                          >
                            Sim
                          </button>
                          <button
                            className="h-6 px-2 text-[10px] font-medium rounded border hover:bg-muted"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 transition-colors"
                          title="Excluir item"
                          onClick={() => setConfirmDeleteId(q.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </ScrollArea>
  );
}
