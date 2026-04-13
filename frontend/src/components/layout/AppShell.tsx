import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LogOut,
  HardHat,
  Database,
  BookOpen,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTcpoCategoryCounts, TCPO_CATEGORIES } from "@/hooks/useTcpo";
import { useSinapiCounts } from "@/hooks/useSinapi";

export function AppShell() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [tcpoOpen, setTcpoOpen] = useState(location.pathname.startsWith("/tcpo"));
  const [sinapiOpen, setSinapiOpen] = useState(location.pathname.startsWith("/sinapi"));

  const { data: tcpoCounts } = useTcpoCategoryCounts();
  const { data: sinapiCounts } = useSinapiCounts();

  const tcpoTotal = tcpoCounts ? Object.values(tcpoCounts).reduce((a, b) => a + b, 0) : 0;
  const sinapiInsumos = (sinapiCounts?.material || 0) + (sinapiCounts?.mao_obra || 0) + (sinapiCounts?.equipamento || 0);
  const sinapiComposicoes = sinapiCounts?.composicao || 0;
  const sinapiTotal = sinapiInsumos + sinapiComposicoes;

  // Get selected category from URL search params
  const params = new URLSearchParams(location.search);
  const selectedTcpoCat = params.get("cat");
  const selectedSinapiFilter = params.get("filter");

  function navTcpo(cat?: string) {
    navigate(cat ? `/tcpo?cat=${encodeURIComponent(cat)}` : "/tcpo");
  }

  function navSinapi(filter?: string) {
    navigate(filter ? `/sinapi?filter=${encodeURIComponent(filter)}` : "/sinapi");
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-sidebar flex-shrink-0">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <HardHat className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">OrcaBot</span>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="space-y-0.5 p-2">
            {/* Projetos */}
            <Link
              to="/"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === "/"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <FolderOpen className="h-4 w-4" />
              Projetos
            </Link>

            {/* Base TCPO — expandable tree */}
            <div>
              <button
                onClick={() => { setTcpoOpen(!tcpoOpen); if (!tcpoOpen) navTcpo(); }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  location.pathname.startsWith("/tcpo")
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                {tcpoOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <Database className="h-4 w-4" />
                <span className="flex-1 text-left">Base TCPO</span>
                {tcpoTotal > 0 && (
                  <span className="text-[10px] text-muted-foreground">{tcpoTotal}</span>
                )}
              </button>

              {tcpoOpen && (
                <div className="ml-5 mt-0.5 space-y-0.5 border-l pl-2">
                  {/* All */}
                  <button
                    onClick={() => navTcpo()}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors",
                      !selectedTcpoCat && location.pathname === "/tcpo"
                        ? "bg-orange-100 text-orange-800 font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>Todos os serviços</span>
                    <span className="text-[10px]">{tcpoTotal}</span>
                  </button>
                  {TCPO_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => navTcpo(cat)}
                      className={cn(
                        "flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors",
                        selectedTcpoCat === cat
                          ? "bg-orange-100 text-orange-800 font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span className="truncate">{cat}</span>
                      <span className="text-[10px] flex-shrink-0 ml-1">{tcpoCounts?.[cat] ?? 0}</span>
                    </button>
                  ))}
                  {/* Insumos sub-tree */}
                  <div className="mt-2 pt-1 border-t border-border/50">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground px-2">Insumos</span>
                    {(["Materiais", "Mão de obra", "Equipamentos"] as const).map((insCat) => (
                      <button
                        key={insCat}
                        onClick={() => navigate(`/tcpo-insumos?cat=${encodeURIComponent(insCat)}`)}
                        className={cn(
                          "flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors",
                          location.pathname === "/tcpo-insumos" && new URLSearchParams(location.search).get("cat") === insCat
                            ? "bg-orange-100 text-orange-800 font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span>{insCat}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Base SINAPI — expandable tree */}
            <div>
              <button
                onClick={() => { setSinapiOpen(!sinapiOpen); if (!sinapiOpen) navSinapi(); }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  location.pathname.startsWith("/sinapi")
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                {sinapiOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <Database className="h-4 w-4" />
                <span className="flex-1 text-left">Base SINAPI</span>
                {sinapiTotal > 0 && (
                  <span className="text-[10px] text-muted-foreground">{sinapiTotal}</span>
                )}
              </button>

              {sinapiOpen && (
                <div className="ml-5 mt-0.5 space-y-0.5 border-l pl-2">
                  <button
                    onClick={() => navSinapi()}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors",
                      !selectedSinapiFilter && location.pathname === "/sinapi"
                        ? "bg-blue-100 text-blue-800 font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>Todos</span>
                    <span className="text-[10px]">{sinapiTotal}</span>
                  </button>
                  <button
                    onClick={() => navSinapi("insumo-material")}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors",
                      selectedSinapiFilter === "insumo-material"
                        ? "bg-blue-100 text-blue-800 font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>Insumos — Materiais</span>
                    <span className="text-[10px]">{sinapiCounts?.material ?? 0}</span>
                  </button>
                  <button
                    onClick={() => navSinapi("insumo-mao_obra")}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors",
                      selectedSinapiFilter === "insumo-mao_obra"
                        ? "bg-blue-100 text-blue-800 font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>Insumos — Mão de Obra</span>
                    <span className="text-[10px]">{sinapiCounts?.mao_obra ?? 0}</span>
                  </button>
                  <button
                    onClick={() => navSinapi("insumo-equipamento")}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors",
                      selectedSinapiFilter === "insumo-equipamento"
                        ? "bg-blue-100 text-blue-800 font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>Insumos — Equipamentos</span>
                    <span className="text-[10px]">{sinapiCounts?.equipamento ?? 0}</span>
                  </button>
                  <button
                    onClick={() => navSinapi("composicao")}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors",
                      selectedSinapiFilter === "composicao"
                        ? "bg-blue-100 text-blue-800 font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>Composições</span>
                    <span className="text-[10px]">{sinapiComposicoes}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Cadernos Técnicos */}
            <Link
              to="/cadernos"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === "/cadernos"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <BookOpen className="h-4 w-4" />
              Cadernos Técnicos
            </Link>

            {/* Assistente SINAPI */}
            <Link
              to="/assistente-sinapi"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === "/assistente-sinapi"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Assistente SINAPI
            </Link>
          </nav>
        </ScrollArea>

        {/* User footer */}
        <div className="border-t p-3">
          <div className="flex items-center justify-between">
            <span className="truncate text-xs text-muted-foreground">
              {user?.email}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Sair da conta</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
