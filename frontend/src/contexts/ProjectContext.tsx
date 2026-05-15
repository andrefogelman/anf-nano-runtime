import { createContext, useContext, useState, type ReactNode } from "react";
import type { Project } from "@/types/orcamento";

type WorkspaceTab = "planilha" | "pdfs" | "quantitativos" | "propostas" | "premissas" | "curva-abc" | "qa-plantas" | "extracao";

interface ProjectContextType {
  project: Project | null;
  setProject: (project: Project | null) => void;
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  activePranchaId: string | null;
  setActivePranchaId: (id: string | null) => void;
  activeItemId: string | null;
  setActiveItemId: (id: string | null) => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("planilha");
  const [activePranchaId, setActivePranchaId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <ProjectContext.Provider
      value={{
        project,
        setProject,
        activeTab,
        setActiveTab,
        activePranchaId,
        setActivePranchaId,
        activeItemId,
        setActiveItemId,
        chatOpen,
        setChatOpen,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjectContext must be used within ProjectProvider");
  return ctx;
}
