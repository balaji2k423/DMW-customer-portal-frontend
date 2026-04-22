import { useNavigate } from "react-router-dom";
import { Mail, Building2, Briefcase, Shield, LogOut, Bell, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({ email: true, push: false, weekly: true });

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Account</p>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-1">Profile & preferences</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your DMW Robotics customer account.</p>
      </div>

      <Card className="card-elevated overflow-hidden">
        <div className="h-24 bg-gradient-hero relative">
          <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        </div>
        <CardContent className="p-6 -mt-12 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <Avatar className="h-20 w-20 ring-4 ring-background shadow-elev-md">
              <AvatarFallback className="bg-gradient-accent text-accent-foreground text-xl font-bold">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 sm:pb-2">
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.role} · {user.company}</p>
            </div>
            <div className="flex gap-2 sm:pb-2">
              <Button variant="outline" size="sm">Edit profile</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
            {[
              { icon: Mail, label: "Email", value: user.email },
              { icon: Building2, label: "Company", value: user.company },
              { icon: Briefcase, label: "Role", value: user.role },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                  <f.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                  <p className="text-sm font-semibold truncate mt-0.5">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Notification preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "email", icon: Mail, title: "Email updates", desc: "Milestone progress, ticket replies" },
              { key: "push", icon: Smartphone, title: "Push notifications", desc: "Real-time alerts on mobile" },
              { key: "weekly", icon: Bell, title: "Weekly digest", desc: "Summary every Monday morning" },
            ].map((p) => (
              <div key={p.key} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <p.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <Label htmlFor={p.key} className="text-sm font-semibold cursor-pointer">{p.title}</Label>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
                <Switch
                  id={p.key}
                  checked={prefs[p.key as keyof typeof prefs]}
                  onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Security & appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4 p-3 rounded-lg border border-success/20 bg-success/5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                <Shield className="h-4 w-4 text-success" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Multi-factor authentication</p>
                <p className="text-xs text-success">Active · Authenticator app</p>
              </div>
              <Button variant="outline" size="sm">Manage</Button>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-lg border border-border">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <span className="text-base">{theme === "dark" ? "🌙" : "☀️"}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Dark mode</p>
                <p className="text-xs text-muted-foreground">Easier on the eyes for late-night reviews</p>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>

            <div className="flex items-center gap-4 p-3 rounded-lg border border-border">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Briefcase className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Active session</p>
                <p className="text-xs text-muted-foreground">San Francisco · Chrome on macOS</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" /> Live
              </span>
            </div>

            <Button
              variant="outline"
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                logout();
                toast({ title: "Signed out", description: "Your session has ended securely." });
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out of all devices
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
