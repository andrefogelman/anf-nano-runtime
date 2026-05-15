import { useProjectContext } from "@/contexts/ProjectContext";
import { CotacoesPanel } from "@/components/planilha/CotacoesPanel";

export function CotacoesTab() {
  const { project } = useProjectContext();
  if (!project) return null;
  return <CotacoesPanel projectId={project.id} />;
}
