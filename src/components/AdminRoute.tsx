import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function AdminRoute() {
  const { user } = useAuth();

  if (!user) {
    // Not logged in at all — redirect to login
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    // Logged in but not admin — redirect to dashboard
    return <Navigate to="/" replace />;
  }

  // Admin confirmed — render child routes
  return <Outlet />;
}