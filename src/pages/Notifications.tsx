import { useEffect, useState, useCallback } from "react";
import {
  GitBranch, FileText, LifeBuoy, Settings,
  CheckCheck, Trash2, Loader2, Bell, AlertTriangle,
  TrendingUp, BarChart3, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  notificationsService,
  type Notification,
  type NotificationType,
} from "@/services/notifications";

/* ─── Brand tokens (matches Milestones) ─── */
const BRAND       = "#E8510A";
const BRAND_LIGHT = "#FEF0E9";
const BRAND_MID   = "#F97316";

/* ─── Helpers ─── */
const notifCategory = (type: NotificationType): "milestone" | "document" | "ticket" | "other" => {
  if (type.startsWith("milestone") || type.startsWith("sign_off")) return "milestone";
  if (type.startsWith("document")) return "document";
  if (type.startsWith("ticket"))   return "ticket";
  return "other";
};

const iconFor = (type: NotificationType) => {
  switch (notifCategory(type)) {
    case "milestone": return GitBranch;
    case "document":  return FileText;
    case "ticket":    return LifeBuoy;
    default:          return Settings;
  }
};

const categoryStyle = (type: NotificationType) => {
  switch (notifCategory(type)) {
    case "milestone": return { bg: "#10b981",  light: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-l-emerald-400" };
    case "document":  return { bg: BRAND_MID,  light: "bg-orange-500/10",  text: "text-orange-600 dark:text-orange-400",   border: "border-l-orange-400" };
    case "ticket":    return { bg: "#f59e0b",  light: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400",     border: "border-l-amber-400" };
    default:          return { bg: "#94a3b8",  light: "bg-muted",           text: "text-muted-foreground",                  border: "border-l-border" };
  }
};

/* ─── Grouping ─── */
const GROUP_ORDER = ["Today", "Yesterday", "Earlier this week", "Older"] as const;
type Group = typeof GROUP_ORDER[number];

const groupOf = (isoDate: string): Group => {
  const diffDays = (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return "Today";
  if (diffDays < 2) return "Yesterday";
  if (diffDays < 7) return "Earlier this week";
  return "Older";
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Divider (matches Milestones) ─── */
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/50">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ─── KPI Stat card (matches Milestones) ─── */
function StatCard({ value, label, iconBg, textColor, icon: Icon }: {
  value: number; label: string; iconBg: string; textColor: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: iconBg }}>
        <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
      </div>
      <div>
        <p className={cn("text-2xl font-bold tabular-nums tracking-tight", textColor)}>{value}</p>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ─── Delete Confirm Modal (matches Milestones ApproveModal style) ─── */
function DeleteAllModal({ count, loading, onConfirm, onClose }: {
  count: number; loading: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${BRAND}, ${BRAND_MID})` }} />
        <div className="p-6">
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10">
              <Trash2 className="h-5 w-5 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold">Delete all notifications?</h3>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            This will permanently remove all {count} notification{count !== 1 ? "s" : ""}. This action cannot be undone.
          </p>
          <div className="mt-6 flex gap-3">
            <button onClick={onClose} disabled={loading}
              className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold text-white disabled:opacity-60 transition-all hover:opacity-90 bg-rose-500">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {loading ? "Deleting…" : "Delete All"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Notification Row ─── */
function NotifRow({ n, onMarkRead, onDelete }: {
  n: Notification;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const Icon  = iconFor(n.type);
  const style = categoryStyle(n.type);

  return (
    <div className={cn(
      "group w-full border-l-[3px] rounded-xl border border-border bg-card",
      "transition-all duration-200 hover:-translate-y-px hover:shadow-md hover:border-border/60",
      style.border,
      !n.is_read && "bg-orange-50/30 dark:bg-orange-500/[0.03]",
    )}>
      <div className="flex items-center gap-5 px-5 py-4">

        {/* Unread indicator dot */}
        <div className="hidden w-3 shrink-0 sm:flex items-center justify-center">
          {!n.is_read && (
            <span className="h-2 w-2 rounded-full" style={{ background: BRAND }} />
          )}
        </div>

        {/* Category icon node */}
        <div className={cn(
          "hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:flex",
          style.light,
        )} style={{ borderColor: style.bg + "40" }}>
          <Icon className="h-4 w-4" style={{ color: style.bg }} strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            {!n.is_read && (
              <span className="rounded-lg px-2.5 py-0.5 text-[11px] font-bold text-white"
                style={{ background: BRAND }}>New</span>
            )}
            <span className={cn("rounded-lg px-2.5 py-0.5 text-[11px] font-semibold border", style.light, style.text)}
              style={{ borderColor: style.bg + "30" }}>
              {notifCategory(n.type).charAt(0).toUpperCase() + notifCategory(n.type).slice(1)}
            </span>
          </div>
          <p className="text-[15px] font-bold leading-snug">{n.title}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground/70 leading-relaxed">{n.message}</p>
          {n.actor_name && n.actor_name !== "System" && (
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground/40">by {n.actor_name}</p>
          )}
        </div>

        {/* Right: timestamp + actions */}
        <div className="hidden shrink-0 items-center gap-5 md:flex">
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground/40">
              {groupOf(n.created_at) === "Today" ? "Time" : "Date"}
            </p>
            <p className="mt-0.5 text-[13px] font-bold tabular-nums">
              {groupOf(n.created_at) === "Today" ? fmtTime(n.created_at) : fmtDate(n.created_at)}
            </p>
          </div>

          {/* Action buttons — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!n.is_read && (
              <button onClick={() => onMarkRead(n.id)} title="Mark as read"
                className="flex items-center justify-center h-8 w-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={() => onDelete(n.id)} title="Delete"
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-border text-muted-foreground hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────────── */
export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [markingAll,    setMarkingAll]    = useState(false);
  const [deletingAll,   setDeletingAll]   = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationsService.list({ ordering: "-created_at" });
      setNotifications(data);
    } catch {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsService.markRead({ all: true });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkOneRead = async (id: number) => {
    const updated = await notificationsService.markSingleRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? updated : n));
  };

  const handleDelete = async (id: number) => {
    await notificationsService.remove(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await Promise.all(notifications.map(n => notificationsService.remove(n.id)));
      setNotifications([]);
      setShowDeleteAll(false);
    } finally {
      setDeletingAll(false);
    }
  };

  const grouped = GROUP_ORDER
    .map(g => ({ group: g, items: notifications.filter(n => groupOf(n.created_at) === g) }))
    .filter(g => g.items.length > 0);

  const total      = notifications.length;
  const unread     = notifications.filter(n => !n.is_read).length;
  const milestoneN = notifications.filter(n => notifCategory(n.type) === "milestone").length;
  const ticketN    = notifications.filter(n => notifCategory(n.type) === "ticket").length;
  const readPct    = total > 0 ? Math.round(((total - unread) / total) * 100) : 0;

  /* ── Loading ── */
  if (loading) return (
    <div className="flex h-64 items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: BRAND }}>
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading notifications…</p>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
          <AlertTriangle className="h-7 w-7 text-rose-500" />
        </div>
        <p className="text-[15px] font-bold">{error}</p>
        <button onClick={fetchNotifications} className="text-[13px] font-semibold hover:underline" style={{ color: BRAND }}>
          Try again
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="w-full max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* ── Page header (matches Milestones pattern) ── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-0.5 w-5 rounded-full" style={{ background: BRAND }} />
              <span className="text-[11px] font-bold uppercase tracking-[.2em]" style={{ color: BRAND }}>Activity Feed</span>
            </div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              Notifications
              {unread > 0 && (
                <span className="rounded-lg px-2.5 py-0.5 text-[13px] font-bold text-white"
                  style={{ background: BRAND }}>{unread} new</span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Everything happening across your projects.</p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            {unread > 0 && (
              <button onClick={handleMarkAllRead} disabled={markingAll}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                {markingAll
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCheck className="h-4 w-4" />}
                Mark all read
              </button>
            )}
            {total > 0 && (
              <button onClick={() => setShowDeleteAll(true)}
                className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 px-4 py-2.5 text-[13px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                <Trash2 className="h-4 w-4" />
                Delete all
              </button>
            )}
          </div>
        </div>

        {/* ── KPI cards (matches Milestones layout) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard value={total}      label="Total"      iconBg={BRAND}      textColor="text-foreground"                             icon={Layers} />
          <StatCard value={unread}     label="Unread"     iconBg={BRAND_MID}  textColor="text-orange-600 dark:text-orange-400"        icon={Bell} />
          <StatCard value={milestoneN} label="Milestones" iconBg="#10b981"    textColor="text-emerald-600 dark:text-emerald-400"      icon={GitBranch} />
          <StatCard value={ticketN}    label="Tickets"    iconBg="#f59e0b"    textColor="text-amber-600 dark:text-amber-400"          icon={LifeBuoy} />
        </div>

        {/* ── Read progress bar (matches Milestones overall progress bar) ── */}
        {total > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-sm px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4" style={{ color: BRAND }} />
                <span className="text-[14px] font-bold">Read Progress</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-semibold text-muted-foreground">
                  {total - unread} <span className="text-muted-foreground/40">/ {total} read</span>
                </span>
                <span className="rounded-lg border px-3 py-1 text-[14px] font-black"
                  style={{ background: BRAND_LIGHT, color: BRAND, borderColor: "#fed7aa" }}>
                  {readPct}%
                </span>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${readPct}%`, background: `linear-gradient(to right, ${BRAND}, ${BRAND_MID})` }} />
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-24">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: BRAND_LIGHT }}>
              <TrendingUp className="h-8 w-8 opacity-40" style={{ color: BRAND }} />
            </div>
            <p className="text-[16px] font-bold text-muted-foreground/60">You're all caught up!</p>
            <p className="mt-1.5 text-[14px] text-muted-foreground/40">No notifications yet. Check back after project activity.</p>
          </div>
        )}

        {/* ── Grouped notification list ── */}
        {grouped.length > 0 && (
          <div className="space-y-6">
            {grouped.map(g => (
              <div key={g.group} className="space-y-1">
                <Divider label={`${g.group} · ${g.items.length}`} />
                <div className="space-y-2 pt-2">
                  {g.items.map(n => (
                    <NotifRow key={n.id} n={n} onMarkRead={handleMarkOneRead} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Footer (matches Milestones) ── */}
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

      {/* ── Delete all confirmation modal ── */}
      {showDeleteAll && (
        <DeleteAllModal
          count={total}
          loading={deletingAll}
          onConfirm={handleDeleteAll}
          onClose={() => setShowDeleteAll(false)}
        />
      )}
    </div>
  );
}