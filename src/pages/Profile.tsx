import {
  Mail, Building2, Briefcase, Shield, LogOut,
  Bell, Smartphone, KeyRound, ChevronRight, Moon, Sun
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ─── tiny primitives ───────────────────────────────────────────── */

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
        checked
          ? "border-orange-500 bg-orange-500"
          : "border-border bg-muted"
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

function Dot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        active ? "bg-emerald-400" : "bg-muted-foreground/30"
      )}
    />
  );
}

/* ─── main component ─────────────────────────────────────────────── */

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({ email: true, push: false, weekly: true });

  if (!user) return null;

  const initials  = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();
  const fullName  = `${user.first_name} ${user.last_name}`.trim();
  const roleLabel = user.role?.replace(/_/g, " ") ?? "";

  const handleSignOut = async () => {
    toast({ title: "Signing out…", description: "Ending your session securely." });
    await logout();
  };

  return (
    <div className="min-h-screen bg-background font-mono">

      {/* ── top rule ─── */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-60" />

      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* ── eyebrow ─── */}
        <div className="mb-10 flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[.25em] text-orange-500">
            DMW Robotics
          </span>
          <span className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-[.2em] text-muted-foreground">
            Account / Profile
          </span>
        </div>

        {/* ── two-column layout ─── */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px]">

          {/* ══ LEFT COLUMN ═══════════════════════════════════════════ */}
          <div className="space-y-10">

            {/* identity block */}
            <section>
              <div className="flex items-start gap-5">

                {/* avatar */}
                <div className="relative flex-shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center border border-orange-500/30 bg-orange-500/5 text-xl font-bold text-orange-500">
                    {initials}
                  </div>
                  {/* corner accents */}
                  <span className="absolute -top-px -left-px h-2.5 w-2.5 border-t border-l border-orange-500" />
                  <span className="absolute -bottom-px -right-px h-2.5 w-2.5 border-b border-r border-orange-500" />
                </div>

                <div className="flex-1 pt-1">
                  <h1 className="text-2xl font-black uppercase tracking-tight text-foreground leading-none">
                    {fullName}
                  </h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[11px] uppercase tracking-[.18em] text-orange-500 font-semibold">
                      {roleLabel}
                    </span>
                    {user.company && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                          {user.company}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button className="mt-1 border border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:border-foreground hover:text-foreground transition-colors">
                  Edit
                </button>
              </div>

              {/* info strip */}
              <div className="mt-6 grid grid-cols-1 gap-px sm:grid-cols-3 border border-border">
                {[
                  { icon: Mail,      label: "Email",   value: user.email },
                  { icon: Building2, label: "Company", value: user.company || "—" },
                  { icon: Briefcase, label: "Role",    value: roleLabel || "—" },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="group flex items-center gap-3 bg-background px-4 py-3.5 hover:bg-muted/40 transition-colors"
                  >
                    <f.icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50 group-hover:text-orange-500 transition-colors" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-[.2em] text-muted-foreground/50">{f.label}</p>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-foreground">{f.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* notifications */}
            <section>
              <SectionHeader label="Notifications" index="01" />
              <div className="mt-4 border border-border divide-y divide-border">
                {[
                  { key: "email",  icon: Mail,       title: "Email updates",      desc: "Milestone progress & ticket replies" },
                  { key: "push",   icon: Smartphone, title: "Push notifications", desc: "Real-time alerts on mobile" },
                  { key: "weekly", icon: Bell,        title: "Weekly digest",      desc: "Summary every Monday morning" },
                ].map((p) => (
                  <div
                    key={p.key}
                    className="flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <p.icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground">{p.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</p>
                    </div>
                    <Toggle
                      checked={prefs[p.key as keyof typeof prefs]}
                      onChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* ══ RIGHT COLUMN ══════════════════════════════════════════ */}
          <div className="space-y-10">

            {/* security */}
            <section>
              <SectionHeader label="Security" index="02" />
              <div className="mt-4 border border-border divide-y divide-border">

                {/* 2FA */}
                <div className="flex items-start gap-4 px-4 py-4 hover:bg-muted/30 transition-colors">
                  <Shield className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground">Two-factor auth</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Dot active />
                      <span className="text-[11px] text-emerald-500 font-medium">Enabled</span>
                      <span className="text-[11px] text-muted-foreground">· Authenticator app</span>
                    </div>
                  </div>
                  <button className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                    Manage <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Password */}
                <div className="flex items-start gap-4 px-4 py-4 hover:bg-muted/30 transition-colors">
                  <KeyRound className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground">Password</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Last changed 30 days ago</p>
                  </div>
                  <button className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                    Change <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Session */}
                <div className="flex items-start gap-4 px-4 py-4">
                  <Briefcase className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground">Active session</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Current device · This browser</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-medium text-emerald-500">Live</span>
                  </div>
                </div>
              </div>
            </section>

            {/* appearance */}
            <section>
              <SectionHeader label="Appearance" index="03" />
              <div className="mt-4 border border-border">
                <div className="flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors">
                  {theme === "dark"
                    ? <Moon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
                    : <Sun  className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
                  }
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">Dark mode</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Currently {theme === "dark" ? "on" : "off"}
                    </p>
                  </div>
                  <Toggle checked={theme === "dark"} onChange={toggleTheme} />
                </div>
              </div>
            </section>

            {/* sign out */}
            <div className="pt-4 border-t border-border">
              <button
                onClick={handleSignOut}
                className="group flex items-center gap-2 text-[11px] uppercase tracking-[.18em] font-semibold text-muted-foreground hover:text-red-500 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.75} />
                Sign out of all devices
              </button>
            </div>

          </div>
        </div>

        {/* ── bottom rule ─── */}
        <div className="mt-16 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[9px] uppercase tracking-[.3em] text-muted-foreground/40">
            DMW Robotics · Secure Session
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

      </div>
    </div>
  );
}

/* ── section header ─────────────────────────────────────────────── */
function SectionHeader({ label, index }: { label: string; index: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] font-bold text-orange-500/60 tabular-nums">{index}</span>
      <span className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-bold uppercase tracking-[.22em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}