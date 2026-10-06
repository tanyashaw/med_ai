import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--slate-900)",
        color: "rgba(255,255,255,.5)",
        gap: 12,
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 14,
      }}>
        <span style={{
          display: "inline-block",
          width: 20, height: 20,
          border: "2px solid currentColor",
          borderRightColor: "transparent",
          borderRadius: "50%",
          animation: "spin .65s linear infinite",
        }} />
        Loading MedAI…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
