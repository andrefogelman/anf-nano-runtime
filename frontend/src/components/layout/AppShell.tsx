import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, HardHat, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Projetos", icon: LayoutDashboard },
  { to: "/tcpo", label: "Base TCPO", icon: Database },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-sidebar">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <HardHat className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">OrcaBot</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t p-3">
          <div className="flex items-center justify-between">
            <span className="truncate text-xs text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
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
