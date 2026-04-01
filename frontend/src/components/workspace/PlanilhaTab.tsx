import { useProjectContext } from "@/contexts/ProjectContext";
import { BudgetTable } from "@/components/planilha/BudgetTable";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export function PlanilhaTab() {
  const { project } = useProjectContext();

  useRealtimeSubscription({
    table: "ob_orcamento_items",
    filterColumn: "project_id",
    filterValue: project?.id,
    queryKeys: [["orcamento", project?.id ?? ""]],
    enabled: !!project?.id,
  });

  if (!project) return null;

  return (
    <div className="h-full">
      <BudgetTable projectId={project.id} projectName={project.name} />
    </div>
  );
}
