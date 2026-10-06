import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminAuditPage } from "./pages/AdminAuditPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { CaseWorkspacePage } from "./pages/CaseWorkspacePage";
import { CasesPage } from "./pages/CasesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { NewCasePage } from "./pages/NewCasePage";
import { OrgPage } from "./pages/OrgPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/cases" element={<CasesPage />} />
              <Route path="/cases/new" element={<NewCasePage />} />
              <Route path="/cases/:id" element={<CaseWorkspacePage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/audit" element={<AdminAuditPage />} />
              <Route path="/admin/org" element={<OrgPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
