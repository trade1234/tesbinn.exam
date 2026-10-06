import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { roleHome } from "./roleHome.js";

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Checking your session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return <Outlet />;
}

