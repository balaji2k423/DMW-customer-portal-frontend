import { useNavigate } from "react-router-dom";
import {
  Plus, ChevronRight, Search, Loader2, AlertTriangle,
  Flag, Layers, Activity, CheckCircle2, Clock,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ticketsService, type Ticket, type TicketSummary } from "@/services/tickets";
import { cn } from "@/lib/utils";
import NewTicketModal from "./NewTicketModal";   // ← new modal

/* ─────────────────────────────────────────────────────────────────────────────
   Design system — identical to Milestones / Profile pages
   font-mono, orange-500 accent, flat rounded-xl cards, divide-y rows
───────────────────────────────────────────────────────────────────────────── */

const STATUS_MAP: Record<string, string> = {
  open: "open", in_progress: "in-progress",
  on_hold: "on-hold", resolved: "resolved", closed: "closed",
};

/* Role helpers
   Only customer_admin and customer_user can raise or close tickets.
   Admins and project_managers can view/manage but NOT raise or close. */
const CUSTOMER_ROLES = ["customer_admin", "customer_user"];

function isCustomer(role?: string) {
  return CUSTOMER_ROLES.includes(role ?? "");
}

/* ── Status config ── */
type UiStatus = "open" | "in-progress" | "on-hold" | "resolved" | "closed";

const S: Record<UiStatus, { label: string; dot: string; badge: string; card: string }> = {
  "open": {
    label: "Open",
    dot:   "bg-amber-400",
    badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25",
    card:  "border-l-amber-400",
  },
  "in-progress": {
    label: "In Progress",
    dot:   "bg-orange-500 animate-pulse",
    badge: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/25",
    card:  "border-l-orange-400",
  },
  "on-hold": {
    label: "On Hold",
    dot:   "bg-zinc-400",
    badge: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700",
    card:  "border-l-zinc-300 dark:border-l-zinc-600",
  },
  "resolved": {
    label: "Resolved",
    dot:   "bg-emerald-500",
    badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25",
    card:  "border-l-emerald-400",
  },
  "closed": {
    label: "Closed",
    dot:   "bg-zinc-300",
    badge: "bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800",
    card:  "border-l-zinc-200 dark:border-l-zinc-800",
  },
};

const P: Record<string, { label: string; badge: string }> = {
  critical: { label: "Critical", badge: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20" },
  high:     { label: "High",     badge: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20" },
  medium:   { label: "Medium",   badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20" },
  low:      { label: "Low",      badge: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700" },
};

/* ── Helpers ── */
function initials(name: string) {
  return (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/* ── Divider (matches Milestones) ── */
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/50">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ── Stat card (matches Milestones) ── */
function StatCard({
  value, label, color, icon,
}: {
  value: number; label: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <span className={cn("text-3xl font-black tabular-nums leading-none", color)}>{value}</span>
        <span className="text-muted-foreground/40">{icon}</span>
      </div>
      <span className="text-[12px] font-semibold text-muted-foreground/70">{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */
export default function Tickets() {
  const navigate    = useNavigate();
  const { toast }   = useToast();
  const { user }    = useAuth();

  const canRaise = isCustomer(user?.role); // only customers can raise tickets

  const [query, setQuery]         = useState("");
  const [tickets, setTickets]     = useState<Ticket[]>([]);
  const [summary, setSummary]     = useState<TicketSummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);   // ← new

  const load = () => {
    setLoading(true);
    Promise.all([ticketsService.list(), ticketsService.summary()])
      .then(([list, sum]) => { setTickets(list); setSummary(sum); })
      .catch(() => setError("Failed to load tickets. Please try again."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    tickets.filter(t =>
      t.subject.toLowerCase().includes(query.toLowerCase()) ||
      t.ticket_id.toLowerCase().includes(query.toLowerCase())
    ), [tickets, query]);

  /* ── Loading ── */
  if (loading) return (
    <div className="flex h-64 items-center justify-center font-mono">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="h-12 w-12 rounded-full border-2 border-border" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-orange-500" />
        </div>
        <p className="text-[13px] font-semibold text-muted-foreground/60">Loading tickets…</p>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="flex h-64 items-center justify-center font-mono">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
          <AlertTriangle className="h-7 w-7 text-rose-500" />
        </div>
        <div>
          <p className="text-[15px] font-bold">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-1 text-[13px] font-semibold text-orange-500 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="font-mono space-y-8">

      {/* ── Page header (matches Milestones exactly) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2.5">
            <div className="h-0.5 w-5 bg-orange-500" />
            <span className="text-[11px] font-bold uppercase tracking-[.2em] text-orange-500">
              Engineering Support
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none">Support Tickets</h1>
          <p className="mt-1.5 text-[14px] font-medium text-muted-foreground">
            Direct line to your DMW engineering team.
          </p>
        </div>

        {/* Only customers can raise tickets — admins/managers see nothing here */}
        {canRaise && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-[14px] font-bold text-white shadow-sm shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-orange-500/30 self-start"
          >
            <Plus className="h-4 w-4" /> Raise new ticket
          </button>
        )}
      </div>

      {/* ── Stat cards (matches Milestones) ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          value={summary?.open ?? 0}
          label="Open"
          color="text-amber-600 dark:text-amber-400"
          icon={<Flag className="h-5 w-5 text-amber-500/40" />}
        />
        <StatCard
          value={summary?.in_progress ?? 0}
          label="In Progress"
          color="text-orange-600 dark:text-orange-400"
          icon={<Activity className="h-5 w-5 text-orange-500/40" />}
        />
        <StatCard
          value={summary?.resolved ?? 0}
          label="Resolved"
          color="text-emerald-600 dark:text-emerald-400"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500/40" />}
        />
        <StatCard
          value={summary?.overdue ?? 0}
          label="SLA Breached"
          color="text-rose-600 dark:text-rose-400"
          icon={<Clock className="h-5 w-5 text-rose-500/40" />}
        />
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by ID or subject…"
          className="w-full rounded-xl border border-border bg-card pl-11 pr-4 py-3 text-[14px] font-medium placeholder:text-muted-foreground/30 outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10 transition-all"
        />
      </div>

      {/* ── Ticket list ── */}
      <div>
        <Divider label={`${filtered.length} ticket${filtered.length !== 1 ? "s" : ""}`} />

        {/* Column headers */}
        <div className="mt-3 grid grid-cols-12 items-center px-5 py-2">
          <div className="col-span-2 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/40">ID</div>
          <div className="col-span-4 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/40">Subject</div>
          <div className="col-span-2 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/40">Priority</div>
          <div className="col-span-2 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/40">Status</div>
          <div className="col-span-2 text-right text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/40">Updated</div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-24">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <Flag className="h-8 w-8 text-muted-foreground/20" />
            </div>
            <p className="text-[16px] font-bold text-muted-foreground/60">No tickets found</p>
            <p className="mt-1.5 text-[14px] text-muted-foreground/40">
              {query ? "Try a different search term." : canRaise ? "Raise your first ticket above." : "No tickets assigned to your projects yet."}
            </p>
          </div>
        )}

        <div className="space-y-2 pt-1">
          {filtered.map((t) => {
            const uiStatus = (STATUS_MAP[t.status] ?? "open") as UiStatus;
            const scfg     = S[uiStatus] ?? S["open"];
            const pcfg     = P[t.priority] ?? P["medium"];
            const closed   = uiStatus === "closed" || uiStatus === "resolved";

            return (
              <button
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className={cn(
                  "group w-full border-l-[3px] rounded-xl border border-border bg-card text-left",
                  "transition-all duration-200 hover:shadow-md hover:-translate-y-px hover:border-border/70",
                  scfg.card,
                  closed && "opacity-50"
                )}
              >
                <div className="grid grid-cols-12 items-center gap-2 px-5 py-4">

                  {/* ID */}
                  <div className="col-span-2">
                    <span className="text-[13px] font-black tabular-nums text-muted-foreground/60">
                      {t.ticket_id}
                    </span>
                    {t.sla_breached && (
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-rose-500">
                        <AlertTriangle className="h-3 w-3" /> SLA
                      </p>
                    )}
                  </div>

                  {/* Subject */}
                  <div className="col-span-4 min-w-0 pr-3">
                    <p className="truncate text-[14px] font-bold leading-snug group-hover:text-orange-500 transition-colors">
                      {t.subject}
                    </p>
                    {t.project_name && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground/50 font-medium">
                        {t.project_name}
                      </p>
                    )}
                  </div>

                  {/* Priority */}
                  <div className="col-span-2">
                    <span className={cn(
                      "rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                      pcfg.badge
                    )}>
                      {pcfg.label}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                      scfg.badge
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full bg-current", uiStatus === "in-progress" && "animate-pulse")} />
                      {scfg.label}
                    </span>
                  </div>

                  {/* Right: assignee + date */}
                  <div className="col-span-2 flex items-center justify-end gap-3">
                    <div className="hidden text-right sm:block">
                      <p className="text-[12px] font-semibold">{t.assigned_to_name ?? "Unassigned"}</p>
                      <p className="text-[11px] text-muted-foreground/50">{fmt(t.updated_at)}</p>
                    </div>
                    {t.assigned_to_name && (
                      <div className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-[10px] font-bold text-orange-600 dark:text-orange-400 sm:flex">
                        {initials(t.assigned_to_name)}
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-orange-500" />
                  </div>

                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── New Ticket Modal (customers only) ── */}
      {canRaise && (
        <NewTicketModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load(); // refresh the list after a new ticket is created
          }}
        />
      )}
    </div>
  );
}