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

/* ─── Constants ──────────────────────────────────────────────────────────────── */
const STATUS_MAP: Record<string, string> = {
  open: "open", in_progress: "in-progress",
  on_hold: "on-hold", resolved: "resolved", closed: "closed",
};

const CUSTOMER_ROLES = ["customer_admin", "customer_user"];
function isCustomer(role?: string) { return CUSTOMER_ROLES.includes(role ?? ""); }

type UiStatus = "open" | "in-progress" | "on-hold" | "resolved" | "closed";

const S: Record<UiStatus, { label: string; dot: string; badge: string; card: string; bar: string; node: string }> = {
  "open":        {
    label: "Open",
    dot: "bg-amber-400",
    badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25",
    card: "border-l-amber-400",
    bar: "bg-gradient-to-r from-amber-400 to-orange-400",
    node: "bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30",
  },
  "in-progress": {
    label: "In Progress",
    dot: "bg-indigo-500 animate-pulse",
    badge: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/25",
    card: "border-l-indigo-400",
    bar: "bg-gradient-to-r from-indigo-500 to-violet-500",
    node: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/30",
  },
  "on-hold":     {
    label: "On Hold",
    dot: "bg-slate-400",
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
    card: "border-l-slate-300 dark:border-l-slate-600",
    bar: "bg-gradient-to-r from-slate-400 to-slate-300",
    node: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600",
  },
  "resolved":    {
    label: "Resolved",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25",
    card: "border-l-emerald-400",
    bar: "bg-gradient-to-r from-emerald-500 to-teal-400",
    node: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30",
  },
  "closed":      {
    label: "Closed",
    dot: "bg-slate-300",
    badge: "bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800",
    card: "border-l-slate-200 dark:border-l-slate-800",
    bar: "bg-slate-300",
    node: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
  },
};

const P: Record<string, { label: string; badge: string }> = {
  critical: { label: "Critical", badge: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20" },
  high:     { label: "High",     badge: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20" },
  medium:   { label: "Medium",   badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20" },
  low:      { label: "Low",      badge: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700" },
};

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "",            label: "All Statuses" },
  { value: "open",        label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold",     label: "On Hold" },
  { value: "resolved",    label: "Resolved" },
  { value: "closed",      label: "Closed" },
];

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Filter Dropdown ────────────────────────────────────────────────────────── */
function FilterDropdown({
  options,
  value,
  onChange,
  icon,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex min-w-[160px] items-center gap-2.5 rounded-xl border px-4 py-2.5 text-[14px] font-semibold transition-all",
          open
            ? "border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400"
            : "border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
        )}
      >
        {icon && <span className="shrink-0 text-muted-foreground/50">{icon}</span>}
        <span className="flex-1 truncate text-left">{selected?.label ?? "All"}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10">
          <div className="p-1.5 max-h-72 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold transition-colors",
                  value === opt.value
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", value === opt.value ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600")} />
                <span className="flex-1 text-left">{opt.label}</span>
                {value === opt.value && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────────────────── */
function StatCard({ value, label, color, icon }: { value: number; label: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={cn("text-3xl font-black tabular-nums leading-none", color)}>{value}</span>
        <span className="text-muted-foreground/30">{icon}</span>
      </div>
      <span className="text-[12px] font-semibold text-muted-foreground/60">{label}</span>
    </div>
  );
}

/* ─── Divider ────────────────────────────────────────────────────────────────── */
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/45">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────────── */
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
      const matchQ = t.subject.toLowerCase().includes(query.toLowerCase()) ||
                     t.ticket_id.toLowerCase().includes(query.toLowerCase());
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
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="h-12 w-12 rounded-full border-2 border-border" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-indigo-500" />
        </div>
        <p className="text-[13px] font-semibold text-muted-foreground/60">Loading tickets…</p>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
          <AlertTriangle className="h-7 w-7 text-rose-500" />
        </div>
        <div>
          <p className="text-[15px] font-bold">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-4 py-1.5 text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/15 transition-colors">
            Try again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── Page header ── */}
      <div className="mb-8">
        {/* Title + controls row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <div className="mb-1.5 flex items-center gap-2.5">
              <div className="h-0.5 w-5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
              <span className="text-[11px] font-bold uppercase tracking-[.2em] text-indigo-500">Support</span>
            </div>
            <h1 className="text-[28px] font-black leading-none tracking-tight">Support Tickets</h1>
            <p className="mt-1.5 text-[14px] font-medium text-muted-foreground/60">
              Direct line to your DMW engineering team.
            </p>
          </div>

          {/* Controls: search + status filter + new ticket */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/35" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search ID or subject…"
                className="w-52 rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-[14px] font-medium placeholder:text-muted-foreground/30 outline-none transition-all focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/10"
              />
            </div>

            {/* Status dropdown */}
            <FilterDropdown
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              icon={<SlidersHorizontal className="h-4 w-4" />}
            />

            {canRaise && (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-indigo-500/25 transition-all hover:from-indigo-600 hover:to-violet-600 hover:shadow-indigo-500/35"
              >
                <Plus className="h-4 w-4" /> Raise Ticket
              </button>
            )}
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          <StatCard value={openCount}  label="Open"        color="text-amber-600 dark:text-amber-400"   icon={<Flag        className="h-5 w-5" />} />
          <StatCard value={inProgress} label="In Progress" color="text-indigo-600 dark:text-indigo-400" icon={<Activity    className="h-5 w-5 text-indigo-500" />} />
          <StatCard value={resolved}   label="Resolved"    color="text-emerald-600 dark:text-emerald-400" icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard value={overdue}    label="SLA Breached" color="text-rose-600 dark:text-rose-400"    icon={<Clock       className="h-5 w-5" />} />
        </div>

        {/* ── Progress bar ── */}
        {total > 0 && (
          <div className="rounded-2xl border border-border bg-card px-6 py-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                <span className="text-[14px] font-bold">Overall Resolution</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-semibold text-muted-foreground">
                  {resolved} <span className="text-muted-foreground/40">/ {total} resolved</span>
                </span>
                <span className="rounded-lg bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-200 dark:border-indigo-500/20 px-3 py-1 text-[14px] font-black text-indigo-600 dark:text-indigo-400">
                  {pct}%
                </span>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Ticket list ── */}
      <div>
        <Divider label={`${filtered.length} ticket${filtered.length !== 1 ? "s" : ""}`} />

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-24">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-200/50 dark:border-indigo-500/20">
              <TicketIcon className="h-8 w-8 text-indigo-400/40" />
            </div>
            <p className="text-[16px] font-bold text-muted-foreground/60">No tickets found</p>
            <p className="mt-1.5 text-[14px] text-muted-foreground/40">
              {query || statusFilter
                ? "Try adjusting your search or filter."
                : canRaise
                  ? "Raise your first ticket above."
                  : "No tickets assigned to your projects yet."}
            </p>
          </div>
        )}

        {/* Ticket cards */}
        <div className="space-y-2 pt-2">
          {filtered.map((t, i) => {
            const uiStatus  = (STATUS_MAP[t.status] ?? "open") as UiStatus;
            const scfg      = S[uiStatus] ?? S["open"];
            const pcfg      = P[t.priority] ?? P["medium"];
            const isClosed  = uiStatus === "closed" || uiStatus === "resolved";
            const isActive  = uiStatus === "in-progress";

            return (
              <button
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className={cn(
                  "group w-full border-l-[3px] rounded-xl border border-border bg-card text-left",
                  "transition-all duration-200 hover:-translate-y-px hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600",
                  scfg.card,
                  isClosed && "opacity-55",
                  isActive && "shadow-sm",
                )}
              >
                <div className="flex items-center gap-5 px-5 py-4">

                  {/* Index */}
                  <div className="hidden w-8 shrink-0 sm:block">
                    <span className="text-[13px] font-black text-muted-foreground/20">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Status icon node */}
                  <div className={cn(
                    "hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:flex",
                    scfg.node,
                  )}>
                    {uiStatus === "resolved"    && <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2.5} />}
                    {uiStatus === "in-progress" && <Activity     className="h-4 w-4 text-indigo-500"  strokeWidth={2} />}
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
                      <span className={cn("rounded-lg px-2.5 py-0.5 text-[11px] font-semibold", pcfg.badge)}>
                        {pcfg.label}
                      </span>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-[11px] font-semibold", scfg.badge)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full bg-current", uiStatus === "in-progress" && "animate-pulse")} />
                        {scfg.label}
                      </span>
                    </div>
                    <p className="truncate text-[15px] font-bold leading-snug group-hover:text-indigo-500 transition-colors">
                      {t.subject}
                    </p>
                    {t.project_name && (
                      <p className="mt-0.5 text-[12px] font-medium text-muted-foreground/45">{t.project_name}</p>
                    )}
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
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 ring-2 ring-white dark:ring-slate-900">
                        {initials(t.assigned_to_name)}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Modal ── */}
      {canRaise && (
        <NewTicketModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}