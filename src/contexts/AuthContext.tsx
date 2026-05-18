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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // ✅ No useNavigate here — AuthProvider can now safely live outside BrowserRouter

  // ── On mount: restore session from stored access token ──────────────────
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

  // ── Login — just sets state, caller handles navigation ──────────────────
  const login = useCallback(async (email: string, password: string) => {
    await authService.login(email, password);
    const profile = await authService.getProfile();
    setUser(profile);
    // ✅ Removed: navigate("/", { replace: true })
    //    → call navigate() in your Login page component after awaiting login()
  }, []);

  // ── Logout — just clears state, caller handles navigation ───────────────
  const logout = useCallback(async () => {
    const refresh = localStorage.getItem("refresh");
    const access  = localStorage.getItem("access");

    if (refresh) {
      try {
        const { default: api } = await import("@/lib/api");
        await api.post(
          "/auth/logout/",
          { refresh },
          { headers: { Authorization: `Bearer ${access}` } },
        );
      } catch {
        // Server unreachable or already blacklisted — still clear locally
      }
    }

    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
    // ✅ Removed: navigate("/login", { replace: true })
    //    → call navigate() in your logout handler after awaiting logout()
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}