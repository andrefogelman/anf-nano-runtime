import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectContext } from "@/contexts/ProjectContext";
import { Table2, FileText, Calculator, Settings2, BarChart3, Receipt, Brain } from "lucide-react";

const TABS = [
  { value: "planilha" as const, label: "Planilha", icon: Table2 },
  { value: "pdfs" as const, label: "Arquivos", icon: FileText },
  { value: "qa-plantas" as const, label: "Q&A Plantas", icon: Brain },
  { value: "quantitativos" as const, label: "Quantitativos", icon: Calculator },
  { value: "propostas" as const, label: "Propostas", icon: Receipt },
  { value: "premissas" as const, label: "Premissas", icon: Settings2 },
  { value: "curva-abc" as const, label: "Curva ABC", icon: BarChart3 },
];

export function WorkspaceTabs() {
  const { activeTab, setActiveTab } = useProjectContext();

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
      <TabsList className="h-10">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
