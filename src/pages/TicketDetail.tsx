import { useParams, useNavigate, Navigate } from "react-router-dom";
import {
  ArrowLeft, Paperclip, Send, Clock, Download,
  Loader2, AlertTriangle, BadgeCheck, Calendar,
  User, Tag, Activity, ChevronRight, MessageSquare,
  History, Flag,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ticketsService, type TicketDetail } from "@/services/tickets";
import { cn } from "@/lib/utils";

/* ─── Design tokens ──────────────────────────────────────────────────────────── */
const STATUS_MAP: Record<string, string> = {
  open: "open", in_progress: "in-progress",
  on_hold: "on-hold", resolved: "resolved", closed: "closed",
};

const CUSTOMER_ROLES = ["customer_admin", "customer_user"];
function isCustomer(role?: string) { return CUSTOMER_ROLES.includes(role ?? ""); }

type UiStatus = "open" | "in-progress" | "on-hold" | "resolved" | "closed";

const S: Record<UiStatus, { label: string; badge: string; bar: string }> = {
  "open":        {
    label: "Open",
    badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25",
    bar: "bg-gradient-to-r from-amber-400 to-orange-400",
  },
  "in-progress": {
    label: "In Progress",
    badge: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/25",
    bar: "bg-gradient-to-r from-indigo-500 to-violet-500",
  },
  "on-hold":     {
    label: "On Hold",
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
    bar: "bg-slate-400",
  },
  "resolved":    {
    label: "Resolved",
    badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25",
    bar: "bg-gradient-to-r from-emerald-500 to-teal-400",
  },
  "closed":      {
    label: "Closed",
    badge: "bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800",
    bar: "bg-slate-300",
  },
};

const P: Record<string, { label: string; badge: string; stripe: string }> = {
  critical: { label: "Critical", badge: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20",     stripe: "bg-rose-500" },
  high:     { label: "High",     badge: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20", stripe: "bg-orange-500" },
  medium:   { label: "Medium",   badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20",   stripe: "bg-amber-400" },
  low:      { label: "Low",      badge: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700",         stripe: "bg-slate-300 dark:bg-slate-600" },
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}
function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

/* ─── Divider ────────────────────────────────────────────────────────────────── */
function Divider({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/45">
        {icon}{label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────────── */
export default function TicketDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { toast } = useToast();
  const fileRef   = useRef<HTMLInputElement>(null);

  const canClose  = isCustomer(user?.role);

  const [ticket,        setTicket]        = useState<TicketDetail | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [notFound,      setNotFound]      = useState(false);
  const [reply,         setReply]         = useState("");
  const [sending,       setSending]       = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [closingAction, setClosingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    ticketsService.get(Number(id))
      .then(setTicket)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Loading ── */
  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="h-12 w-12 rounded-full border-2 border-border" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-indigo-500" />
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

  /* ── Handlers ── */
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
    <div className="max-w-5xl space-y-6">

      {/* Top accent bar */}
      <div className={cn("h-[3px] -mt-1 rounded-full", isClosed ? "bg-gradient-to-r from-emerald-500 to-teal-400" : scfg.bar)} />

      {/* Back */}
      <button
        onClick={() => navigate("/tickets")}
        className="group -ml-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to tickets
      </button>

      {/* ── Hero card ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Priority colour stripe */}
        <div className={cn("h-1", pcfg.stripe)} />

        <div className="px-6 py-8">
          {/* meta row */}
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[.2em] text-muted-foreground/50">
            {ticket.ticket_id}
          </p>

          <h1 className="text-3xl font-black leading-tight tracking-tight">{ticket.subject}</h1>

          {ticket.description && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {ticket.description}
            </p>
          )}

          {/* Badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={cn("rounded-lg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", pcfg.badge)}>
              {pcfg.label}
            </span>
            <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", scfg.badge)}>
              <span className={cn("h-1.5 w-1.5 rounded-full bg-current", uiStatus === "in-progress" && "animate-pulse")} />
              {scfg.label}
            </span>
            {ticket.sla_breached && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-3 w-3" /> SLA Breached
              </span>
            )}
            {isClosed && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="h-3 w-3" /> Resolved
              </span>
            )}
          </div>

          {/* Meta chips */}
          <div className="mt-5 flex flex-wrap gap-2.5">
            {ticket.raised_by_name && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white">
                  {initials(ticket.raised_by_name)}
                </div>
                <span className="text-[12px] text-muted-foreground/60">Raised by</span>
                <span className="text-[12px] font-bold">{ticket.raised_by_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground/40" />
              <span className="text-[12px] text-muted-foreground/60">Created</span>
              <span className="text-[12px] font-bold">{fmtDate(ticket.created_at)}</span>
            </div>
            {ticket.category && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground/40" />
                <span className="text-[12px] font-bold capitalize">{ticket.category}</span>
              </div>
            )}
            {ticket.project_name && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2">
                <Activity className="h-3.5 w-3.5 text-muted-foreground/40" />
                <span className="text-[12px] font-bold">{ticket.project_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body: thread + sidebar ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Thread ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Comments */}
          <div>
            <Divider
              label={`${ticket.comments.length} message${ticket.comments.length !== 1 ? "s" : ""}`}
              icon={<MessageSquare className="h-3 w-3" />}
            />

            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
              {ticket.comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-200/50 dark:border-indigo-500/20">
                    <MessageSquare className="h-6 w-6 text-indigo-400/40" />
                  </div>
                  <p className="text-[15px] font-bold text-muted-foreground/50">No messages yet</p>
                  <p className="mt-1 text-[13px] text-muted-foreground/30">
                    Add context to help the engineering team.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {ticket.comments.map(msg => {
                    const fromCustomer = msg.author_role !== "project_manager";
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex gap-4 px-5 py-4", fromCustomer && "flex-row-reverse")}
                      >
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                          fromCustomer
                            ? "bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-600 dark:text-indigo-400"
                            : "bg-muted text-muted-foreground",
                        )}>
                          {initials(msg.author_name)}
                        </div>
                        <div className={cn("max-w-[80%] flex-1", fromCustomer && "items-end")}>
                          <div className={cn(
                            "mb-1.5 flex items-center gap-2",
                            fromCustomer ? "justify-end" : "justify-start",
                          )}>
                            <span className="text-[12px] font-bold">{msg.author_name}</span>
                            {msg.is_internal && (
                              <span className="rounded-md border border-violet-200 dark:border-violet-500/25 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                                Internal
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground/45">{fmt(msg.created_at)}</span>
                          </div>
                          <div className={cn(
                            "rounded-xl border px-4 py-3",
                            fromCustomer
                              ? "rounded-tr-sm border-indigo-200/40 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-500/8 to-violet-500/8"
                              : "rounded-tl-sm border-border bg-muted/40",
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
              <Divider
                label={`${ticket.attachments.length} attachment${ticket.attachments.length !== 1 ? "s" : ""}`}
                icon={<Paperclip className="h-3 w-3" />}
              />
              <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {ticket.attachments.map(a => (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                      <Paperclip className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{a.filename}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/45">
                        {fileSize(a.file_size)} · {a.uploaded_by_name}
                      </p>
                    </div>
                    <a
                      href={a.file_url}
                      download={a.filename}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground/60 transition-colors hover:text-indigo-500"
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
              <Divider label="Reply" icon={<Send className="h-3 w-3" />} />
              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Reply to your engineering team…"
                  onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSend(); }}
                  className="w-full min-h-[100px] resize-none bg-transparent px-5 py-4 text-[14px] outline-none placeholder:text-muted-foreground/25"
                />
                <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <input ref={fileRef} type="file" className="hidden" onChange={handleAttach} />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      {uploading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Paperclip className="h-3.5 w-3.5" />}
                      Attach
                    </button>
                    <span className="text-[11px] text-muted-foreground/25 hidden sm:block">⌘↵ to send</span>
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={sending || !reply.trim()}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-[13px] font-bold text-white transition-all hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 shadow-sm shadow-indigo-500/20"
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status history */}
          {ticket.status_history?.length > 0 && (
            <div>
              <Divider label="History" icon={<History className="h-3 w-3" />} />
              <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {ticket.status_history.map(h => (
                  <div key={h.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                      <Activity className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">
                        {h.from_status
                          ? <><span className="text-muted-foreground/45">{h.from_status}</span> → <span>{h.to_status}</span></>
                          : <span>Created · {h.to_status}</span>
                        }
                      </p>
                      {h.note && <p className="mt-0.5 text-[12px] italic text-muted-foreground/50">"{h.note}"</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold text-muted-foreground/55">{h.changed_by_name}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/35">{fmt(h.changed_at)}</p>
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
            <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-[12px] font-bold text-indigo-600 dark:text-indigo-400 ring-2 ring-white dark:ring-slate-900 border border-indigo-200/50 dark:border-indigo-500/20">
                  {ticket.assigned_to_name ? initials(ticket.assigned_to_name) : "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold">{ticket.assigned_to_name ?? "Unassigned"}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground/55">DMW Engineering</p>
                </div>
              </div>
            </div>
          </div>

          {/* SLA */}
          {!isClosed && ticket.sla_due && (
            <div>
              <Divider label="SLA" />
              <div className="mt-3 rounded-xl border border-border bg-card px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-muted-foreground/70">Response window</span>
                  <span className={cn(
                    "flex items-center gap-1.5 text-[13px] font-black tabular-nums",
                    slaCrit ? "text-rose-500" : "text-emerald-500",
                  )}>
                    <Clock className="h-3.5 w-3.5" />
                    {hoursLeft}h left
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={cn("h-full rounded-full transition-all", slaCrit ? "bg-rose-500" : "bg-gradient-to-r from-emerald-500 to-teal-400")}
                    style={{ width: `${Math.min(100, (hoursLeft / 48) * 100)}%` }}
                  />
                </div>
                {ticket.sla_breached && (
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-rose-500">
                    <AlertTriangle className="h-3.5 w-3.5" /> SLA has been breached
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground/40 tabular-nums">
                  Due {fmt(ticket.sla_due)}
                </p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <Divider label="Timeline" />
            <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                  <Calendar className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/35">Created</p>
                  <p className="mt-0.5 text-[12px] font-bold tabular-nums">{fmt(ticket.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                  <Activity className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/35">Last update</p>
                  <p className="mt-0.5 text-[12px] font-bold tabular-nums">{fmt(ticket.updated_at)}</p>
                </div>
              </div>
              {ticket.resolved_at && (
                <div className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10">
                    <BadgeCheck className="h-4 w-4 text-emerald-500" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/35">Resolved</p>
                    <p className="mt-0.5 text-[12px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {fmt(ticket.resolved_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions — customers only */}
          {!isClosed && canClose && (
            <div>
              <Divider label="Actions" />
              <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                <button
                  onClick={() => handleStatusChange("resolved")}
                  disabled={closingAction === "resolved"}
                  className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10">
                    {closingAction === "resolved"
                      ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                      : <BadgeCheck className="h-4 w-4 text-emerald-500" strokeWidth={1.75} />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold">Mark as resolved</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/45">Issue has been fixed</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 transition-colors group-hover:text-emerald-500" />
                </button>
                <button
                  onClick={() => handleStatusChange("closed")}
                  disabled={closingAction === "closed"}
                  className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                    {closingAction === "closed"
                      ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      : <User className="h-4 w-4 text-muted-foreground/55" strokeWidth={1.5} />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold">Close ticket</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/45">No further action needed</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 transition-colors group-hover:text-foreground" />
                </button>
              </div>
            </div>
          )}

          {/* Info for staff */}
          {!isClosed && !canClose && (
            <div className="rounded-xl border border-dashed border-border px-5 py-4">
              <p className="text-[12px] font-semibold text-muted-foreground/55">
                Only the customer can close or resolve this ticket.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}