import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Clock, Activity, AlertCircle, FileText,
  ChevronRight, FolderOpen, Plus, Calendar, Loader2,
  RefreshCw, Wifi, WifiOff, TrendingUp, BarChart2,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { milestonesService, type Milestone } from "@/services/milestones";
import { ticketsService, type Ticket, type TicketSummary } from "@/services/tickets";
import { documentsService, type Document } from "@/services/documents";

// ─── Config ───────────────────────────────────────────────────────────────────
const POLL_INTERVAL = 10_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Marquee ──────────────────────────────────────────────────────────────────
function MarqueeStrip({ children, speed = 40 }: { children: React.ReactNode; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      className="overflow-hidden w-full"
      style={{ maskImage: "linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)" }}
    >
      <div
        ref={ref}
        className="flex gap-4 w-max"
        style={{ animation: `marquee ${speed}s linear infinite` }}
        onMouseEnter={() => ref.current && (ref.current.style.animationPlayState = "paused")}
        onMouseLeave={() => ref.current && (ref.current.style.animationPlayState = "running")}
      >
        {children}
        {children}
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ milestone }: { milestone: Milestone }) {
  const cfg: Record<string, { bg: string; text: string; border: string; label: string; progress: number }> = {
    completed:   { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Completed",   progress: 100 },
    in_progress: { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    label: "In Progress", progress: 55  },
    pending:     { bg: "bg-gray-100",   text: "text-gray-500",    border: "border-gray-200",    label: "Pending",     progress: 0   },
    delayed:     { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   label: "Delayed",     progress: 30  },
    cancelled:   { bg: "bg-red-50",     text: "text-red-600",     border: "border-red-200",     label: "Cancelled",   progress: 0   },
  };
  const s = cfg[milestone.status] ?? cfg.pending;
  return (
    <div className="flex-shrink-0 w-72 bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-default">
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wide", s.bg, s.text, s.border)}>
          {s.label}
        </span>
        {milestone.planned_date && (
          <span className="text-[10px] font-medium text-gray-400">{formatShortDate(milestone.planned_date)}</span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900 leading-tight line-clamp-1">{milestone.title}</p>
        {milestone.description && (
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{milestone.description}</p>
        )}
      </div>
      <div className="mt-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-gray-400">Progress</span>
          <span className="text-[10px] font-bold text-slate-700">{s.progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", milestone.status === "completed" ? "bg-emerald-500" : milestone.status === "delayed" ? "bg-amber-400" : "bg-blue-500")}
            style={{ width: `${s.progress}%` }}
          />
        </div>
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

  const [data, setData]             = useState<DashboardData>({ milestones: [], tickets: [], documents: [], summary: null });
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [online, setOnline]         = useState(true);
  const timerRef                    = useRef<ReturnType<typeof setInterval>>();

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
  const criticalCount        = openTickets.filter((t) => t.priority === "critical").length;
  const highCount            = openTickets.filter((t) => t.priority === "high").length;
  const recentDocs           = [...documents].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);

  const statusProgressMap: Record<string, number> = {
    completed: 100, in_progress: 55, pending: 0, delayed: 30, cancelled: 0,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: "#f0f2f5" }}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500 font-medium">Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .line-clamp-1 { display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      `}</style>

      <div className="min-h-screen w-full font-sans" style={{ background: "#f0f2f5" }}>
        <div className="w-full max-w-screen-2xl mx-auto px-6 py-6 space-y-5">

          {/* ── Top Bar ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DMW Robotics · Enterprise Portal</p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">Project Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border",
                online ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-100"
              )}>
                {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {online ? "Live" : "Offline"}
              </div>
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-slate-900 px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:border-gray-300 transition-all"
              >
                <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
                {refreshing ? "Refreshing…" : lastUpdated ? `Updated ${timeAgo(lastUpdated.toISOString())}` : "Refresh"}
              </button>
              
            </div>
          </div>

          {/* ── Hero + KPIs ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-12 gap-5">

            {/* Hero — 8 cols */}
            <div className="col-span-12 lg:col-span-8 relative overflow-hidden rounded-2xl bg-slate-900 text-white">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-700/10 rounded-full blur-3xl translate-y-1/2" />
              </div>
              <div className="relative p-7 flex gap-8 h-full">
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/25 rounded-full px-3 py-1 mb-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">In Progress</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight leading-snug">
                      {nextMilestone?.title ?? "Commissioning Phase – In Progress"}
                    </h2>
                    <p className="text-sm text-gray-300 mt-2 leading-relaxed max-w-lg line-clamp-2">
                      {nextMilestone?.description ?? "Factory Automation Line A is undergoing final calibration. Sensors and actuator synchronization are reaching optimal performance metrics."}
                    </p>
                  </div>
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Overall Completion</span>
                      <span className="text-2xl font-bold text-white tabular-nums">{overallProgress}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-700"
                        style={{ width: `${overallProgress}%`, boxShadow: "0 0 8px rgba(59,130,246,0.6)" }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1.5">
                      <span>{completedMilestones} completed · {inProgressMilestones} in progress</span>
                      <span>{milestones.length - completedMilestones} remaining</span>
                    </div>
                  </div>
                </div>
                {/* Milestone counters panel */}
                <div className="hidden lg:flex flex-col justify-center gap-3 border-l border-white/10 pl-8 shrink-0">
                  {[
                    { label: "Total",       value: milestones.length,                                       color: "text-white" },
                    { label: "Completed",   value: completedMilestones,                                     color: "text-emerald-400" },
                    { label: "In Progress", value: inProgressMilestones,                                    color: "text-blue-400" },
                    { label: "Pending",     value: milestones.filter(m => m.status === "pending").length,   color: "text-gray-400" },
                    { label: "Delayed",     value: milestones.filter(m => m.status === "delayed").length,   color: "text-amber-400" },
                  ].map((s) => (
                    <div key={s.label} className="text-center min-w-[68px]">
                      <p className={cn("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI cards — 4 cols, 2x2 grid */}
            <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-3">
              {[
                {
                  label: "Overall Progress", value: `${overallProgress}%`,
                  sub: `${completedMilestones}/${milestones.length} milestones`,
                  icon: TrendingUp, iconBg: "bg-blue-50", iconColor: "text-blue-600",
                  trend: overallProgress > 0 ? { val: "+4.2%", up: true } : null,
                },
                {
                  label: "Open Tickets", value: String(summary?.open ?? openTickets.length),
                  sub: `${criticalCount} critical · ${highCount} high`,
                  icon: AlertCircle, iconBg: criticalCount > 0 ? "bg-red-50" : "bg-gray-50",
                  iconColor: criticalCount > 0 ? "text-red-500" : "text-gray-400",
                  trend: criticalCount > 0 ? { val: `${criticalCount} critical`, up: false } : null,
                },
                {
                  label: "Next Milestone",
                  value: nextMilestone?.planned_date ? formatShortDate(nextMilestone.planned_date) : "—",
                  sub: nextMilestone?.title?.slice(0, 22) ?? "No upcoming",
                  icon: Calendar, iconBg: "bg-indigo-50", iconColor: "text-indigo-600",
                  trend: null,
                },
                {
                  label: "Documents", value: String(documents.length),
                  sub: recentDocs[0] ? `Latest ${timeAgo(recentDocs[0].updated_at)}` : "No documents",
                  icon: FileText, iconBg: "bg-slate-50", iconColor: "text-slate-500",
                  trend: null,
                },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", k.iconBg)}>
                      <k.icon className={cn("h-4 w-4", k.iconColor)} strokeWidth={1.75} />
                    </div>
                    {k.trend && (
                      <span className={cn("text-[10px] font-bold flex items-center gap-0.5", k.trend.up ? "text-emerald-600" : "text-red-500")}>
                        {k.trend.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {k.trend.val}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{k.label}</p>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5 tabular-nums">{k.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{k.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Milestone Marquee ────────────────────────────────────────── */}
          {milestones.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-bold text-slate-900">All Milestones</span>
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{milestones.length} total</span>
                </div>
                <button onClick={() => navigate("/milestones")} className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 hover:underline">
                  View All <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <MarqueeStrip speed={Math.max(20, milestones.length * 6)}>
                {milestones.map((m) => <ProjectCard key={m.id} milestone={m} />)}
              </MarqueeStrip>
            </div>
          )}

          {/* ── Main 3-panel grid ────────────────────────────────────────── */}
          <div className="grid grid-cols-12 gap-5 items-start">

            {/* Milestone Timeline — 5 cols */}
            <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Milestone Timeline</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">{milestones.length} milestones · {completedMilestones} completed</p>
                </div>
                <button onClick={() => navigate("/milestones")} className="text-[11px] font-semibold text-blue-600 flex items-center gap-0.5 hover:underline">
                  Full Roadmap <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {milestones.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-12">No milestones yet.</p>
                )}
                {milestones.map((m, i) => {
                  const progress = statusProgressMap[m.status] ?? 0;
                  return (
                    <div key={m.id} className="relative flex gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group">
                      {i < milestones.length - 1 && (
                        <div className="absolute left-[39px] top-14 bottom-0 w-px bg-gray-100 z-0" />
                      )}
                      <div className={cn(
                        "relative z-10 flex h-8 w-8 items-center justify-center rounded-full shrink-0 mt-0.5 border-2 transition-transform group-hover:scale-105",
                        m.status === "completed"   ? "bg-emerald-500 border-emerald-500 text-white" :
                        m.status === "in_progress" ? "bg-slate-900 border-slate-900 text-white" :
                        m.status === "delayed"     ? "bg-amber-400 border-amber-400 text-white" :
                        m.status === "cancelled"   ? "bg-red-400 border-red-400 text-white" :
                        "bg-white border-gray-200 text-gray-400",
                      )}>
                        {m.status === "completed"   ? <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> :
                         m.status === "in_progress" ? <Activity className="h-4 w-4" strokeWidth={2} /> :
                         m.status === "delayed"     ? <AlertCircle className="h-4 w-4" strokeWidth={2} /> :
                         <Clock className="h-4 w-4" strokeWidth={2} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 leading-tight">{m.title}</p>
                            {m.description && (
                              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{m.description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 pt-0.5">
                            {m.planned_date && (
                              <p className="text-[10px] font-mono text-gray-400">{formatDate(m.planned_date)}</p>
                            )}
                            {m.status === "in_progress" && (
                              <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">Active</span>
                            )}
                            {m.status === "delayed" && (
                              <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">Delayed</span>
                            )}
                            {m.status === "completed" && (
                              <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">Done</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                m.status === "completed"   ? "bg-emerald-500" :
                                m.status === "delayed"     ? "bg-amber-400" :
                                m.status === "cancelled"   ? "bg-red-400" :
                                m.status === "in_progress" ? "bg-blue-500" : "bg-gray-200"
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 tabular-nums w-7 text-right">{progress}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Open Tickets — 4 cols */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Support Tickets</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">{openTickets.length} open · {criticalCount} critical</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">{openTickets.length}</span>
                  <button onClick={() => navigate("/tickets")} className="text-[11px] text-blue-600 font-semibold flex items-center gap-0.5 hover:underline">
                    All <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {openTickets.length > 0 && (
                <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-4">
                  {[
                    { label: "Critical", count: criticalCount,                                      color: "bg-red-500" },
                    { label: "High",     count: highCount,                                           color: "bg-orange-400" },
                    { label: "Other",    count: openTickets.length - criticalCount - highCount,      color: "bg-gray-300" },
                  ].map((p) => (
                    <div key={p.label} className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", p.color)} />
                      <span className="text-[10px] text-gray-500 font-medium">{p.count} {p.label}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
                {openTickets.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-10">No open tickets.</p>
                )}
                {openTickets.slice(0, 8).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      t.priority === "critical" ? "bg-red-500" :
                      t.priority === "high"     ? "bg-orange-400" :
                      t.priority === "medium"   ? "bg-amber-400" : "bg-gray-300",
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{t.subject}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {t.ticket_id} · {t.assigned_to_name ?? "Unassigned"} · {timeAgo(t.updated_at)}
                      </p>
                    </div>
                    <div className={cn(
                      "text-[9px] font-bold uppercase px-2 py-0.5 rounded border shrink-0",
                      t.status === "open"        ? "bg-blue-50 text-blue-600 border-blue-200" :
                      t.status === "in_progress" ? "bg-slate-50 text-slate-600 border-slate-200" :
                      t.status === "on_hold"     ? "bg-amber-50 text-amber-600 border-amber-200" :
                      "bg-gray-50 text-gray-500 border-gray-200",
                    )}>
                      {t.status?.replace("_", " ")}
                    </div>
                  </button>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-gray-50">
                <button
                  onClick={() => navigate("/tickets")}
                  className="w-full text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl py-2 transition-colors"
                >
                  View All Tickets
                </button>
              </div>
            </div>

            {/* Right col — Activity + Documents + Quick Actions */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-5">

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">Latest updates</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {tickets.slice(0, 2).map((t) => (
                    <div key={t.id} className="flex gap-3 px-5 py-3.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 shrink-0 mt-0.5">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 leading-snug line-clamp-1">{t.subject}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{t.ticket_id} · {timeAgo(t.updated_at)}</p>
                      </div>
                    </div>
                  ))}
                  {recentDocs.slice(0, 2).map((d) => (
                    <div key={d.id} className="flex gap-3 px-5 py-3.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 shrink-0 mt-0.5">
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 leading-snug line-clamp-1">{d.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{d.category} · {timeAgo(d.updated_at)}</p>
                      </div>
                    </div>
                  ))}
                  {tickets.length === 0 && documents.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">No recent activity.</p>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Documents</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">{documents.length} total</p>
                  </div>
                  <button onClick={() => navigate("/documents")} className="text-[11px] text-blue-600 font-semibold flex items-center gap-0.5 hover:underline">
                    All <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentDocs.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">No documents yet.</p>
                  )}
                  {recentDocs.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => navigate("/documents")}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[9px] font-bold uppercase text-slate-500 shrink-0">
                        {d.file_type || "—"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{d.title}</p>
                        <p className="text-[10px] text-gray-400">{d.version} · {timeAgo(d.updated_at)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>
                </div>
                <div className="p-3 space-y-1.5">
                  {[
                    { label: "View Milestones", desc: "Project roadmap",    icon: Calendar,   iconBg: "bg-slate-900", iconColor: "text-white", to: "/milestones" },
                    { label: "Open Documents",  desc: "Manuals & reports",  icon: FolderOpen, iconBg: "bg-slate-700", iconColor: "text-white", to: "/documents"  },
                    { label: "Raise Ticket",    desc: "Request support",    icon: Plus,       iconBg: "bg-blue-600",  iconColor: "text-white", to: "/tickets"    },
                  ].map((a) => (
                    <button
                      key={a.label}
                      onClick={() => navigate(a.to)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all text-left group"
                    >
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-transform group-hover:scale-105", a.iconBg)}>
                        <a.icon className={cn("h-4 w-4", a.iconColor)} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900">{a.label}</p>
                        <p className="text-[10px] text-gray-400">{a.desc}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <footer className="pt-5 pb-2 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">DMW Robotics</span>
              <span>© 2023 DMW Industrial Systems GMBH</span>
            </div>
            <div className="flex items-center gap-5">
              {["Security Policy", "API Docs", "Privacy", "Terms of Service"].map((l) => (
                <button key={l} className="hover:text-slate-900 transition-colors">{l}</button>
              ))}
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}