import { useState } from "react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { PropostaUploader } from "@/components/propostas/PropostaUploader";
import { PropostaList } from "@/components/propostas/PropostaList";
import { PropostaItemsTable } from "@/components/propostas/PropostaItemsTable";
import type { Proposta } from "@/types/orcamento";

export function PropostasTab() {
  const { project } = useProjectContext();
  const [selected, setSelected] = useState<Proposta | null>(null);

  useRealtimeSubscription({
    table: "ob_propostas",
    filterColumn: "project_id",
    filterValue: project?.id,
    queryKeys: [["propostas", project?.id ?? ""]],
    enabled: !!project?.id,
  });

  if (!project) return null;

  return (
    <div className="flex h-full">
      {/* Left panel: upload + list */}
      <div className="w-80 shrink-0 border-r p-4 space-y-4 overflow-auto">
        <PropostaUploader projectId={project.id} />
        <PropostaList
          projectId={project.id}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      </div>

      {/* Right panel: items table */}
      <div className="flex-1 p-4 overflow-auto">
        {selected ? (
          <PropostaItemsTable
            propostaId={selected.id}
            propostaStatus={selected.status}
            projectId={project.id}
            fornecedor={selected.fornecedor}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Selecione uma proposta para ver os itens extraídos
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
