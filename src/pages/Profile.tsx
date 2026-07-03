import {
  Mail, Building2, Briefcase, LogOut,
  Bell, KeyRound, ChevronRight, Moon, Sun, User
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";   // ← Added

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        checked ? "border-indigo-500 bg-indigo-500" : "border-border bg-muted"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
          checked && "translate-x-4"
        )}
      />
    </button>
  );
}

function SectionHeader({ label, index }: { label: string; index: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] font-bold text-indigo-500/60 tabular-nums">{index}</span>
      <span className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-bold uppercase tracking-[.22em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export default function Profile() {
  const { user, logoutAll } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();                    // ← Added

  const [prefs, setPrefs] = useState({ weekly: true });
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const initials  = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();
  const fullName  = `${user.first_name} ${user.last_name}`.trim();
  const roleLabel = user.role?.replace(/_/g, " ") ?? "";

  const handleSignOutAll = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      toast({
        title: "Signing out from all devices...",
        description: "Please wait...",
      });

      await logoutAll();

      toast({
        title: "Signed out successfully",
        description: "You have been logged out from all devices.",
      });

      // Force redirect to login
      navigate("/login", { replace: true });

    } catch (error) {
      console.error(error);
      toast({
        title: "Sign out failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <div className="mb-1.5 flex items-center gap-2.5">
            <div className="h-0.5 w-5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
            <span className="text-[11px] font-bold uppercase tracking-[.2em] text-indigo-500">
              Account Settings
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none">Profile</h1>
          <p className="text-muted-foreground mt-1 text-[15px]">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px]">
          {/* Left Column */}
          <div className="space-y-10">
            {/* Identity Section */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start gap-5">
                <div className="relative flex-shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {initials || <User className="h-6 w-6" />}
                  </div>
                </div>

                <div className="flex-1 pt-1">
                  <h2 className="text-2xl font-black tracking-tight leading-none text-foreground">
                    {fullName}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {roleLabel}
                    </span>
                    {user.company && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-[13px] font-medium text-muted-foreground">
                          {user.company}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button className="mt-1 rounded-xl border border-border px-4 py-2 text-[13px] font-semibold text-muted-foreground hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Edit Profile
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: Mail,      label: "Email",   value: user.email },
                  { icon: Building2, label: "Company", value: user.company || "—" },
                  { icon: Briefcase, label: "Role",    value: roleLabel || "—" },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white dark:bg-slate-900">
                      <f.icon className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-indigo-500 transition-colors" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/50">{f.label}</p>
                      <p className="mt-0.5 truncate text-[13px] font-semibold text-foreground">{f.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Notifications */}
            <section>
              <SectionHeader label="Notifications" index="01" />
              <div className="mt-4 rounded-2xl border border-border bg-card shadow-sm divide-y divide-border overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50 dark:bg-slate-800">
                    <Bell className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-foreground">Weekly digest</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Summary every Monday morning</p>
                  </div>
                  <Toggle
                    checked={prefs.weekly}
                    onChange={(v) => setPrefs(s => ({ ...s, weekly: v }))}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-10">
            {/* Security */}
            <section>
              <SectionHeader label="Security" index="02" />
              <div className="mt-4 rounded-2xl border border-border bg-card shadow-sm divide-y divide-border overflow-hidden">
                <div className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50 dark:bg-slate-800">
                    <KeyRound className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-foreground">Password</p>
                    <p className="text-[12px] text-muted-foreground mt-1">Last changed 30 days ago</p>
                  </div>
                  <button className="flex items-center gap-0.5 text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors mt-0.5">
                    Change <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-start gap-4 px-5 py-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50 dark:bg-slate-800">
                    <Briefcase className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-foreground">Active session</p>
                    <p className="text-[12px] text-muted-foreground mt-1">Current device · This browser</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[12px] font-semibold text-emerald-500">Live</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Appearance */}
            <section>
              <SectionHeader label="Appearance" index="03" />
              <div className="mt-4 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50 dark:bg-slate-800">
                    {theme === "dark" ? (
                      <Moon className="h-4 w-4 text-indigo-500" strokeWidth={1.5} />
                    ) : (
                      <Sun className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-foreground">Dark mode</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      Currently {theme === "dark" ? "on" : "off"}
                    </p>
                  </div>
                  <Toggle checked={theme === "dark"} onChange={toggleTheme} />
                </div>
              </div>
            </section>

            {/* Sign Out */}
            <div className="pt-4">
              <button
                onClick={handleSignOutAll}
                disabled={isSigningOut}
                className="group flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5 px-4 py-3 text-[13px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <LogOut className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.75} />
                {isSigningOut ? "Signing out from all devices..." : "Sign out of all devices"}
              </button>
              <p className="text-center text-[11px] text-muted-foreground/60 mt-3">
                This will terminate all your active sessions across every device
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}