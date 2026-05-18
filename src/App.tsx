import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

import { AppLayout } from "@/components/AppLayout";

import Dashboard        from "./pages/Dashboard";
import Login            from "./pages/Login";
import Milestones       from "./pages/Milestones";
import Documents        from "./pages/Documents";
import Tickets          from "./pages/Tickets";
import TicketDetail     from "./pages/TicketDetail";
import Notifications    from "./pages/Notifications";
import Profile          from "./pages/Profile";
import NotFound         from "./pages/NotFound";
import AdminUsersPage    from "./pages/admin/Adminuserpage";
import AdminProjectsPage from "./pages/admin/Admiprojectpage";
import AdminCompanyPage  from "./pages/admin/AdminCompanyPage";   // ← new


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ---------------------------------------------------------------------------
// Full-screen spinner shown while AuthContext checks the stored token
// ---------------------------------------------------------------------------

const AuthLoader = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-black">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      <p className="text-white/50 text-sm">Loading…</p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Guards — must live inside BrowserRouter + AuthProvider
// ---------------------------------------------------------------------------

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoader />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoader />;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
};

// Admin-only guard — redirects non-admins to dashboard
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoader />;
  if (!user) return <Navigate to="/login" replace />;
  const isAdmin   = user.role === "admin";
  const isManager = user.role === "project_manager";
  if (!isAdmin && !isManager) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// ---------------------------------------------------------------------------
// Reusable layout wrappers
// ---------------------------------------------------------------------------

const Protected = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const Admin = ({ children }: { children: ReactNode }) => (
  <AdminRoute>
    <AppLayout>{children}</AppLayout>
  </AdminRoute>
);

// ---------------------------------------------------------------------------
// App — AuthProvider is OUTSIDE BrowserRouter so context is available
//       before the router begins rendering any routes.
// ---------------------------------------------------------------------------

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <Routes>
              {/* Public */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />

              {/* Protected (any authenticated user) */}
              <Route path="/"              element={<Protected><Dashboard /></Protected>} />
              <Route path="/milestones"    element={<Protected><Milestones /></Protected>} />
              <Route path="/documents"     element={<Protected><Documents /></Protected>} />
              <Route path="/tickets"       element={<Protected><Tickets /></Protected>} />
              <Route path="/tickets/:id"   element={<Protected><TicketDetail /></Protected>} />
              <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
              <Route path="/profile"       element={<Protected><Profile /></Protected>} />

              {/* Admin / Project Manager only */}
              <Route path="/admin/users"    element={<Admin><AdminUsersPage /></Admin>} />
              <Route path="/admin/projects" element={<Admin><AdminProjectsPage /></Admin>} />
              <Route path="/admin/company"  element={<Admin><AdminCompanyPage /></Admin>} />   {/* ← new */}

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;