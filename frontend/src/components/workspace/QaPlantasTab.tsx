import { useProjectContext } from "@/contexts/ProjectContext";
import { PerguntaPlantaPanel } from "@/components/chat/PerguntaPlantaPanel";

export function QaPlantasTab() {
  const { project } = useProjectContext();
  if (!project) return null;
  return <PerguntaPlantaPanel projectId={project.id} />;
}
