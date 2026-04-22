import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/login-hero.jpg";

export default function Login() {
  const [email, setEmail] = useState("alex.morgan@northwind-auto.com");
  const [password, setPassword] = useState("••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: "Welcome back", description: "Secure session established." });
      navigate("/");
    } catch {
      toast({ title: "Sign in failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: Form */}
      <div className="flex-1 flex flex-col px-6 py-8 lg:px-16 lg:py-12">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md animate-fade-in-up">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/5 px-3 py-1 mb-6">
                <Shield className="h-3.5 w-3.5 text-success" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-success">Secure Login · MFA Enabled</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Sign in to your DMW Robotics customer workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Work email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-10 transition-all focus-visible:shadow-glow"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <button type="button" className="text-xs font-medium text-accent hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10 pr-10 transition-all focus-visible:shadow-glow"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-accent hover:opacity-90 transition-all shadow-elev-md hover:shadow-glow group"
              >
                {loading ? "Signing in…" : (
                  <>
                    Sign in to portal
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>

              <div className="flex items-center gap-3 pt-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Enterprise SSO</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button type="button" variant="outline" className="w-full h-11 font-medium">
                Continue with SAML SSO
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-8">
              Protected by SOC 2 Type II controls.{" "}
              <a className="text-accent hover:underline" href="#">Privacy</a> ·{" "}
              <a className="text-accent hover:underline" href="#">Terms</a>
            </p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          © {new Date().getFullYear()} DMW Robotics, Inc. All rights reserved.
        </p>
      </div>

      {/* Right: Visual */}
      <div className="hidden lg:block flex-1 relative overflow-hidden bg-primary">
        <img
          src={heroImage}
          alt="DMW Robotics industrial robotic arm"
          className="absolute inset-0 h-full w-full object-cover"
          width={1024}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/40 to-accent/30 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-glow" />

        <div className="relative h-full flex flex-col justify-end p-12 text-primary-foreground">
          <div className="max-w-md animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 backdrop-blur px-3 py-1 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Customer Portal · v2.4</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight leading-tight">
              Precision engineering, transparent execution.
            </h2>
            <p className="mt-3 text-sm text-primary-foreground/80 leading-relaxed">
              Track every milestone, document, and engineering conversation in one secure workspace —
              built for the teams shipping the next generation of automation.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { v: "200+", l: "Cells delivered" },
                { v: "99.97%", l: "Uptime SLA" },
                { v: "24/7", l: "Engineering support" },
              ].map((s) => (
                <div key={s.l} className="border-l-2 border-primary-glow/60 pl-3">
                  <p className="text-xl font-bold">{s.v}</p>
                  <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
