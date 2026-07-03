import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authService } from "@/services/auth";

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company: string;
  phone: string;
  mfa_enabled: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;   // ← New
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      setLoading(false);
      return;
    }

    authService
      .getProfile()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await authService.login(email, password);
    const profile = await authService.getProfile();
    setUser(profile);
  }, []);

  // Regular logout (current session only)
  const logout = useCallback(async () => {
    const refresh = localStorage.getItem("refresh");
    const access  = localStorage.getItem("access");

    if (refresh && access) {
      try {
        const { default: api } = await import("@/lib/api");
        await api.post("/auth/logout/", { refresh }, {
          headers: { Authorization: `Bearer ${access}` },
        });
      } catch {
        // Ignore errors — still clear local data
      }
    }

    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  }, []);

  // NEW: Logout from ALL devices
  const logoutAll = useCallback(async () => {
    const access = localStorage.getItem("access");

    if (!access) return;

    try {
      const { default: api } = await import("@/lib/api");
      // This endpoint should invalidate ALL refresh tokens for the user
      await api.post("/auth/logout-all/", {}, {
        headers: { Authorization: `Bearer ${access}` },
      });
    } catch (error) {
      console.error("Logout all failed on server:", error);
      // Still proceed with local cleanup
    }

    // Always clear local storage
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, logoutAll }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}