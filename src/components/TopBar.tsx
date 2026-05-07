import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Search, LogOut, Settings, User as UserIcon, CheckCheck, Trash2, Loader2, GitBranch, FileText, LifeBuoy } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  notificationsService,
  type Notification,
  type NotificationType,
} from "@/services/notifications";

// ─── Notification helpers ─────────────────────────────────────────────────────

const notifCategory = (type: NotificationType) => {
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
    case "milestone": return "text-emerald-600 bg-emerald-500/10";
    case "document":  return "text-blue-500 bg-blue-500/10";
    case "ticket":    return "text-amber-500 bg-amber-500/10";
    default:          return "text-muted-foreground bg-muted";
  }
};

// ─── Notification Popover ─────────────────────────────────────────────────────

function NotificationPopover({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [markingAll, setMarkingAll]       = useState(false);
  const navigate                          = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationsService.list({ ordering: "-created_at" });
      setNotifications(data.slice(0, 8));
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex flex-col" style={{ width: 380, maxHeight: 520 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-500 px-1.5 py-0.5 text-[10px] font-semibold">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={markingAll || unreadCount === 0}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          {markingAll
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <CheckCheck className="h-3 w-3" />}
          Mark all read
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 bg-card">
        {loading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <CheckCheck className="h-6 w-6 opacity-30" />
            <p className="text-xs">You're all caught up!</p>
          </div>
        )}

        {!loading && notifications.map((n, idx) => {
          const Icon = iconFor(n.type);
          return (
            <div
              key={n.id}
              className={cn(
                "group relative flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60",
                idx !== notifications.length - 1 && "border-b border-border",
                !n.is_read && "bg-orange-500/[0.04]"
              )}
            >
              {/* Unread dot */}
              {!n.is_read && (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-orange-500" />
              )}

              {/* Icon */}
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                colorFor(n.type)
              )}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-snug truncate text-foreground">{n.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                  {n.message}
                </p>
                {n.actor_name && n.actor_name !== "System" && (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">by {n.actor_name}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                {!n.is_read && (
                  <button
                    title="Mark as read"
                    onClick={() => handleMarkOneRead(n.id)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <CheckCheck className="h-3 w-3" />
                  </button>
                )}
                <button
                  title="Delete"
                  onClick={() => handleDelete(n.id)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border bg-muted/40 shrink-0">
        <button
          onClick={() => { navigate("/notifications"); onClose(); }}
          className="w-full text-center text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors py-0.5"
        >
          View all notifications →
        </button>
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const unreadCount      = useNotificationCount();
  const [notifOpen, setNotifOpen] = useState(false);
  const popoverRef               = useRef<HTMLDivElement>(null);
  const bellRef                  = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  const initials  = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";
  const fullName  = user ? `${user.first_name} ${user.last_name}`.trim() : "";
  const roleLabel = user?.role?.replace(/_/g, " ") ?? "";

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-card shadow-sm">
      <div className="flex h-full items-center gap-3 px-4 lg:px-6">
        <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground" />

        {/* Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects, documents, tickets…"
              className="h-9 pl-9 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:bg-background focus-visible:border-orange-400"
            />
          </div>
        </div>

        <div className="flex-1 md:hidden" />

        {/* Right side */}
        <div className="flex items-center gap-1 ml-auto">
          <ThemeToggle />

          {/* Bell */}
          <div className="relative">
            <Button
              ref={bellRef}
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                  </span>
                  {unreadCount > 1 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-0.5 text-[9px] font-bold text-white ring-1 ring-card">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </>
              )}
            </Button>

            {/* Notification Popover */}
            {notifOpen && (
              <div
                ref={popoverRef}
                className="absolute top-full mt-2 right-0 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
                style={{ minWidth: 380 }}
              >
                <NotificationPopover onClose={() => setNotifOpen(false)} />
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-muted transition-colors outline-none">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-orange-500/10 text-orange-500 text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start leading-tight">
                  <span className="text-xs font-semibold text-foreground">{fullName || user?.email}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{roleLabel}</span>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 border-border bg-card shadow-lg">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">{fullName}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                  {roleLabel && (
                    <Badge className="mt-1 w-fit border-none bg-orange-500/10 text-orange-500 text-[10px] capitalize px-1.5">
                      {roleLabel}
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-border" />

              <DropdownMenuItem onClick={() => navigate("/profile")} className="text-foreground">
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/profile?tab=security")} className="text-foreground">
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-border" />

              <DropdownMenuItem
                onClick={async () => await logout()}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}