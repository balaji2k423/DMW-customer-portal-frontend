import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

// Full-screen spinner — same one used in App.tsx
const AuthLoader = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-black">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      <p className="text-white/50 text-sm">Loading…</p>
    </div>
  </div>
);

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  // Wait for the token-check to finish before deciding where to send the user.
  // Without this, the component renders with user=null and immediately
  // redirects to /login even when the session is valid.
  if (loading) return <AuthLoader />;

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}