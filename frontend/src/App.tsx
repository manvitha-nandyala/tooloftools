import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth-context";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AdminPage } from "./pages/AdminPage";
import { CatalogPage } from "./pages/CatalogPage";
import { LoginPage } from "./pages/LoginPage";
import { McpGuidePage } from "./pages/McpGuidePage";
import { McpPlaygroundPage } from "./pages/McpPlaygroundPage";
import { MetricsPage } from "./pages/MetricsPage";
import { OidcCallbackPage } from "./pages/OidcCallbackPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ToolDetailPage } from "./pages/ToolDetailPage";
import { ToolFormPage } from "./pages/ToolFormPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/oidc-callback" element={<OidcCallbackPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/catalog" replace />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="tools/new" element={<ToolFormPage mode="create" />} />
          <Route path="tools/:toolId/edit" element={<ToolFormPage mode="edit" />} />
          <Route path="tools/:toolId" element={<ToolDetailPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="integrations/mcp" element={<McpGuidePage />} />
          <Route path="playground" element={<McpPlaygroundPage />} />
          <Route path="metrics" element={<MetricsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
