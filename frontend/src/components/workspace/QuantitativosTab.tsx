import { useProjectContext } from "@/contexts/ProjectContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatNumber, confidenceLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import type { Quantitativo } from "@/types/orcamento";

export function QuantitativosTab() {
  const { project } = useProjectContext();

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

  if (!project) return null;

  const DISCIPLINA_LABELS: Record<string, string> = {
    arq: "Arquitetônico",
    est: "Estrutural",
    hid: "Hidráulico",
    ele: "Elétrico",
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        <h2 className="text-lg font-bold mb-4">Quantitativos Extraídos</h2>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !quantitativos || quantitativos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum quantitativo extraído ainda.</p>
            <p className="text-sm mt-1">Envie PDFs para que os agentes processem.</p>
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
                <TableHead className="w-20">Agente</TableHead>
                <TableHead className="w-20 text-center">Confiança</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quantitativos.map((q) => {
                const conf = confidenceLabel(q.confidence ?? 0);
                return (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {DISCIPLINA_LABELS[q.disciplina] ?? q.disciplina}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{q.item_code}</TableCell>
                    <TableCell>{q.descricao}</TableCell>
                    <TableCell className="text-center">{q.unidade}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(q.quantidade)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {q.origem_ambiente ?? q.origem_prancha ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{q.created_by ?? "—"}</TableCell>
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
