import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ProjectPage from "@/pages/ProjectPage";
import TcpoPage from "@/pages/TcpoPage";
import SinapiPage from "@/pages/SinapiPage";
import CadernosPage from "@/pages/CadernosPage";
import TcpoInsumosPage from "@/pages/TcpoInsumosPage";
import AssistenteSinapiPage from "@/pages/AssistenteSinapiPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="projetos/:projectId" element={<ProjectPage />} />
        <Route path="tcpo" element={<TcpoPage />} />
        <Route path="tcpo-insumos" element={<TcpoInsumosPage />} />
        <Route path="sinapi" element={<SinapiPage />} />
        <Route path="cadernos" element={<CadernosPage />} />
        <Route path="assistente-sinapi" element={<AssistenteSinapiPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
