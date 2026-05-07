import { useParams, useNavigate, Navigate } from "react-router-dom";
import {
  ArrowLeft, Paperclip, Send, Clock, Download,
  Loader2, AlertTriangle, BadgeCheck, Calendar,
  User, Tag, Activity, ChevronRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ticketsService, type TicketDetail } from "@/services/tickets";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Design system — identical to Milestones / Tickets pages
   font-mono, orange-500 accent, flat rounded-xl cards
───────────────────────────────────────────────────────────────────────────── */

const STATUS_MAP: Record<string, string> = {
  open: "open", in_progress: "in-progress",
  on_hold: "on-hold", resolved: "resolved", closed: "closed",
};

/* Role helpers */
const CUSTOMER_ROLES = ["customer_admin", "customer_user"];
function isCustomer(role?: string) { return CUSTOMER_ROLES.includes(role ?? ""); }

/* ── Status config ── */
type UiStatus = "open" | "in-progress" | "on-hold" | "resolved" | "closed";

const S: Record<UiStatus, { label: string; badge: string; bar: string }> = {
  "open":        { label: "Open",        badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25",           bar: "bg-amber-400" },
  "in-progress": { label: "In Progress", badge: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/25",     bar: "bg-gradient-to-r from-orange-500 to-amber-400" },
  "on-hold":     { label: "On Hold",     badge: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700",                      bar: "bg-zinc-400" },
  "resolved":    { label: "Resolved",    badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25", bar: "bg-emerald-500" },
  "closed":      { label: "Closed",      badge: "bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800",                                          bar: "bg-zinc-300" },
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
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function slaHoursLeft(slaDue: string | null) {
  if (!slaDue) return 0;
  return Math.max(0, Math.round((new Date(slaDue).getTime() - Date.now()) / 3600000));
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
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

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */
export default function TicketDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { toast } = useToast();
  const fileRef   = useRef<HTMLInputElement>(null);

  const canClose   = isCustomer(user?.role); // only customers can close/resolve
  const isManager  = user?.role === "project_manager";

  const [ticket, setTicket]       = useState<TicketDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [reply, setReply]         = useState("");
  const [sending, setSending]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [closingAction, setClosingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    ticketsService.get(Number(id))
      .then(setTicket)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex h-64 items-center justify-center font-mono">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="h-12 w-12 rounded-full border-2 border-border" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-orange-500" />
        </div>
        <p className="text-[13px] font-semibold text-muted-foreground/60">Loading ticket…</p>
      </div>
    </div>
  );

  if (notFound) return <Navigate to="/tickets" replace />;
  if (!ticket)  return null;

  const uiStatus  = (STATUS_MAP[ticket.status] ?? "open") as UiStatus;
  const scfg      = S[uiStatus] ?? S["open"];
  const pcfg      = P[ticket.priority] ?? P["medium"];
  const hoursLeft = slaHoursLeft(ticket.sla_due);
  const slaCrit   = hoursLeft > 0 && hoursLeft < 8;
  const isClosed  = uiStatus === "closed" || uiStatus === "resolved";

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const comment = await ticketsService.addComment(ticket.id, reply.trim());
      setTicket(p => p ? { ...p, comments: [...p.comments, comment] } : p);
      setReply("");
    } catch {
      toast({ title: "Failed to send reply", variant: "destructive" });
    } finally { setSending(false); }
  };

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const att = await ticketsService.uploadAttachment(ticket.id, file);
      setTicket(p => p ? { ...p, attachments: [...p.attachments, att] } : p);
      toast({ title: "File attached" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setClosingAction(newStatus);
    try {
      const updated = await ticketsService.changeStatus(ticket.id, newStatus);
      setTicket(updated);
      toast({ title: "Status updated" });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally { setClosingAction(null); }
  };

  return (
    <div className="font-mono space-y-6 max-w-5xl">

      {/* ── Top accent bar ── */}
      <div className={cn("h-0.5 -mt-1 rounded-full", scfg.bar)} />

      {/* ── Back ── */}
      <button
        onClick={() => navigate("/tickets")}
        className="group flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground -ml-3"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to tickets
      </button>

      {/* ── Hero ── */}
      <div className="border-b border-border pb-6">
        <div className="mb-1 flex items-center gap-2.5">
          <div className="h-0.5 w-5 bg-orange-500" />
          <span className="text-[11px] font-bold uppercase tracking-[.2em] text-orange-500">
            Engineering Support
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 mt-3 mb-3">
          <span className="text-[13px] font-black tabular-nums text-muted-foreground/50">
            {ticket.ticket_id}
          </span>
          <span className={cn(
            "rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
            pcfg.badge
          )}>
            {pcfg.label}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
            scfg.badge
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full bg-current", uiStatus === "in-progress" && "animate-pulse")} />
            {scfg.label}
          </span>
          {ticket.sla_breached && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" /> SLA Breached
            </span>
          )}
          {isClosed && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <BadgeCheck className="h-3.5 w-3.5" /> Resolved
            </span>
          )}
        </div>

        <h1 className="text-[24px] font-black tracking-tight leading-tight">{ticket.subject}</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          {ticket.description}
        </p>

        {/* Meta chips (matches MilestoneDetail) */}
        <div className="mt-5 flex flex-wrap gap-2.5">
          {ticket.raised_by_name && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/15 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                {initials(ticket.raised_by_name)}
              </div>
              <span className="text-[12px] text-muted-foreground">Raised by</span>
              <span className="text-[12px] font-bold">{ticket.raised_by_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-[12px] text-muted-foreground">Created</span>
            <span className="text-[12px] font-bold">{fmt(ticket.created_at)}</span>
          </div>
          {ticket.category && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-[12px] font-bold capitalize">{ticket.category}</span>
            </div>
          )}
          {ticket.project_name && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2">
              <Activity className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-[12px] font-bold">{ticket.project_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Thread ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Comment thread */}
          <div>
            <Divider label={`${ticket.comments.length} message${ticket.comments.length !== 1 ? "s" : ""}`} />

            <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
              {ticket.comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-[15px] font-bold text-muted-foreground/50">No messages yet</p>
                  <p className="mt-1 text-[13px] text-muted-foreground/30">
                    Add context below to help the engineering team.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {ticket.comments.map(msg => {
                    const fromCustomer = msg.author_role !== "project_manager";
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-4 px-5 py-4",
                          fromCustomer && "flex-row-reverse"
                        )}
                      >
                        {/* Avatar */}
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                          fromCustomer
                            ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {initials(msg.author_name)}
                        </div>

                        {/* Bubble */}
                        <div className={cn("flex-1 max-w-[80%]", fromCustomer && "items-end")}>
                          <div className={cn(
                            "flex items-center gap-2 mb-1.5",
                            fromCustomer ? "justify-end" : "justify-start"
                          )}>
                            <span className="text-[12px] font-bold">{msg.author_name}</span>
                            <span className="text-[11px] text-muted-foreground/50">{fmt(msg.created_at)}</span>
                          </div>
                          <div className={cn(
                            "rounded-xl px-4 py-3 border",
                            fromCustomer
                              ? "bg-orange-500/10 border-orange-500/20 text-foreground rounded-tr-sm"
                              : "bg-muted/40 border-border rounded-tl-sm"
                          )}>
                            <p className="text-[14px] leading-relaxed">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          {ticket.attachments.length > 0 && (
            <div>
              <Divider label="Attachments" />
              <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                {ticket.attachments.map(a => (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                      <Paperclip className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[13px] font-semibold">{a.filename}</p>
                      <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                        {fileSize(a.file_size)} · {a.uploaded_by_name}
                      </p>
                    </div>
                    <a
                      href={a.file_url}
                      download={a.filename}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply box */}
          {!isClosed && (
            <div>
              <Divider label="Reply" />
              <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Reply to your engineering team…"
                  onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSend(); }}
                  className="w-full resize-none bg-transparent px-5 py-4 text-[14px] outline-none placeholder:text-muted-foreground/30 min-h-[100px]"
                />
                <div className="flex items-center justify-between border-t border-border px-5 py-3">
                  <div className="flex items-center gap-2">
                    <input ref={fileRef} type="file" className="hidden" onChange={handleAttach} />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {uploading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Paperclip className="h-3.5 w-3.5" />}
                      Attach file
                    </button>
                    <span className="text-[11px] text-muted-foreground/30">⌘↵ to send</span>
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={sending || !reply.trim()}
                    className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {sending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Send className="h-3.5 w-3.5" />}
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status history (for managers) */}
          {ticket.status_history?.length > 0 && (
            <div>
              <Divider label="History" />
              <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                {ticket.status_history.map(h => (
                  <div key={h.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                      <Activity className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold">
                        {h.from_status
                          ? <><span className="text-muted-foreground/50">{h.from_status}</span> → <span>{h.to_status}</span></>
                          : <span>Created · {h.to_status}</span>
                        }
                      </p>
                      {h.note && <p className="text-[12px] text-muted-foreground/60 mt-0.5 italic">"{h.note}"</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-semibold text-muted-foreground/60">{h.changed_by_name}</p>
                      <p className="text-[10px] text-muted-foreground/40 mt-0.5">{fmt(h.changed_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">

          {/* Assigned engineer */}
          <div>
            <Divider label="Engineer" />
            <div className="mt-3 rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[12px] font-bold">
                  {ticket.assigned_to_name ? initials(ticket.assigned_to_name) : "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold">{ticket.assigned_to_name ?? "Unassigned"}</p>
                  <p className="text-[12px] text-muted-foreground/60 mt-0.5">DMW Engineering</p>
                </div>
              </div>
            </div>
          </div>

          {/* SLA */}
          {!isClosed && ticket.sla_due && (
            <div>
              <Divider label="SLA" />
              <div className="mt-3 rounded-xl border border-border bg-card px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-semibold text-muted-foreground">Response window</span>
                  <span className={cn(
                    "flex items-center gap-1.5 text-[13px] font-black tabular-nums",
                    slaCrit ? "text-rose-500" : "text-emerald-500"
                  )}>
                    <Clock className="h-3.5 w-3.5" />
                    {hoursLeft}h left
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", slaCrit ? "bg-rose-500" : "bg-emerald-500")}
                    style={{ width: `${Math.min(100, (hoursLeft / 48) * 100)}%` }}
                  />
                </div>
                {ticket.sla_breached && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-rose-500">
                    <AlertTriangle className="h-3.5 w-3.5" /> SLA has been breached
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div>
            <Divider label="Timeline" />
            <div className="mt-3 rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
              <div className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                  <Calendar className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/40">Created</p>
                  <p className="text-[12px] font-bold mt-0.5 tabular-nums">{fmt(ticket.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                  <Activity className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/40">Last update</p>
                  <p className="text-[12px] font-bold mt-0.5 tabular-nums">{fmt(ticket.updated_at)}</p>
                </div>
              </div>
              {ticket.resolved_at && (
                <div className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10">
                    <BadgeCheck className="h-4 w-4 text-emerald-500" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/40">Resolved</p>
                    <p className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                      {fmt(ticket.resolved_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions — ONLY for customers */}
          {!isClosed && canClose && (
            <div>
              <Divider label="Actions" />
              <div className="mt-3 rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                <button
                  onClick={() => handleStatusChange("resolved")}
                  disabled={closingAction === "resolved"}
                  className="group flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/30 transition-colors disabled:opacity-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10">
                    {closingAction === "resolved"
                      ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                      : <BadgeCheck className="h-4 w-4 text-emerald-500" strokeWidth={1.75} />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-foreground">Mark as resolved</p>
                    <p className="text-[11px] text-muted-foreground/50 mt-0.5">Issue has been fixed</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-emerald-500 transition-colors" />
                </button>

                <button
                  onClick={() => handleStatusChange("closed")}
                  disabled={closingAction === "closed"}
                  className="group flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/30 transition-colors disabled:opacity-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                    {closingAction === "closed"
                      ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      : <User className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-foreground">Close ticket</p>
                    <p className="text-[11px] text-muted-foreground/50 mt-0.5">No further action needed</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-foreground transition-colors" />
                </button>
              </div>
            </div>
          )}

          {/* Info for admins/managers — no close actions available */}
          {!isClosed && !canClose && (
            <div className="rounded-xl border border-dashed border-border px-5 py-4">
              <p className="text-[12px] font-semibold text-muted-foreground/60">
                Only the customer can close or resolve this ticket.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}