import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

import { AppLayout } from "@/components/AppLayout";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Milestones from "./pages/Milestones";
import Documents from "./pages/Documents";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AdminUsersPage    from "./pages/admin/Adminuserpage";
import AdminProjectsPage from "./pages/admin/Admiprojectpage";


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
  const { user, loading } = useAuth();          // ← consuming loading state
  if (loading) return <AuthLoader />;           // ← wait before deciding
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoader />;           // ← same here
  return user ? <Navigate to="/" replace /> : <>{children}</>;
};

// ---------------------------------------------------------------------------
// Reusable layout wrapper
// ---------------------------------------------------------------------------

const Protected = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />

              <Route path="/"              element={<Protected><Dashboard /></Protected>} />
              <Route path="/milestones"    element={<Protected><Milestones /></Protected>} />
              <Route path="/documents"     element={<Protected><Documents /></Protected>} />
              <Route path="/tickets"       element={<Protected><Tickets /></Protected>} />
              <Route path="/tickets/:id"   element={<Protected><TicketDetail /></Protected>} />
              <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
              <Route path="/profile"       element={<Protected><Profile /></Protected>} />
              <Route path="/admin/users"      element={<Protected><AdminUsersPage /></Protected>} />
<Route path="/admin/projects"   element={<Protected><AdminProjectsPage /></Protected>} />


              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;