import { Navigate } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, token } = useAuth();
  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading...</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

