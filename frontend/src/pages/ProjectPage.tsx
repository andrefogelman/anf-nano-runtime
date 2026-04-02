import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import { useOrcamentoItems, calculateFooterTotals } from "@/hooks/useOrcamento";
import { exportBudgetToExcel } from "@/lib/excel-export";
import { ProjectProvider, useProjectContext } from "@/contexts/ProjectContext";
import { WorkspaceTabs } from "@/components/workspace/WorkspaceTabs";
import { PlanilhaTab } from "@/components/workspace/PlanilhaTab";
import { PdfsTab } from "@/components/workspace/PdfsTab";
import { QuantitativosTab } from "@/components/workspace/QuantitativosTab";
import { PremissasTab } from "@/components/workspace/PremissasTab";
import { CurvaAbcTab } from "@/components/workspace/CurvaAbcTab";
import { AgentChatSidebar } from "@/components/chat/AgentChatSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Download,
  MessageSquare,
  Play,
  Loader2,
} from "lucide-react";
import { formatNumber } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

function ProjectPageInner() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading } = useProject(projectId!);
  const { data: orcamentoItems } = useOrcamentoItems(projectId!);
  const { setProject, activeTab, chatOpen, setChatOpen } = useProjectContext();
  const [processingBudget, setProcessingBudget] = useState(false);

  const startBudget = async () => {
    if (!projectId) return;
    setProcessingBudget(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-project", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      toast.success(data.message || "Processamento iniciado");
    } catch (err: any) {
      toast.error(`Erro: ${err.message || "Falha ao iniciar processamento"}`);
    } finally {
      setProcessingBudget(false);
    }
  };

  useEffect(() => {
    if (project) setProject(project);
    return () => setProject(null);
  }, [project, setProject]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-lg text-muted-foreground">Projeto não encontrado</p>
        <Link to="/">
          <Button variant="outline">Voltar ao Dashboard</Button>
        </Link>
      </div>
    );
  }

  const STATUS_LABELS: Record<string, string> = {
    draft: "Rascunho",
    processing: "Processando",
    review: "Revisão",
    done: "Concluído",
  };

  return (
    <div className="flex h-full">
      {/* Main workspace area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold">{project.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{project.tipo_obra}</span>
                <span>•</span>
                <span>{project.uf}{project.cidade ? ` — ${project.cidade}` : ""}</span>
                {project.area_total_m2 && (
                  <>
                    <span>•</span>
                    <span>{formatNumber(project.area_total_m2)} m²</span>
                  </>
                )}
              </div>
            </div>
            <Badge variant="outline">{STATUS_LABELS[project.status]}</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={startBudget}
              disabled={processingBudget || project.status === "processing"}
            >
              {processingBudget ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {processingBudget ? "Processando..." : "Iniciar Orçamento"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!orcamentoItems || !project) return;
                try {
                  const totals = calculateFooterTotals(orcamentoItems);
                  await exportBudgetToExcel(orcamentoItems, totals, project.name);
                  toast.success("Planilha exportada com sucesso");
                } catch {
                  toast.error("Erro ao exportar planilha");
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
            <Button
              variant={chatOpen ? "default" : "outline"}
              size="sm"
              onClick={() => setChatOpen(!chatOpen)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b px-6 py-2">
          <WorkspaceTabs />
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "planilha" && <PlanilhaTab />}
          {activeTab === "pdfs" && <PdfsTab />}
          {activeTab === "quantitativos" && <QuantitativosTab />}
          {activeTab === "premissas" && <PremissasTab />}
          {activeTab === "curva-abc" && <CurvaAbcTab />}
        </div>
      </div>

      {/* Agent chat sidebar */}
      {chatOpen && <AgentChatSidebar />}
    </div>
  );
}

export default function ProjectPage() {
  return (
    <ProjectProvider>
      <ProjectPageInner />
    </ProjectProvider>
  );
}
