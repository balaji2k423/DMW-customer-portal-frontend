import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Milestones from "./pages/Milestones";
import Documents from "./pages/Documents";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <AppLayout><Dashboard /></AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/milestones"
                element={
                  <RequireAuth>
                    <AppLayout><Milestones /></AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/documents"
                element={
                  <RequireAuth>
                    <AppLayout><Documents /></AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/tickets"
                element={
                  <RequireAuth>
                    <AppLayout><Tickets /></AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/tickets/:id"
                element={
                  <RequireAuth>
                    <AppLayout><TicketDetail /></AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/notifications"
                element={
                  <RequireAuth>
                    <AppLayout><Notifications /></AppLayout>
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <AppLayout><Profile /></AppLayout>
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
