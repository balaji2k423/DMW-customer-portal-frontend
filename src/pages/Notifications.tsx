import { useEffect, useState, useCallback } from "react";
import { GitBranch, FileText, LifeBuoy, Settings, CheckCheck, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  notificationsService,
  type Notification,
  type NotificationType,
} from "@/services/notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const notifCategory = (type: NotificationType): "milestone" | "document" | "ticket" | "other" => {
  if (type.startsWith("milestone") || type.startsWith("sign_off")) return "milestone";
  if (type.startsWith("document")) return "document";
  if (type.startsWith("ticket")) return "ticket";
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

const colorFor = (type: NotificationType) => {
  switch (notifCategory(type)) {
    case "milestone": return "text-success bg-success/10";
    case "document":  return "text-accent bg-accent/10";
    case "ticket":    return "text-warning bg-warning/10";
    default:          return "text-muted-foreground bg-muted";
  }
};

// ─── Grouping ─────────────────────────────────────────────────────────────────

const GROUP_ORDER = ["Today", "Yesterday", "Earlier this week", "Older"] as const;
type Group = typeof GROUP_ORDER[number];

const groupOf = (isoDate: string): Group => {
  const now  = new Date();
  const date = new Date(isoDate);
  const diffMs   = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 1)  return "Today";
  if (diffDays < 2)  return "Yesterday";
  if (diffDays < 7)  return "Earlier this week";
  return "Older";
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [markingAll, setMarkingAll]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);

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

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await notificationsService.markRead({ all: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkOneRead = async (id: number) => {
    const updated = await notificationsService.markSingleRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
  };

  const handleDelete = async (id: number) => {
    await notificationsService.remove(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    items: notifications.filter((n) => groupOf(n.created_at) === g),
  })).filter((g) => g.items.length > 0);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Activity feed</p>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-1">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything that's happening across your project — chronologically.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={markingAll || unreadCount === 0}
        >
          {markingAll
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <CheckCheck className="h-4 w-4" />}
          Mark all as read
        </Button>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading notifications…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}{" "}
          <button className="underline underline-offset-2" onClick={fetchNotifications}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <CheckCheck className="h-8 w-8 opacity-30" />
          <p className="text-sm">You're all caught up!</p>
        </div>
      )}

      {/* List */}
      {!loading && !error && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.group}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {g.group}
                </p>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Card className="card-elevated overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative">
                    {g.items.map((n, idx) => {
                      const Icon = iconFor(n.type);
                      return (
                        <div
                          key={n.id}
                          className={cn(
                            "group relative flex gap-4 p-4 transition-colors hover:bg-muted/40",
                            idx !== g.items.length - 1 && "border-b border-border",
                            !n.is_read && "bg-accent/[0.03]",
                          )}
                        >
                          {/* Unread dot */}
                          {!n.is_read && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-accent shadow-glow" />
                          )}

                          {/* Icon */}
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ml-2",
                            colorFor(n.type)
                          )}>
                            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold leading-snug">{n.title}</p>
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                {new Date(n.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {n.message}
                            </p>
                            {n.actor_name && n.actor_name !== "System" && (
                              <p className="text-[11px] text-muted-foreground/60 mt-1">
                                by {n.actor_name}
                              </p>
                            )}
                          </div>

                          {/* Actions (visible on hover) */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            {!n.is_read && (
                              <button
                                title="Mark as read"
                                onClick={() => handleMarkOneRead(n.id)}
                                className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              title="Delete"
                              onClick={() => handleDelete(n.id)}
                              className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}