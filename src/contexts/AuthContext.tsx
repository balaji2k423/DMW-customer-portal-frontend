import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate              = useNavigate();

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
        // Token is expired / invalid — clear storage silently.
        // The api.ts interceptor will have already attempted a refresh;
        // if we reach here, both tokens are gone and the user must log in.
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    await authService.login(email, password);
    const profile = await authService.getProfile();
    setUser(profile);
    navigate("/", { replace: true });
  }, [navigate]);

  // ── Logout ───────────────────────────────────────────────────────────────
  // async so the server blacklist call completes before we clear state.
  // We do NOT call authService.logout() here because that does its own
  // window.location.href redirect which conflicts with React Router's
  // navigate(). Instead we inline the logic and use navigate().
  const logout = useCallback(async () => {
    const refresh = localStorage.getItem("refresh");
    const access  = localStorage.getItem("access");

    if (refresh) {
      try {
        // Blacklist the refresh token on the server
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
    navigate("/login", { replace: true });
  }, [navigate]);

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