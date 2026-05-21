import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Clock, Activity, AlertCircle, FileText,
  ChevronRight, FolderOpen, Plus, Calendar, Loader2,
  RefreshCw, Wifi, WifiOff, TrendingUp, Upload,
  ArrowUpRight, ArrowDownRight, CheckSquare, Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { milestonesService, type Milestone } from "@/services/milestones";
import { ticketsService, type Ticket, type TicketSummary } from "@/services/tickets";
import { documentsService, type Document } from "@/services/documents";

const POLL_INTERVAL = 10_000;
const BRAND        = "#E8510A";
const BRAND_LIGHT  = "#FEF0E9";
const BRAND_MID    = "#F97316";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80, h = 32;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const first = data[0], last = data[data.length - 1];
  const y0 = h - ((first - min) / range) * (h - 4) - 2;
  const areaBot = `${w},${h} 0,${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <polygon points={`0,${y0} ${pts} ${areaBot}`} fill={color} fillOpacity="0.12" />
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, trend, icon: Icon, iconBg, sparkData, sparkColor,
}: {
  label: string; value: string; sub: string;
  trend?: { val: string; up: boolean } | null;
  icon: React.ElementType; iconBg: string;
  sparkData?: number[]; sparkColor?: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: iconBg }}>
          <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
        </div>
        {sparkData && sparkColor && (
          <Sparkline data={sparkData} color={sparkColor} />
        )}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight mt-0.5 tabular-nums">{value}</p>
        {trend ? (
          <div className={cn("flex items-center gap-1 mt-1.5 text-[11px] font-semibold", trend.up ? "text-emerald-600" : "text-red-500")}>
            {trend.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            <span>{trend.val}</span>
            <span className="text-muted-foreground font-normal">{sub}</span>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ open, inProgress, resolved }: { open: number; inProgress: number; resolved: number }) {
  const total = open + inProgress + resolved || 1;
  const r = 52, cx = 68, cy = 68, stroke = 14;
  const circ = 2 * Math.PI * r;
  const segments = [
    { val: open,       color: BRAND,     label: "Open" },
    { val: inProgress, color: "#FBBF24", label: "In Progress" },
    { val: resolved,   color: "#10B981", label: "Resolved" },
  ];
  let offset = 0;
  const arcs = segments.map((s) => {
    const dash = (s.val / total) * circ;
    const arc = { dash, offset, color: s.color };
    offset += dash;
    return arc;
  });
  return (
    <div className="flex items-center gap-5">
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={a.color} strokeWidth={stroke}
            strokeDasharray={`${a.dash} ${circ - a.dash}`}
            strokeDashoffset={-a.offset + circ / 4}
            strokeLinecap="round"
          />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor">{open + inProgress + resolved}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.5">Total</text>
      </svg>
      <div className="space-y-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="ml-auto text-xs font-bold text-foreground tabular-nums pl-4">{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardData {
  milestones: Milestone[];
  tickets:    Ticket[];
  documents:  Document[];
  summary:    TicketSummary | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  const [data, setData]               = useState<DashboardData>({ milestones: [], tickets: [], documents: [], summary: null });
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [online, setOnline]           = useState(true);
  const timerRef                      = useRef<ReturnType<typeof setInterval>>();

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [ms, tk, sm, dc] = await Promise.allSettled([
        milestonesService.list(),
        ticketsService.list(),
        ticketsService.summary(),
        documentsService.list(),
      ]);
      setData({
        milestones: ms.status === "fulfilled" ? ms.value : [],
        tickets:    tk.status === "fulfilled" ? tk.value : [],
        summary:    sm.status === "fulfilled" ? sm.value : null,
        documents:  dc.status === "fulfilled" ? dc.value : [],
      });
      setLastUpdated(new Date());
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
    timerRef.current = setInterval(() => fetchData(true), POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchData]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") fetchData(true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchData]);

  const { milestones, tickets, documents, summary } = data;

  const completedMilestones  = milestones.filter((m) => m.status === "completed").length;
  const inProgressMilestones = milestones.filter((m) => m.status === "in_progress").length;
  const overallProgress      = milestones.length ? Math.round((completedMilestones / milestones.length) * 100) : 0;
  const nextMilestone        = milestones.find((m) => m.status === "in_progress") ?? milestones.find((m) => m.status === "pending");
  const openTickets          = tickets.filter((t) => t.status !== "closed" && t.status !== "resolved");
  const resolvedTickets      = tickets.filter((t) => t.status === "resolved" || t.status === "closed");
  const inProgressTickets    = tickets.filter((t) => t.status === "in_progress");
  const criticalCount        = openTickets.filter((t) => t.priority === "critical").length;
  const highCount            = openTickets.filter((t) => t.priority === "high").length;
  const recentDocs           = [...documents].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);
  const recentActivity       = [
    ...tickets.slice(0, 3).map((t) => ({ id: t.id, type: "ticket" as const, title: t.subject, sub: `${t.ticket_id} · ${t.assigned_to_name ?? "Unassigned"}`, time: t.updated_at, priority: t.priority })),
    ...recentDocs.slice(0, 2).map((d)  => ({ id: d.id, type: "doc" as const,    title: d.title,   sub: d.category,  time: d.updated_at, priority: null })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

  const statusProgressMap: Record<string, number> = {
    completed: 100, in_progress: 65, pending: 0, delayed: 30, cancelled: 0,
  };

  const sparkRevenue = [18, 22, 19, 28, 24, 30, 26, 35, 31, 38, 34, 40];
  const sparkRobots  = [700, 720, 710, 740, 760, 750, 780, 800, 820, 810, 840, 847];
  const sparkUptime  = [99.8, 99.9, 99.85, 99.95, 99.9, 99.92, 99.96, 99.97, 99.98, 99.96, 99.97, 99.97];
  const sparkTickets = [30, 27, 32, 28, 25, 29, 26, 24, 28, 25, 24, 23];

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: BRAND }}>
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="w-full max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* ── Greeting + status bar ─────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Welcome back! 👋</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Here's a quick overview of your robotics operations.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border",
              online
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900"
                : "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900"
            )}>
              {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {online ? "Live" : "Offline"}
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full border border-border bg-card hover:border-border/80 transition-all"
            >
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing…" : lastUpdated ? `Updated ${timeAgo(lastUpdated.toISOString())}` : "Refresh"}
            </button>
          </div>
        </div>

        {/* ── KPI Row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Revenue"  value="$2.4M"
            sub="from last week" trend={{ val: "12.5%", up: true }}
            icon={TrendingUp} iconBg={BRAND}
            sparkData={sparkRevenue} sparkColor={BRAND} />
          <KpiCard label="Active Robots"  value="847"
            sub="from last week" trend={{ val: "3.2%", up: true }}
            icon={Activity} iconBg="#3b82f6"
            sparkData={sparkRobots} sparkColor="#3b82f6" />
          <KpiCard label="System Uptime"  value="99.97%"
            sub="from last week" trend={{ val: "0.1%", up: true }}
            icon={Wifi} iconBg="#10b981"
            sparkData={sparkUptime} sparkColor="#10b981" />
          <KpiCard label="Open Tickets"   value={String(summary?.open ?? openTickets.length)}
            sub="from last week" trend={criticalCount > 0 ? { val: "8.7%", up: false } : null}
            icon={AlertCircle} iconBg={criticalCount > 0 ? "#ef4444" : "#94a3b8"}
            sparkData={sparkTickets} sparkColor={criticalCount > 0 ? "#ef4444" : "#94a3b8"} />
        </div>

        {/* ── Middle row: Active Project + Recent Activity ───────────────── */}
        <div className="grid grid-cols-12 gap-5">

          {/* Active Project — 8 cols */}
          <div className="col-span-12 lg:col-span-8 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Active Project</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => navigate("/milestones")}
                  className="text-[11px] font-semibold flex items-center gap-1 hover:underline"
                  style={{ color: BRAND }}>
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="p-6 flex gap-6">
              {/* Robot thumb */}
              <div className="hidden md:flex h-28 w-28 rounded-2xl items-center justify-center shrink-0 border border-border"
                style={{ background: BRAND_LIGHT }}>
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                  <circle cx="30" cy="22" r="12" stroke={BRAND} strokeWidth="2.5" />
                  <rect x="18" y="34" width="24" height="14" rx="4" stroke={BRAND} strokeWidth="2.5" />
                  <line x1="14" y1="37" x2="14" y2="44" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="46" y1="37" x2="46" y2="44" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="26" cy="21" r="2" fill={BRAND} />
                  <circle cx="34" cy="21" r="2" fill={BRAND} />
                  <path d="M26 27 Q30 30 34 27" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base font-bold text-foreground">
                    {nextMilestone?.title ?? "Autonomous Navigation v3.2"}
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                    style={{ background: BRAND_LIGHT, color: BRAND, borderColor: "#fed7aa" }}>
                    In Progress
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {nextMilestone?.description ?? "Navigation system upgrades and performance optimization for better autonomy."}
                </p>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Overall Progress</span>
                    <span className="text-[11px] font-bold text-foreground">{overallProgress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${overallProgress}%`, background: `linear-gradient(to right, ${BRAND}, ${BRAND_MID})` }} />
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{nextMilestone?.planned_date ? formatDate(nextMilestone.planned_date) : "Dec 15, 2024"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" style={{ color: BRAND }} />
                      <span className="font-semibold" style={{ color: BRAND }}>High</span>
                    </div>
                    {/* Team avatars */}
                    <div className="flex items-center">
                      {["AC", "MK", "JL"].map((init, i) => (
                        <div key={init}
                          className="h-6 w-6 rounded-full border-2 border-card flex items-center justify-center text-[9px] font-bold text-white -ml-1.5 first:ml-0"
                          style={{ background: i === 0 ? BRAND : i === 1 ? "#8b5cf6" : "#3b82f6", zIndex: 3 - i }}>
                          {init}
                        </div>
                      ))}
                      <div className="h-6 w-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground -ml-1.5">+1</div>
                    </div>
                  </div>
                  <button onClick={() => navigate("/milestones")}
                    className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90 shadow-sm"
                    style={{ background: BRAND }}>
                    View Project <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity — 4 cols */}
          <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Recent Activity</h2>
              <button className="text-[11px] font-semibold flex items-center gap-1 hover:underline" style={{ color: BRAND }}>
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 divide-y divide-border overflow-y-auto">
              {recentActivity.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No recent activity.</p>
              )}
              {recentActivity.map((item) => {
                const isTicket = item.type === "ticket";
                const isCritical = item.priority === "critical";
                return (
                  <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5",
                      isTicket ? (isCritical ? "bg-red-500/10" : "bg-orange-500/10") : "bg-blue-500/10"
                    )}>
                      {isTicket
                        ? <AlertCircle className="h-4 w-4" style={{ color: isCritical ? "#ef4444" : BRAND }} />
                        : <FileText className="h-4 w-4 text-blue-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-snug line-clamp-1">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(item.time)}</span>
                      <span className={cn("h-2 w-2 rounded-full",
                        isCritical ? "bg-red-500" : isTicket ? "bg-amber-400" : "bg-purple-400")} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-5">

          {/* Upcoming Milestones — 5 cols */}
          <div className="col-span-12 lg:col-span-5 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-bold text-foreground">Upcoming Milestones</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">{milestones.length} milestones · {completedMilestones} completed</p>
              </div>
              <button onClick={() => navigate("/milestones")}
                className="text-[11px] font-semibold flex items-center gap-0.5 hover:underline" style={{ color: BRAND }}>
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 divide-y divide-border overflow-y-auto">
              {milestones.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">No milestones yet.</p>
              )}
              {milestones.slice(0, 6).map((m) => {
                const progress = statusProgressMap[m.status] ?? 0;
                const isCompleted = m.status === "completed";
                const isActive    = m.status === "in_progress";
                const isDelayed   = m.status === "delayed";
                return (
                  <div key={m.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors group">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full shrink-0 border-2 transition-transform group-hover:scale-105",
                      isCompleted ? "border-emerald-500 bg-emerald-500 text-white" :
                      isDelayed   ? "border-amber-400 bg-amber-400 text-white" :
                      "border-border bg-card text-muted-foreground"
                    )}
                    style={isActive ? { borderColor: BRAND } : {}}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> :
                       isActive    ? <Activity className="h-4 w-4" style={{ color: BRAND }} strokeWidth={2} /> :
                       isDelayed   ? <AlertCircle className="h-4 w-4" strokeWidth={2} /> :
                       <Clock className="h-4 w-4" strokeWidth={2} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">{m.title}</p>
                      {m.planned_date && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(m.planned_date)}</p>
                      )}
                      {isActive && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: BRAND }} />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{progress}%</span>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      {isCompleted && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-900">
                          Completed
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[9px] font-bold px-2.5 py-1 rounded-full border"
                          style={{ background: BRAND_LIGHT, color: BRAND, borderColor: "#fed7aa" }}>
                          {progress}%
                        </span>
                      )}
                      {!isCompleted && !isActive && !isDelayed && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                          Upcoming
                        </span>
                      )}
                      {isDelayed && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-900">
                          Delayed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Support Overview — 4 cols */}
          <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Support Overview</h2>
              <button onClick={() => navigate("/tickets")}
                className="text-[11px] font-semibold flex items-center gap-1 hover:underline" style={{ color: BRAND }}>
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 px-5 py-5 flex flex-col justify-between gap-4">
              <DonutChart
                open={summary?.open ?? openTickets.length}
                inProgress={inProgressTickets.length}
                resolved={resolvedTickets.length}
              />
              {/* Priority bars */}
              <div className="space-y-2 border-t border-border pt-4">
                {[
                  { label: "Critical", count: criticalCount,                                                         color: "#ef4444" },
                  { label: "High",     count: highCount,                                                             color: BRAND },
                  { label: "Medium",   count: openTickets.filter((t) => t.priority === "medium").length,             color: "#fbbf24" },
                ].map((p) => (
                  <div key={p.label} className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground w-14">{p.label}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(p.count / Math.max(openTickets.length, 1)) * 100}%`, background: p.color }} />
                    </div>
                    <span className="text-[11px] font-bold text-foreground w-4 text-right tabular-nums">{p.count}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/tickets")}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition-all hover:opacity-90"
                style={{ background: BRAND_LIGHT, color: BRAND }}>
                View All Tickets <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Actions + Docs — 3 cols */}
          <div className="col-span-12 lg:col-span-3 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Quick Actions</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {[
                { label: "Create Project",   icon: Plus,        iconBg: BRAND,      to: "/milestones" },
                { label: "New Task",         icon: CheckSquare, iconBg: "#8b5cf6",  to: "/tasks" },
                { label: "Upload Document",  icon: Upload,      iconBg: "#3b82f6",  to: "/documents" },
                { label: "Contact Support",  icon: Headphones,  iconBg: "#10b981",  to: "/tickets" },
              ].map((a) => (
                <button key={a.label} onClick={() => navigate(a.to)}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border hover:border-border/60 bg-muted/40 hover:bg-muted/80 transition-all group text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-105"
                    style={{ background: a.iconBg }}>
                    <a.icon className="h-5 w-5 text-white" strokeWidth={1.75} />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground leading-tight">{a.label}</span>
                </button>
              ))}
            </div>

            {/* Recent Docs mini */}
            <div className="border-t border-border px-5 py-3 flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-foreground">Recent Documents</p>
                <button onClick={() => navigate("/documents")} className="text-[10px] font-semibold hover:underline" style={{ color: BRAND }}>
                  All
                </button>
              </div>
              <div className="space-y-1.5">
                {recentDocs.slice(0, 3).map((d) => (
                  <button key={d.id} onClick={() => navigate("/documents")}
                    className="w-full flex items-center gap-2 hover:bg-muted/60 px-1 py-1.5 rounded-lg transition-colors text-left">
                    <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-[8px] font-bold uppercase text-muted-foreground shrink-0">
                      {d.file_type || "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{d.title}</p>
                      <p className="text-[10px] text-muted-foreground">{timeAgo(d.updated_at)}</p>
                    </div>
                  </button>
                ))}
                {recentDocs.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-3">No documents yet.</p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="pt-4 pb-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">DMW Robotics</span>
            <span>© 2023 DMW Industrial Systems GMBH</span>
          </div>
          <div className="flex items-center gap-5">
            {["Security Policy", "API Docs", "Privacy", "Terms of Service"].map((l) => (
              <button key={l} className="hover:text-foreground transition-colors">{l}</button>
            ))}
          </div>
        </footer>

      </div>
    </div>
  );
}