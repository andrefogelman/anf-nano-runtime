import { useProjectContext } from "@/contexts/ProjectContext";
import { ExtractStructuredPanel } from "@/components/planilha/ExtractStructuredPanel";

export function ExtracaoTab() {
  const { project } = useProjectContext();
  if (!project) return null;
  return <ExtractStructuredPanel projectId={project.id} />;
}
