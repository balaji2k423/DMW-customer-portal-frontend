import { useNavigate } from "react-router-dom";
import {
  Plus, ChevronRight, Search, AlertTriangle,
  Flag, Layers, Activity, CheckCircle2, Clock,
  SlidersHorizontal, TicketIcon, ChevronDown, Check,
  BarChart3,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ticketsService, type Ticket, type TicketSummary } from "@/services/tickets";
import { cn } from "@/lib/utils";
import NewTicketModal from "./NewTicketModal";

/* ─── Brand tokens (matches Dashboard) ─── */
const BRAND       = "#E8510A";
const BRAND_LIGHT = "#FEF0E9";
const BRAND_MID   = "#F97316";

/* ─── Constants ─── */
const STATUS_MAP: Record<string, string> = {
  open: "open", in_progress: "in-progress",
  on_hold: "on-hold", resolved: "resolved", closed: "closed",
};

const CUSTOMER_ROLES = ["customer_admin", "customer_user"];
function isCustomer(role?: string) { return CUSTOMER_ROLES.includes(role ?? ""); }

type UiStatus = "open" | "in-progress" | "on-hold" | "resolved" | "closed";

const S: Record<UiStatus, { label: string; dot: string; badge: string; card: string; bar: string; node: string }> = {
  "open":        { label: "Open",        dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-900",    card: "border-l-amber-400",   bar: BRAND,      node: "bg-amber-500/10 border-amber-300 dark:border-amber-500/30" },
  "in-progress": { label: "In Progress", dot: "bg-orange-500 animate-pulse", badge: "text-white border-transparent", card: "border-l-orange-400", bar: BRAND_MID, node: "border-orange-300 dark:border-orange-500/30" },
  "on-hold":     { label: "On Hold",     dot: "bg-slate-400",   badge: "bg-muted text-muted-foreground border border-border",                             card: "border-l-border",      bar: "#94a3b8",  node: "bg-muted border-border" },
  "resolved":    { label: "Resolved",    dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-900", card: "border-l-emerald-400", bar: "#10b981", node: "bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30" },
  "closed":      { label: "Closed",      dot: "bg-slate-300",   badge: "bg-muted text-muted-foreground/50 border border-border",                          card: "border-l-border",      bar: "#cbd5e1",  node: "bg-muted/50 border-border" },
};

const P: Record<string, { label: string; badge: string }> = {
  critical: { label: "Critical", badge: "bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-900" },
  high:     { label: "High",     badge: "bg-orange-500/10 text-orange-600 border border-orange-200 dark:border-orange-900" },
  medium:   { label: "Medium",   badge: "bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-900" },
  low:      { label: "Low",      badge: "bg-muted text-muted-foreground border border-border" },
};

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "",            label: "All Statuses" },
  { value: "open",        label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold",     label: "On Hold" },
  { value: "resolved",    label: "Resolved" },
  { value: "closed",      label: "Closed" },
];

/* ─── Helpers ─── */
function initials(name: string) { return (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2); }
function fmt(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }

/* ─── Divider ─── */
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/45">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ─── KPI Stat card (matches dashboard) ─── */
function StatCard({ value, label, iconBg, textColor }: { value: number; label: string; iconBg: string; textColor: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: iconBg }}>
        <Layers className="h-5 w-5 text-white" strokeWidth={1.75} />
      </div>
      <div>
        <p className={cn("text-2xl font-bold tabular-nums tracking-tight", textColor)}>{value}</p>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ─── Filter Dropdown ─── */
function FilterDropdown({ options, value, onChange, icon }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className={cn("flex min-w-[160px] items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition-all",
          open || value
            ? "border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/5 text-orange-600 dark:text-orange-400"
            : "border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        )}>
        {icon && <span className="shrink-0 text-muted-foreground/50">{icon}</span>}
        <span className="flex-1 truncate text-left">{selected?.label ?? "All"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/10">
          <div className="p-1.5 max-h-72 overflow-y-auto">
            {options.map(opt => (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                  value === opt.value ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400" : "hover:bg-muted"
                )}>
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", value === opt.value ? "bg-orange-500" : "bg-muted-foreground/30")} />
                <span className="flex-1 text-left">{opt.label}</span>
                {value === opt.value && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────────────────────── */
export default function Tickets() {
  const navigate  = useNavigate();
  const { toast } = useToast();
  const { user }  = useAuth();

  const canRaise = isCustomer(user?.role);

  const [query,        setQuery]        = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tickets,      setTickets]      = useState<Ticket[]>([]);
  const [summary,      setSummary]      = useState<TicketSummary | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [modalOpen,    setModalOpen]    = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([ticketsService.list(), ticketsService.summary()])
      .then(([list, sum]) => { setTickets(list); setSummary(sum); })
      .catch(() => setError("Failed to load tickets. Please try again."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    tickets.filter(t => {
      const matchQ = t.subject.toLowerCase().includes(query.toLowerCase()) || t.ticket_id.toLowerCase().includes(query.toLowerCase());
      const matchS = !statusFilter || t.status === statusFilter;
      return matchQ && matchS;
    }),
  [tickets, query, statusFilter]);

  const total      = tickets.length;
  const openCount  = summary?.open ?? 0;
  const inProgress = summary?.in_progress ?? 0;
  const resolved   = summary?.resolved ?? 0;
  const overdue    = summary?.overdue ?? 0;
  const pct        = total > 0 ? Math.round(((summary?.resolved ?? 0) / total) * 100) : 0;

  /* ── Loading ── */
  if (loading) return (
    <div className="flex h-64 items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: BRAND }}>
          <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading tickets…</p>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10"><AlertTriangle className="h-7 w-7 text-rose-500" /></div>
        <p className="text-[15px] font-bold">{error}</p>
        <button onClick={() => window.location.reload()} className="text-[13px] font-semibold hover:underline" style={{ color: BRAND }}>Try again</button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="w-full max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-0.5 w-5 rounded-full" style={{ background: BRAND }} />
              <span className="text-[11px] font-bold uppercase tracking-[.2em]" style={{ color: BRAND }}>Support</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Support Tickets</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Direct line to your DMW engineering team.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/35" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search ID or subject…"
                className="w-52 rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-[13px] font-medium placeholder:text-muted-foreground/30 outline-none transition-all focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10" />
            </div>
            {/* Status filter */}
            <FilterDropdown options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} icon={<SlidersHorizontal className="h-3.5 w-3.5" />} />
            {canRaise && (
              <button onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-bold text-white shadow-sm transition-all hover:opacity-90"
                style={{ background: BRAND }}>
                <Plus className="h-4 w-4" /> Raise Ticket
              </button>
            )}
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard value={openCount}  label="Open"          iconBg={BRAND}      textColor="text-orange-600 dark:text-orange-400" />
          <StatCard value={inProgress} label="In Progress"   iconBg={BRAND_MID}  textColor="text-amber-600 dark:text-amber-400" />
          <StatCard value={resolved}   label="Resolved"      iconBg="#10b981"    textColor="text-emerald-600 dark:text-emerald-400" />
          <StatCard value={overdue}    label="SLA Breached"  iconBg="#ef4444"    textColor="text-rose-600 dark:text-rose-400" />
        </div>

        {/* ── Progress bar ── */}
        {total > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-sm px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4" style={{ color: BRAND }} />
                <span className="text-[14px] font-bold">Overall Resolution</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-semibold text-muted-foreground">{resolved} <span className="text-muted-foreground/40">/ {total} resolved</span></span>
                <span className="rounded-lg border px-3 py-1 text-[14px] font-black" style={{ background: BRAND_LIGHT, color: BRAND, borderColor: "#fed7aa" }}>{pct}%</span>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(to right, ${BRAND}, ${BRAND_MID})` }} />
            </div>
          </div>
        )}

        {/* ── Ticket list ── */}
        <div>
          <Divider label={`${filtered.length} ticket${filtered.length !== 1 ? "s" : ""}`} />

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-24">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: BRAND_LIGHT }}>
                <TicketIcon className="h-8 w-8 opacity-40" style={{ color: BRAND }} />
              </div>
              <p className="text-[16px] font-bold text-muted-foreground/60">No tickets found</p>
              <p className="mt-1.5 text-[14px] text-muted-foreground/40">
                {query || statusFilter ? "Try adjusting your search or filter." : canRaise ? "Raise your first ticket above." : "No tickets assigned to your projects yet."}
              </p>
            </div>
          )}

          {/* Ticket cards */}
          <div className="space-y-2 pt-2">
            {filtered.map((t, i) => {
              const uiStatus = (STATUS_MAP[t.status] ?? "open") as UiStatus;
              const scfg     = S[uiStatus] ?? S["open"];
              const pcfg     = P[t.priority] ?? P["medium"];
              const isClosed = uiStatus === "closed" || uiStatus === "resolved";
              const isActive = uiStatus === "in-progress";

              return (
                <button key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}
                  className={cn(
                    "group w-full border-l-[3px] rounded-xl border border-border bg-card text-left",
                    "transition-all duration-200 hover:-translate-y-px hover:shadow-md hover:border-border/60",
                    scfg.card, isClosed && "opacity-55"
                  )}>
                  <div className="flex items-center gap-5 px-5 py-4">
                    {/* Index */}
                    <div className="hidden w-8 shrink-0 sm:block">
                      <span className="text-[13px] font-black text-muted-foreground/20">{String(i + 1).padStart(2, "0")}</span>
                    </div>

                    {/* Status icon node */}
                    <div className={cn("hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:flex", scfg.node)}
                      style={isActive ? { background: BRAND_LIGHT, borderColor: BRAND + "60" } : {}}>
                      {uiStatus === "resolved"    && <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2.5} />}
                      {uiStatus === "in-progress" && <Activity     className="h-4 w-4" style={{ color: BRAND }} strokeWidth={2} />}
                      {uiStatus === "open"        && <Flag         className="h-4 w-4 text-amber-500"   strokeWidth={2} />}
                      {uiStatus === "on-hold"     && <Clock        className="h-4 w-4 text-slate-400"   strokeWidth={2} />}
                      {uiStatus === "closed"      && <CheckCircle2 className="h-4 w-4 text-slate-300"   strokeWidth={2} />}
                    </div>

                    {/* Title + meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 mb-1">
                        <span className="text-[12px] font-black tabular-nums text-muted-foreground/40">{t.ticket_id}</span>
                        {t.sla_breached && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-500">
                            <AlertTriangle className="h-3 w-3" /> SLA
                          </span>
                        )}
                        <span className={cn("rounded-lg px-2.5 py-0.5 text-[11px] font-semibold", pcfg.badge)}>{pcfg.label}</span>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-[11px] font-semibold", scfg.badge)}
                          style={isActive ? { background: BRAND } : {}}>
                          <span className={cn("h-1.5 w-1.5 rounded-full bg-current", isActive && "animate-pulse")} />
                          {scfg.label}
                        </span>
                      </div>
                      <p className="truncate text-[15px] font-bold leading-snug transition-colors group-hover:text-orange-600 dark:group-hover:text-orange-400">
                        {t.subject}
                      </p>
                      {t.project_name && <p className="mt-0.5 text-[12px] font-medium text-muted-foreground/45">{t.project_name}</p>}
                    </div>

                    {/* Right: assignee + date */}
                    <div className="hidden shrink-0 items-center gap-6 md:flex">
                      <div className="text-right">
                        <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground/40">Assigned</p>
                        <p className="mt-0.5 text-[13px] font-bold">{t.assigned_to_name ?? "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground/40">Updated</p>
                        <p className="mt-0.5 text-[13px] font-bold tabular-nums">{fmt(t.updated_at)}</p>
                      </div>
                      {t.assigned_to_name && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white dark:ring-card" style={{ background: BRAND }}>
                          {initials(t.assigned_to_name)}
                        </div>
                      )}
                    </div>

                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-4 pb-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">DMW Robotics</span>
            <span>© 2023 DMW Industrial Systems GMBH</span>
          </div>
          <div className="flex items-center gap-5">
            {["Security Policy", "API Docs", "Privacy", "Terms of Service"].map(l => (
              <button key={l} className="hover:text-foreground transition-colors">{l}</button>
            ))}
          </div>
        </footer>
      </div>

      {/* Modal */}
      {canRaise && (
        <NewTicketModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={() => { setModalOpen(false); load(); }} />
      )}
    </div>
  );
}