import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import logo from "@/assets/dmwlogo.png";
import heroImage from "@/assets/login-hero.jpg";

export default function Login() {
  const [email, setEmail]               = useState(() => localStorage.getItem("remembered_email") ?? "");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(() => !!localStorage.getItem("remembered_email"));
  const [loading, setLoading]           = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    // Persist or clear the remembered email
    if (rememberMe) {
      localStorage.setItem("remembered_email", email);
    } else {
      localStorage.removeItem("remembered_email");
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        "Invalid email or password.";
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden">

      {/* Background Image */}
      <img
        src={heroImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover scale-105"
      />

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80" />

      {/* Orange Glow Effects */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-orange-500/20 blur-[120px]" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-orange-400/10 blur-[120px]" />

      {/* Center Content */}
      <div className="relative z-10 flex items-center justify-center h-full px-4">

        {/* Glass Card */}
        <div className="w-full max-w-md p-8 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logo} alt="DMW Robotics" className="h-12" />
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-semibold text-white text-center">
            Welcome Back
          </h2>
          <p className="text-sm text-white/70 text-center mb-6">
            Sign in to continue
          </p>

          <form onSubmit={handleSubmit} autoComplete="on" className="space-y-5">

            {/* Email */}
            <div>
              <Label className="text-white/80">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                <Input
                  type="email"
                  autoComplete="email"
                  className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-orange-400 focus-visible:ring-0"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label className="text-white/80">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pl-10 pr-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-orange-400 focus-visible:ring-0"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-white/60 hover:text-white transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={rememberMe}
                onClick={() => setRememberMe(v => !v)}
                className={`
                  relative h-5 w-5 shrink-0 rounded-md border transition-all duration-200
                  ${rememberMe
                    ? "bg-orange-500 border-orange-500 shadow-sm shadow-orange-500/40"
                    : "bg-white/10 border-white/25 hover:border-white/50"
                  }
                `}
              >
                {/* Checkmark */}
                <svg
                  viewBox="0 0 10 8"
                  className={`absolute inset-0 m-auto h-3 w-3 text-white transition-all duration-200 ${rememberMe ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="1 4 3.5 6.5 9 1" />
                </svg>
              </button>
              <span
                className="text-sm text-white/70 select-none cursor-pointer"
                onClick={() => setRememberMe(v => !v)}
              >
                Remember me
              </span>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-medium transition-all shadow-lg shadow-orange-500/30"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>

          </form>

          {/* Footer */}
          <p className="text-xs text-white/50 text-center mt-6">
            © {new Date().getFullYear()} DMW Robotics
          </p>

        </div>
      </div>
    </div>
  );
}