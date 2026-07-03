import { useParams, useNavigate, Navigate } from "react-router-dom";
import {
  ArrowLeft, Paperclip, Send, Clock, Download,
  Loader2, AlertTriangle, BadgeCheck, Calendar,
  Tag, Activity, ChevronRight, MessageSquare,
  History, Flag, CheckCircle2, Layers, BarChart3,
  Building2, User, X, FileText, Image as ImageIcon,
  Mail, Phone, Shield, RefreshCw,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ticketsService, type TicketDetail, type AssignedEngineer } from "@/services/tickets";
import { cn } from "@/lib/utils";

/* ─── Brand tokens ─── */
const BRAND       = "#E8510A";
const BRAND_LIGHT = "#FEF0E9";
const BRAND_MID   = "#F97316";

/* ─── Status / Priority maps ─── */
const STATUS_MAP: Record<string, string> = {
  open: "open", in_progress: "in-progress",
  on_hold: "on-hold", resolved: "resolved", closed: "closed",
};

const CUSTOMER_ROLES = ["customer_admin", "customer_user"];
function isCustomer(role?: string) { return CUSTOMER_ROLES.includes(role ?? ""); }

type UiStatus = "open" | "in-progress" | "on-hold" | "resolved" | "closed";

const S: Record<UiStatus, { label: string; dot: string; badge: string; card: string; bar: string; node: string }> = {
  "open":        { label: "Open",        dot: "bg-amber-400",              badge: "bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-900",         card: "border-l-amber-400",   bar: BRAND,     node: "bg-amber-500/10 border-amber-300 dark:border-amber-500/30"         },
  "in-progress": { label: "In Progress", dot: "bg-orange-500 animate-pulse", badge: "text-white border-transparent",                                                      card: "border-l-orange-400",  bar: BRAND_MID, node: "border-orange-300 dark:border-orange-500/30"                       },
  "on-hold":     { label: "On Hold",     dot: "bg-slate-400",              badge: "bg-muted text-muted-foreground border border-border",                                   card: "border-l-border",      bar: "#94a3b8",  node: "bg-muted border-border"                                            },
  "resolved":    { label: "Resolved",    dot: "bg-emerald-500",            badge: "bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-900", card: "border-l-emerald-400", bar: "#10b981",  node: "bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30"  },
  "closed":      { label: "Closed",      dot: "bg-slate-300",              badge: "bg-muted text-muted-foreground/50 border border-border",                                card: "border-l-border",      bar: "#cbd5e1",  node: "bg-muted/50 border-border"                                         },
};

const P: Record<string, { label: string; badge: string; stripe: string }> = {
  critical: { label: "Critical", badge: "bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-900",        stripe: "bg-rose-500"   },
  high:     { label: "High",     badge: "bg-orange-500/10 text-orange-600 border border-orange-200 dark:border-orange-900", stripe: "bg-orange-500" },
  medium:   { label: "Medium",   badge: "bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-900",    stripe: "bg-amber-400"  },
  low:      { label: "Low",      badge: "bg-muted text-muted-foreground border border-border",                              stripe: "bg-slate-300 dark:bg-slate-600" },
};

/* ─── Helpers ─── */
function initials(name: string) { return (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2); }
function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function slaHoursLeft(slaDue: string | null) {
  if (!slaDue) return 0;
  return Math.max(0, Math.round((new Date(slaDue).getTime() - Date.now()) / 3_600_000));
}
function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
function fileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return <ImageIcon className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />;
  return <FileText className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />;
}

/* ─── Divider ─── */
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

/* ─── KPI Stat card ─── */
function StatCard({ value, label, iconBg, textColor, icon }: {
  value: number | string; label: string; iconBg: string; textColor: string; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: iconBg }}>
        {icon ?? <Layers className="h-5 w-5 text-white" strokeWidth={1.75} />}
      </div>
      <div>
        <p className={cn("text-2xl font-bold tabular-nums tracking-tight", textColor)}>{value}</p>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ─── Assigned Engineer Card ─── */
function EngineerCard({ engineer }: { engineer: AssignedEngineer | null }) {
  if (!engineer) {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-dashed border-border bg-muted/20">
        <div className="flex flex-col items-center justify-center px-5 py-8 text-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/40">
            <User className="h-5 w-5 text-muted-foreground/30" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-bold text-muted-foreground/50">No engineer assigned yet</p>
          <p className="text-[11px] text-muted-foreground/35">Our team will assign an engineer shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
      {/* Header strip */}
      <div className="h-1" style={{ background: `linear-gradient(to right, ${BRAND}, ${BRAND_MID})` }} />

      <div className="px-5 py-4">
        {/* Avatar + name row */}
        <div className="flex items-center gap-4">
          {engineer.avatar_url ? (
            <img
              src={engineer.avatar_url}
              alt={engineer.full_name}
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-card"
              style={{ boxShadow: `0 0 0 2px ${BRAND}40` }}
            />
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[14px] font-black text-white ring-2 ring-white dark:ring-card"
              style={{ background: BRAND_MID, boxShadow: `0 0 0 3px ${BRAND_MID}30` }}
            >
              {initials(engineer.full_name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold truncate">{engineer.full_name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="text-[12px] text-muted-foreground/60 font-medium">{engineer.designation}</p>
            </div>
          </div>
          {/* Online indicator */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* Contact details */}
        <div className="mt-4 space-y-2">
          <a
            href={`mailto:${engineer.email}`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 transition-all hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 hover:text-orange-600"
          >
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-orange-500 transition-colors" strokeWidth={1.5} />
            <span className="truncate text-[13px] font-semibold">{engineer.email}</span>
          </a>
          {engineer.phone && (
            <a
              href={`tel:${engineer.phone}`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 transition-all hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 hover:text-orange-600"
            >
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-orange-500 transition-colors" strokeWidth={1.5} />
              <span className="text-[13px] font-semibold">{engineer.phone}</span>
            </a>
          )}
        </div>

        {/* DMW badge */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3.5 py-2">
          <span className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider">DMW Engineering</span>
          <span
            className="rounded-lg px-2.5 py-0.5 text-[10px] font-bold"
            style={{ background: BRAND_LIGHT, color: BRAND }}
          >
            Verified
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────────── */
export default function TicketDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { toast } = useToast();
  const fileRef   = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const canClose     = isCustomer(user?.role);
  const customerName = user?.full_name ?? user?.name ?? user?.email ?? "You";
  const customerOrg  = user?.company ?? user?.organization ?? "";

  const [ticket,        setTicket]        = useState<TicketDetail | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [notFound,      setNotFound]      = useState(false);
  const [reply,         setReply]         = useState("");
  const [sending,       setSending]       = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [closingAction, setClosingAction] = useState<string | null>(null);
  const [pendingFiles,  setPendingFiles]  = useState<File[]>([]);

  const fetchTicket = useCallback((silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    ticketsService.get(Number(id))
      .then(setTicket)
      .catch(() => setNotFound(true))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [id]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.comments]);

  /* ── Loading ── */
  if (loading) return (
    <div className="flex h-64 items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: BRAND }}>
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading ticket…</p>
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
  const isActive  = uiStatus === "in-progress";

  const totalComments = ticket.comments.length;
  const totalAttach   = ticket.attachments.length + pendingFiles.length;

  /* ── Handlers ── */
  const handleSend = async () => {
    if (!reply.trim() && pendingFiles.length === 0) return;
    setSending(true);
    try {
      for (const file of pendingFiles) {
        const att = await ticketsService.uploadAttachment(ticket.id, file);
        setTicket(p => p ? { ...p, attachments: [...p.attachments, att] } : p);
      }
      setPendingFiles([]);

      if (reply.trim()) {
        const comment = await ticketsService.addComment(ticket.id, reply.trim());
        setTicket(p => p ? { ...p, comments: [...p.comments, comment] } : p);
        setReply("");
      }
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally { setSending(false); }
  };

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setPendingFiles(prev => [...prev, ...files]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleStatusChange = async (newStatus: string) => {
    setClosingAction(newStatus);
    try {
      const updated = await ticketsService.changeStatus(ticket.id, newStatus);
      setTicket(updated);
      const labelMap: Record<string, string> = {
        resolved: "Resolved", closed: "Closed", open: "Reopened",
        in_progress: "In Progress", on_hold: "On Hold",
      };
      toast({ title: `Ticket ${labelMap[newStatus] ?? newStatus}` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally { setClosingAction(null); }
  };

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
            <h1 className="text-xl font-bold text-foreground">Ticket Detail</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Reference: <span className="font-bold text-foreground">{ticket.ticket_id}</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Refresh */}
            <button
              onClick={() => fetchTicket(true)}
              disabled={refreshing}
              className="flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
            <button
              onClick={() => navigate("/tickets")}
              className="group flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to tickets
            </button>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            value={ticket.ticket_id}
            label="Ticket Reference"
            iconBg={BRAND}
            textColor="text-orange-600 dark:text-orange-400"
            icon={<Flag className="h-5 w-5 text-white" strokeWidth={1.75} />}
          />
          <StatCard
            value={totalComments}
            label="Messages"
            iconBg={BRAND_MID}
            textColor="text-amber-600 dark:text-amber-400"
            icon={<MessageSquare className="h-5 w-5 text-white" strokeWidth={1.75} />}
          />
          <StatCard
            value={totalAttach}
            label="Attachments"
            iconBg="#6366f1"
            textColor="text-indigo-600 dark:text-indigo-400"
            icon={<Paperclip className="h-5 w-5 text-white" strokeWidth={1.75} />}
          />
          <StatCard
            value={hoursLeft > 0 ? `${hoursLeft}h` : isClosed ? "Done" : "—"}
            label="SLA Remaining"
            iconBg={slaCrit ? "#ef4444" : "#10b981"}
            textColor={slaCrit ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}
            icon={<Clock className="h-5 w-5 text-white" strokeWidth={1.75} />}
          />
        </div>

        {/* ── SLA Progress bar ── */}
        {!isClosed && ticket.sla_due && (
          <div className="bg-card rounded-2xl border border-border shadow-sm px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4" style={{ color: BRAND }} />
                <span className="text-[14px] font-bold">SLA Response Window</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-semibold text-muted-foreground">
                  Due <span className="text-muted-foreground/40">{fmt(ticket.sla_due)}</span>
                </span>
                <span className={cn(
                  "rounded-lg border px-3 py-1 text-[14px] font-black tabular-nums",
                  slaCrit
                    ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-500/25"
                    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/25"
                )}>
                  {hoursLeft}h
                </span>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-700", slaCrit ? "bg-rose-500" : "bg-gradient-to-r from-emerald-500 to-teal-400")}
                style={{ width: `${Math.min(100, (hoursLeft / 48) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Hero ticket card ── */}
        <div className={cn(
          "group w-full border-l-[3px] rounded-xl border border-border bg-card overflow-hidden",
          scfg.card
        )}>
          {/* Priority colour stripe */}
          <div className={cn("h-1", pcfg.stripe)} />

          <div className="px-6 py-6">
            <div className="flex items-start gap-5">
              {/* Status icon node */}
              <div
                className={cn("hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border sm:flex", scfg.node)}
                style={isActive ? { background: BRAND_LIGHT, borderColor: BRAND + "60" } : {}}
              >
                {uiStatus === "resolved"    && <CheckCircle2 className="h-5 w-5 text-emerald-500" strokeWidth={2.5} />}
                {uiStatus === "in-progress" && <Activity     className="h-5 w-5" style={{ color: BRAND }} strokeWidth={2} />}
                {uiStatus === "open"        && <Flag         className="h-5 w-5 text-amber-500"   strokeWidth={2} />}
                {uiStatus === "on-hold"     && <Clock        className="h-5 w-5 text-slate-400"   strokeWidth={2} />}
                {uiStatus === "closed"      && <CheckCircle2 className="h-5 w-5 text-slate-300"   strokeWidth={2} />}
              </div>

              <div className="flex-1 min-w-0">
                {/* ID + badges */}
                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                  <span className="text-[12px] font-black tabular-nums text-muted-foreground/40">{ticket.ticket_id}</span>
                  <span className={cn("rounded-lg px-2.5 py-0.5 text-[11px] font-semibold", pcfg.badge)}>{pcfg.label}</span>
                  {/* Real-time status pill */}
                  <span
                    className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-[11px] font-semibold", scfg.badge)}
                    style={isActive ? { background: BRAND } : {}}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full bg-current", isActive && "animate-pulse")} />
                    {scfg.label}
                  </span>
                  {ticket.sla_breached && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-3 w-3" /> SLA Breached
                    </span>
                  )}
                  {isClosed && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <BadgeCheck className="h-3 w-3" /> {uiStatus === "resolved" ? "Resolved" : "Closed"}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-black leading-tight tracking-tight">{ticket.subject}</h2>
                {ticket.description && (
                  <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">{ticket.description}</p>
                )}

                {/* Meta chips */}
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {/* Customer chip */}
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: BRAND }}>
                      {initials(ticket.raised_by_name ?? customerName)}
                    </div>
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="text-[12px] text-muted-foreground/60">Customer</span>
                    <span className="text-[12px] font-bold">{ticket.raised_by_name ?? customerName}</span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="text-[12px] text-muted-foreground/60">Created</span>
                    <span className="text-[12px] font-bold">{fmtDate(ticket.created_at)}</span>
                  </div>
                  {ticket.category && (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground/40" />
                      <span className="text-[12px] font-bold capitalize">{ticket.category}</span>
                    </div>
                  )}
                  {ticket.project_name && (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground/40" />
                      <span className="text-[12px] font-bold">{ticket.project_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned engineer chip (header) */}
              <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/40">Assigned Engineer</p>
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/50 px-3.5 py-2">
                  {ticket.assigned_engineer?.avatar_url ? (
                    <img
                      src={ticket.assigned_engineer.avatar_url}
                      alt={ticket.assigned_engineer.full_name}
                      className="h-7 w-7 rounded-full object-cover ring-2 ring-white dark:ring-card"
                    />
                  ) : (
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white dark:ring-card"
                      style={{ background: BRAND_MID }}
                    >
                      {ticket.assigned_engineer ? initials(ticket.assigned_engineer.full_name) : "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-[13px] font-bold">{ticket.assigned_engineer?.full_name ?? "Unassigned"}</p>
                    <p className="text-[11px] text-muted-foreground/50">
                      {ticket.assigned_engineer?.designation ?? "DMW Engineering"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body: thread + sidebar ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Chat thread ── */}
          <div className="space-y-6 lg:col-span-2">

            {/* ── Messages ── */}
            <div>
              <Divider
                label={`${totalComments} message${totalComments !== 1 ? "s" : ""}`}
                icon={<MessageSquare className="h-3 w-3" />}
              />

              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                <div className={cn(
                  "divide-y divide-border",
                  totalComments === 0 && "flex flex-col items-center justify-center py-16"
                )}>
                  {totalComments === 0 ? (
                    <>
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: BRAND_LIGHT }}>
                        <MessageSquare className="h-6 w-6 opacity-40" style={{ color: BRAND }} />
                      </div>
                      <p className="text-[15px] font-bold text-muted-foreground/50">No messages yet</p>
                      <p className="mt-1 text-[13px] text-muted-foreground/30">Start the conversation with your engineering team.</p>
                    </>
                  ) : (
                    ticket.comments.map(msg => {
                      const fromCustomer = isCustomer(msg.author_role) || msg.author_role !== "project_manager";
                      return (
                        <div key={msg.id} className={cn("flex gap-4 px-5 py-4", fromCustomer && "flex-row-reverse bg-muted/20")}>
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-white dark:ring-card",
                              fromCustomer ? "text-white" : "bg-muted text-muted-foreground ring-transparent",
                            )}
                            style={fromCustomer ? { background: BRAND } : {}}
                          >
                            {initials(msg.author_name)}
                          </div>
                          <div className={cn("flex-1 max-w-[80%]", fromCustomer && "items-end flex flex-col")}>
                            <div className={cn("mb-1.5 flex items-center gap-2", fromCustomer ? "justify-end" : "justify-start")}>
                              <span className="text-[12px] font-bold">{msg.author_name}</span>
                              {msg.is_internal && (
                                <span className="rounded-md border border-violet-200 dark:border-violet-500/25 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                                  Internal
                                </span>
                              )}
                              <span className="text-[11px] text-muted-foreground/45">{fmt(msg.created_at)}</span>
                            </div>
                            <div
                              className={cn(
                                "rounded-xl border px-4 py-3",
                                fromCustomer
                                  ? "rounded-tr-sm border-orange-200/40 dark:border-orange-500/20"
                                  : "rounded-tl-sm border-border bg-card",
                              )}
                              style={fromCustomer ? { background: BRAND_LIGHT } : {}}
                            >
                              <p className="text-[14px] leading-relaxed">{msg.message}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>
              </div>
            </div>

            {/* ── Attachments list ── */}
            {ticket.attachments.length > 0 && (
              <div>
                <Divider
                  label={`${ticket.attachments.length} attachment${ticket.attachments.length !== 1 ? "s" : ""}`}
                  icon={<Paperclip className="h-3 w-3" />}
                />
                <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {ticket.attachments.map(a => (
                    <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/30">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                        {fileIcon(a.filename)}
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
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-bold text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Reply compose box ── */}
            {!isClosed && (
              <div>
                <Divider label="Reply" icon={<Send className="h-3 w-3" />} />
                <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">

                  {/* Identity bar */}
                  <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: BRAND }}>
                      {initials(customerName)}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[13px] font-bold truncate">{customerName}</span>
                      {customerOrg && (
                        <span className="rounded-lg border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground/60">
                          {customerOrg}
                        </span>
                      )}
                    </div>
                    <span className="ml-auto text-[11px] font-semibold text-muted-foreground/40 rounded-lg border border-border bg-muted px-2 py-0.5">
                      Auto-filled
                    </span>
                  </div>

                  {/* Pending file chips */}
                  {pendingFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-b border-border bg-muted/20 px-5 py-3">
                      {pendingFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-semibold">
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground/50" />
                          <span className="max-w-[120px] truncate">{f.name}</span>
                          <span className="text-muted-foreground/40">{fileSize(f.size)}</span>
                          <button onClick={() => removePendingFile(idx)} className="text-muted-foreground/30 hover:text-rose-500 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Type your message to the engineering team…"
                    onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSend(); }}
                    className="w-full min-h-[110px] resize-none bg-transparent px-5 py-4 text-[14px] outline-none placeholder:text-muted-foreground/25"
                  />

                  <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <input ref={fileRef} type="file" multiple className="hidden" onChange={handleAttach} />
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                        Attach file
                      </button>
                      {pendingFiles.length > 0 && (
                        <span className="rounded-lg px-2 py-1 text-[11px] font-bold text-white" style={{ background: BRAND }}>
                          {pendingFiles.length} pending
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground/25 hidden sm:block">⌘↵ to send</span>
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={sending || (!reply.trim() && pendingFiles.length === 0)}
                      className="flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-sm active:scale-95"
                      style={{ background: BRAND }}
                    >
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Status history ── */}
            {ticket.status_history?.length > 0 && (
              <div>
                <Divider label="History" icon={<History className="h-3 w-3" />} />
                <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {ticket.status_history.map(h => {
                    const labelMap: Record<string, string> = {
                      open: "Open", in_progress: "In Progress",
                      on_hold: "On Hold", resolved: "Resolved", closed: "Closed",
                    };
                    return (
                      <div key={h.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                          <Activity className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold">
                            {h.from_status
                              ? (
                                <>
                                  <span className="text-muted-foreground/45">{labelMap[h.from_status] ?? h.from_status}</span>
                                  {" → "}
                                  <span className="font-bold">{labelMap[h.to_status] ?? h.to_status}</span>
                                </>
                              )
                              : <span>Created · <span className="font-bold">{labelMap[h.to_status] ?? h.to_status}</span></span>
                            }
                          </p>
                          {h.note && (
                            <p className="mt-0.5 text-[12px] italic text-muted-foreground/50">"{h.note}"</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-semibold text-muted-foreground/55">{h.changed_by_name}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground/35">{fmt(h.changed_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">

            {/* ── Customer info ── */}
            <div>
              <Divider label="Customer" icon={<Building2 className="h-3 w-3" />} />
              <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ring-2 ring-white dark:ring-card"
                    style={{ background: BRAND }}
                  >
                    {initials(ticket.raised_by_name ?? customerName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold">{ticket.raised_by_name ?? customerName}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground/55">{customerOrg || "Customer"}</p>
                    <span
                      className="mt-1.5 inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: BRAND_LIGHT, color: BRAND, borderColor: "#fed7aa" }}
                    >
                      Auto-detected
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Assigned engineer (full card) ── */}
            <div>
              <Divider label="Assigned Engineer" icon={<User className="h-3 w-3" />} />
              <EngineerCard engineer={ticket.assigned_engineer ?? null} />
            </div>

            {/* ── Timeline ── */}
            <div>
              <Divider label="Timeline" icon={<Calendar className="h-3 w-3" />} />
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
                    <p className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground/35">Last updated</p>
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

            {/* ── Quick actions — customers only ── */}
            {!isClosed && canClose && (
              <div>
                <Divider label="Actions" />
                <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  <button
                    onClick={() => handleStatusChange("resolved")}
                    disabled={!!closingAction}
                    className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/30 disabled:opacity-50"
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
                    disabled={!!closingAction}
                    className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/30 disabled:opacity-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
                      {closingAction === "closed"
                        ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        : <Flag className="h-4 w-4 text-muted-foreground/55" strokeWidth={1.5} />
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

        {/* Footer */}
        <footer className="pt-4 pb-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">DMW Robotics</span>
            <span>© 2025 DMW Industrial Systems GMBH</span>
          </div>
          <div className="flex items-center gap-5">
            {["Security Policy", "API Docs", "Privacy", "Terms of Service"].map(l => (
              <button key={l} className="hover:text-foreground transition-colors">{l}</button>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}