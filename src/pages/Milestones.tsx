import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import {
  CheckCircle2, Clock, Activity, AlertTriangle, Loader2,
  Calendar, Plus, X, ChevronDown, ChevronRight, ChevronLeft,
  ListTodo, Trash2, Check, Circle, ShieldCheck, BadgeCheck,
  FileText, History, RefreshCw, Info, Edit2, ZoomIn, ZoomOut,
  Building2, Users, FolderOpen, Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  milestonesService,
  type Milestone,
  type ProjectOption,
  type CustomerAdminOption,
  type Subtask,
} from "@/services/milestones";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

/* ─── Brand ───────────────────────────────────────────────────────────────── */
const BRAND      = "#E8510A";
const BRAND_DARK = "#C44208";

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface CustomerOption { id: number | string; name: string; }

interface HistoryEntry {
  id: number;
  action: string;
  detail: string;
  old_value: string;
  new_value: string;
  delay_reason: string;
  actor_name: string;
  created_at: string;
}

type UiStatus = "pending" | "in-progress" | "completed" | "delayed" | "cancelled";

const STATUS_MAP: Record<string, UiStatus> = {
  pending: "pending", in_progress: "in-progress",
  completed: "completed", delayed: "delayed", cancelled: "cancelled",
};

/* colours matching the Excel: blue=plan, green=actual, orange=delayed */
const BAR_PLAN    = "#0070C0";
const BAR_ACTUAL  = "#00B050";
const BAR_DELAYED = "#FFC000";

const STATUS_CFG: Record<UiStatus, { label: string; bg: string; text: string; dot: string }> = {
  "pending":     { label: "Pending",     bg: "bg-slate-100 dark:bg-slate-800",     text: "text-slate-500",   dot: "bg-slate-400" },
  "in-progress": { label: "In Progress", bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600",  dot: "bg-orange-500 animate-pulse" },
  "completed":   { label: "Completed",   bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600", dot: "bg-emerald-500" },
  "delayed":     { label: "Delayed",     bg: "bg-rose-50 dark:bg-rose-900/20",     text: "text-rose-600",    dot: "bg-rose-500" },
  "cancelled":   { label: "Cancelled",   bg: "bg-slate-100 dark:bg-slate-800",     text: "text-slate-400",   dot: "bg-slate-300" },
};

const PROJECT_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold",     label: "On Hold" },
  { value: "completed",   label: "Completed" },
  { value: "cancelled",   label: "Cancelled" },
];

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created:          <Plus className="h-3.5 w-3.5 text-emerald-500" />,
  status_changed:   <Activity className="h-3.5 w-3.5 text-blue-500" />,
  date_changed:     <Calendar className="h-3.5 w-3.5 text-orange-500" />,
  rescheduled:      <RefreshCw className="h-3.5 w-3.5 text-amber-500" />,
  signed_off:       <BadgeCheck className="h-3.5 w-3.5 text-violet-500" />,
  sign_off_removed: <X className="h-3.5 w-3.5 text-rose-500" />,
  subtask_added:    <ListTodo className="h-3.5 w-3.5 text-teal-500" />,
  subtask_done:     <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />,
  subtask_approved: <ShieldCheck className="h-3.5 w-3.5 text-violet-500" />,
  comment:          <Info className="h-3.5 w-3.5 text-slate-400" />,
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/* ─── Gantt date maths ───────────────────────────────────────────────────── */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7)); // Monday
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/** Whole weeks between two dates (b - a), floor-rounded. */
const weeksBetween = (
  a: Date | string,
  b: Date | string
) => {
  const start = new Date(a);
  const end = new Date(b);

  return Math.floor(
    (end.getTime() - start.getTime()) /
      (1000 * 60 * 60 * 24 * 7)
  );
};
function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7);
}

/** Hard ceiling so a bad/far-future date can never blow up the DOM. */
const MAX_GANTT_WEEKS = 104; // 2 years

/* ─── Shared input style ────────────────────────────────────────────────── */
const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] outline-none transition-all placeholder:text-muted-foreground/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15";

/* ──────────────────────────────────────────────────────────────────────────
   GANTT CHART COMPONENT
────────────────────────────────────────────────────────────────────────── */

const CELL_W = 40; // px per week column
const ROW_H  = 38; // px per row

interface Phase { label: string; rows: Milestone[] }

/** Single milestone's P/A row pair — memoized so unrelated re-renders (e.g.
 *  opening a side panel) don't force every row in the chart to re-render. */
const MilestoneLeftRows = memo(function MilestoneLeftRows({
  m, canManage, onRowClick, onReschedule,
}: {
  m: Milestone; canManage: boolean;
  onRowClick: (m: Milestone) => void; onReschedule: (m: Milestone) => void;
}) {
  const st = STATUS_MAP[m.status] ?? "pending";
  const cfg = STATUS_CFG[st];
  const isDelayed = m.is_delayed && st !== "completed";

  return (
    <div>
      {/* P (Plan) row */}
      <div
        className="flex cursor-pointer items-center gap-2 border-b border-border/50 px-3 hover:bg-muted/30 transition-colors"
        style={{ height: ROW_H }}
        onClick={() => onRowClick(m)}
      >
        <span className="w-4 shrink-0 text-[10px] font-bold text-muted-foreground/40">P</span>
        <span className="flex-1 truncate text-[13px] font-medium">{m.title}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {isDelayed && <AlertTriangle className="h-3 w-3 text-amber-500" />}
          <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", cfg.bg, cfg.text)}>
            {cfg.label}
          </span>
          {canManage && (
            <button
              onClick={e => { e.stopPropagation(); onReschedule(m); }}
              title="Reschedule"
              className="rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
              <RefreshCw className="h-3 w-3 text-amber-500" />
            </button>
          )}
        </div>
      </div>
      {/* A (Actual) row */}
      <div
        className="flex cursor-pointer items-center gap-2 border-b border-border px-3 hover:bg-muted/20 transition-colors"
        style={{ height: ROW_H }}
        onClick={() => onRowClick(m)}
      >
        <span className="w-4 shrink-0 text-[10px] font-bold text-muted-foreground/40">A</span>
        <span className="flex-1 truncate text-[12px] text-muted-foreground/50">
          {m.actual_date ? fmtShort(m.actual_date) : "—"}
        </span>
        {m.delay_reason && (
          <span className="truncate max-w-[120px] text-[10px] italic text-amber-600/70" title={m.delay_reason}>
            {m.delay_reason}
          </span>
        )}
      </div>
    </div>
  );
});

/** Single milestone's bar row pair in the scrollable grid — memoized. */
const MilestoneBarRows = memo(function MilestoneBarRows({
  m, weeks, weekCount, cellW, startDate, todayOffset, onRowClick,
}: {
  m: Milestone; weeks: Date[]; weekCount: number; cellW: number;
  startDate: Date; todayOffset: number; onRowClick: (m: Milestone) => void;
}) {
  const st = STATUS_MAP[m.status] ?? "pending";
  const isDelayed = m.is_delayed && st !== "completed";

  const barProps = (date: string | null): { left: number; width: number } | null => {
    if (!date) return null;
    const d = new Date(date);
    const ws = getWeekStart(d);
    const offset = weeksBetween(startDate, ws);
    if (offset < 0 || offset >= weekCount) return null;
    return { left: offset * cellW, width: cellW };
  };

  const planBar    = barProps(m.planned_date);
  const actualBar  = barProps(m.actual_date);
  const reschedBar = m.rescheduled_date ? barProps(m.rescheduled_date) : null;

  let planColor = BAR_PLAN;
  if (isDelayed) planColor = BAR_DELAYED;
  if (st === "completed") planColor = BAR_ACTUAL;

  return (
    <div>
      {/* P row */}
      <div className="flex border-b border-border/50 relative cursor-pointer"
        style={{ height: ROW_H }}
        onClick={() => onRowClick(m)}>
        {todayOffset >= 0 && todayOffset < weekCount && (
          <div className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
            style={{ left: todayOffset * cellW + cellW / 2, background: BRAND + "40" }} />
        )}
        {weeks.map((_, i) => (
          <div key={i} className="shrink-0 border-r border-border/20" style={{ width: cellW }} />
        ))}
        {/* Plan bar */}
        {planBar && (
          <div className="absolute top-1/2 -translate-y-1/2 rounded-sm z-20 flex items-center"
            style={{ left: planBar.left + 2, width: Math.max(planBar.width - 4, 6), height: 16, background: planColor }}>
            {st === "completed" && (
              <Check className="h-2.5 w-2.5 text-white shrink-0 ml-0.5" />
            )}
          </div>
        )}
        {/* Rescheduled indicator */}
        {reschedBar && reschedBar.left !== planBar?.left && (
          <div className="absolute top-1/2 -translate-y-1/2 rounded-sm z-15 opacity-40"
            style={{ left: reschedBar.left + 2, width: Math.max(reschedBar.width - 4, 6), height: 16, background: BAR_DELAYED, border: `1px dashed ${BAR_DELAYED}` }} />
        )}
      </div>

      {/* A row */}
      <div className="flex border-b border-border relative cursor-pointer"
        style={{ height: ROW_H }}
        onClick={() => onRowClick(m)}>
        {todayOffset >= 0 && todayOffset < weekCount && (
          <div className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
            style={{ left: todayOffset * cellW + cellW / 2, background: BRAND + "40" }} />
        )}
        {weeks.map((_, i) => (
          <div key={i} className="shrink-0 border-r border-border/20" style={{ width: cellW }} />
        ))}
        {/* Actual bar */}
        {actualBar && (
          <div className="absolute top-1/2 -translate-y-1/2 rounded-sm z-20"
            style={{ left: actualBar.left + 2, width: Math.max(actualBar.width - 4, 6), height: 16, background: BAR_ACTUAL }} />
        )}
      </div>
    </div>
  );
});

function GanttChart({
  milestones,
  canManage,
  onRowClick,
  onReschedule,
  weekCount = 26,
  startDate,
}: {
  milestones: Milestone[];
  canManage: boolean;
  onRowClick: (m: Milestone) => void;
  onReschedule: (m: Milestone) => void;
  weekCount?: number;
  startDate: Date;
}) {
  const [cellW, setCellW] = useState(CELL_W);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Clamp so a bad/far-future date can never explode DOM node count.
  const safeWeekCount = Math.min(Math.max(weekCount, 1), MAX_GANTT_WEEKS);

  const weeks: Date[] = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < safeWeekCount; i++) arr.push(addDays(startDate, i * 7));
    return arr;
  }, [startDate, safeWeekCount]);

  // Group by phase (description prefix "Phase -" or take first word as group)
  const phases: Phase[] = useMemo(() => {
    const result: Phase[] = [];
    const seen = new Set<number>();
    milestones.forEach(m => {
      if (seen.has(m.id)) return;
      const phaseMatch = m.title.match(/^(Phase\s*[-–]\s*\d+[^:]*)/i);
      if (phaseMatch) {
        const label = phaseMatch[1].trim();
        let group = result.find(p => p.label === label);
        if (!group) { group = { label, rows: [] }; result.push(group); }
        group.rows.push(m);
      } else {
        let gen = result.find(p => p.label === "_tasks");
        if (!gen) { gen = { label: "_tasks", rows: [] }; result.push(gen); }
        gen.rows.push(m);
      }
      seen.add(m.id);
    });
    return result;
  }, [milestones]);

  // Month groupings for header
  const monthGroups: { label: string; span: number }[] = useMemo(() => {
    const groups: { label: string; span: number }[] = [];
    weeks.forEach((w) => {
      const label = w.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.span++;
      else groups.push({ label, span: 1 });
    });
    return groups;
  }, [weeks]);

  const today = useMemo(() => getWeekStart(new Date()), []);
  const todayOffset = useMemo(() => weeksBetween(startDate, today), [startDate, today]);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Zoom controls */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Gantt View</span>
          <div className="ml-2 flex items-center gap-1.5">
            <span className="h-3 w-6 rounded-sm" style={{ background: BAR_PLAN }} />
            <span className="text-[11px] text-muted-foreground/60 mr-3">Plan</span>
            <span className="h-3 w-6 rounded-sm" style={{ background: BAR_ACTUAL }} />
            <span className="text-[11px] text-muted-foreground/60 mr-3">Actual</span>
            <span className="h-3 w-6 rounded-sm" style={{ background: BAR_DELAYED }} />
            <span className="text-[11px] text-muted-foreground/60">Delayed</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCellW(w => Math.max(28, w - 6))}
            className="rounded-lg border border-border p-1.5 hover:bg-muted transition-colors">
            <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => setCellW(w => Math.min(72, w + 6))}
            className="rounded-lg border border-border p-1.5 hover:bg-muted transition-colors">
            <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex overflow-hidden">
        {/* Fixed left columns */}
        <div className="shrink-0" style={{ width: 380 }}>
          {/* Header */}
          <div className="border-b border-border bg-muted/40" style={{ height: ROW_H * 2 }}>
            <div className="flex h-full items-end px-4 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Milestone / Task</span>
            </div>
          </div>

          {/* Phase + milestone rows */}
          {phases.map((phase, pi) => (
            <div key={pi}>
              {/* Phase header row */}
              <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-0"
                style={{ height: ROW_H }}>
                <div className="h-2 w-2 rounded-full shrink-0" style={{ background: BRAND }} />
                <span className="text-[12px] font-bold truncate" style={{ color: BRAND }}>
                  {phase.label === "_tasks" ? "Tasks" : phase.label}
                </span>
              </div>
              {/* Milestone rows: P row + A row */}
              {phase.rows.map(m => (
                <MilestoneLeftRows
                  key={m.id}
                  m={m}
                  canManage={canManage}
                  onRowClick={onRowClick}
                  onReschedule={onReschedule}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Scrollable Gantt grid */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto">
          <div style={{ width: weeks.length * cellW, minWidth: "100%" }}>
            {/* Month header */}
            <div className="flex border-b border-border bg-muted/40" style={{ height: ROW_H }}>
              {monthGroups.map((mg, i) => (
                <div key={i} className="shrink-0 border-r border-border/50 flex items-center justify-center"
                  style={{ width: mg.span * cellW }}>
                  <span className="text-[11px] font-bold text-muted-foreground/70">{mg.label}</span>
                </div>
              ))}
            </div>

            {/* Week number header */}
            <div className="flex border-b border-border bg-muted/20" style={{ height: ROW_H }}>
              {weeks.map((w, i) => {
                const isToday = isoDate(w) === isoDate(today);
                return (
                  <div key={i} className={cn("shrink-0 border-r border-border/30 flex flex-col items-center justify-center gap-0.5 relative",
                    isToday && "bg-orange-50 dark:bg-orange-900/20")}
                    style={{ width: cellW }}>
                    {isToday && <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: BRAND }} />}
                    <span className={cn("text-[9px] font-bold", isToday ? "text-orange-500" : "text-muted-foreground/50")}>
                      W{getISOWeekNumber(w)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Phase + milestone bar rows */}
            {phases.map((phase, pi) => (
              <div key={pi}>
                {/* Phase spacer */}
                <div className="flex border-b border-border bg-muted/10 relative" style={{ height: ROW_H }}>
                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset < safeWeekCount && (
                    <div className="absolute top-0 bottom-0 w-px z-10" style={{ left: todayOffset * cellW + cellW / 2, background: BRAND + "60" }} />
                  )}
                  {weeks.map((_, i) => (
                    <div key={i} className="shrink-0 border-r border-border/20" style={{ width: cellW }} />
                  ))}
                </div>

                {/* Milestone bar rows */}
                {phase.rows.map(m => (
                  <MilestoneBarRows
                    key={m.id}
                    m={m}
                    weeks={weeks}
                    weekCount={safeWeekCount}
                    cellW={cellW}
                    startDate={startDate}
                    todayOffset={todayOffset}
                    onRowClick={onRowClick}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MILESTONE DETAIL PANEL (slide-in)
────────────────────────────────────────────────────────────────────────── */

function MilestonePanel({
  milestone,
  canManage,
  canApprove,
  onClose,
  onUpdated,
}: {
  milestone: Milestone;
  canManage: boolean;
  canApprove: boolean;
  onClose: () => void;
  onUpdated: (m: Milestone) => void;
}) {
  const [tab, setTab] = useState<"overview" | "subtasks" | "history">("overview");
  const [subtasks, setSubtasks] = useState<Subtask[]>(milestone.subtasks ?? []);
  const [history, setHistory]   = useState<HistoryEntry[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [newTask, setNewTask]   = useState("");
  const [adding, setAdding]     = useState(false);
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [remarks, setRemarks]   = useState("");
  const [signingOff, setSigningOff] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const st = STATUS_MAP[milestone.status] ?? "pending";
  const cfg = STATUS_CFG[st];
  const isSignedOff = !!milestone.sign_off;

  /* reset subtasks when the selected milestone changes */
  useEffect(() => {
    setSubtasks(milestone.subtasks ?? []);
  }, [milestone.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* load history on tab switch (or when milestone changes while on this tab) */
  useEffect(() => {
    if (tab !== "history") return;
    setHistLoading(true);
    api.get(`/milestones/${milestone.id}/history/`)
      .then(r => setHistory(r.data))
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [tab, milestone.id]);

  /* add subtask */
  const addSubtask = async () => {
    if (!newTask.trim()) return;
    setAdding(true);
    try {
      const s = await milestonesService.createSubtask({ milestone_id: milestone.id, title: newTask.trim(), order: subtasks.length });
      setSubtasks(prev => [...prev, s]);
      setNewTask("");
    } finally { setAdding(false); }
  };

  /* toggle subtask status */
  const toggleSubtask = async (s: Subtask) => {
    const next = s.status === "todo" ? "in_progress" : s.status === "in_progress" ? "done" : "todo";
    const updated = await milestonesService.updateSubtask(s.id, { status: next as any });
    setSubtasks(prev => prev.map(x => x.id === s.id ? updated : x));
  };

  /* status badge quick-change */
  const changeStatus = async (newStatus: string) => {
    setStatusSaving(true);
    try {
      const updated = await milestonesService.update(milestone.id, { status: newStatus });
      onUpdated(updated);
    } finally { setStatusSaving(false); }
  };

  /* sign-off */
  const doSignOff = async () => {
    setSigningOff(true);
    try {
      await milestonesService.signOff(milestone.id, remarks);
      const refreshed = await milestonesService.get(milestone.id);
      onUpdated(refreshed);
      setSignOffOpen(false);
    } finally { setSigningOff(false); }
  };

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative flex h-full w-full max-w-[480px] flex-col border-l border-border bg-card shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Top accent */}
        <div className="h-0.5 shrink-0" style={{ background: `linear-gradient(to right, ${BRAND}, #F97316)` }} />

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-border px-5 py-4">
          <div className="flex-1 min-w-0 pr-3">
            <div className="mb-1.5 flex items-center gap-2 flex-wrap">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold", cfg.bg, cfg.text)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                {cfg.label}
              </span>
              {milestone.is_delayed && st !== "completed" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-2.5 w-2.5" /> Delayed
                </span>
              )}
              {isSignedOff && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                  <BadgeCheck className="h-2.5 w-2.5" /> Signed Off
                </span>
              )}
            </div>
            <h2 className="text-[17px] font-bold leading-tight">{milestone.title}</h2>
            <p className="mt-1 text-[12px] text-muted-foreground/60">
              Planned: {fmt(milestone.planned_date)}
              {milestone.actual_date && ` · Actual: ${fmt(milestone.actual_date)}`}
              {milestone.rescheduled_date && milestone.rescheduled_date !== milestone.planned_date && (
                <span className="ml-1 text-amber-500"> · Rescheduled: {fmt(milestone.rescheduled_date)}</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-border">
          {(["overview", "subtasks", "history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-2.5 text-[12px] font-bold capitalize transition-colors",
                tab === t
                  ? "border-b-2 text-foreground"
                  : "text-muted-foreground/60 hover:text-muted-foreground")}
              style={tab === t ? { borderColor: BRAND, color: BRAND } : {}}>
              {t === "subtasks" ? `Tasks (${subtasks.length})` : t === "history" ? "Audit Log" : "Overview"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && (
            <>
              {/* Description */}
              {milestone.description && (
                <p className="text-[14px] text-muted-foreground leading-relaxed">{milestone.description}</p>
              )}

              {/* Quick status change */}
              {canManage && !isSignedOff && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">Change Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["pending", "in_progress", "completed", "delayed", "cancelled"] as const).map(s => {
                      const k = STATUS_MAP[s] ?? "pending";
                      const c = STATUS_CFG[k];
                      const isCurrent = milestone.status === s;
                      return (
                        <button key={s} disabled={isCurrent || statusSaving}
                          onClick={() => changeStatus(s)}
                          className={cn("rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all border",
                            isCurrent
                              ? `${c.bg} ${c.text} border-current opacity-100 ring-2 ring-offset-1`
                              : "border-border hover:bg-muted text-muted-foreground")}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Project status */}
              {canManage && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">Project Status</p>
                  <div className="relative">
                    <select
                      className={cn(inputCls, "appearance-none pr-10")}
                      defaultValue={(milestone as any).project_status ?? "not_started"}
                      onChange={async e => {
                        await api.patch(`/milestones/${milestone.id}/`, { project_status: e.target.value });
                      }}>
                      {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                  </div>
                </div>
              )}

              {/* Delay info */}
              {milestone.delay_reason && (
                <div className="flex gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/10 p-4">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">Delay Reason</p>
                    <p className="mt-1 text-[13px] text-amber-700/80 dark:text-amber-300/70 leading-relaxed">{milestone.delay_reason}</p>
                    {milestone.rescheduled_date && (
                      <p className="mt-1.5 text-[11px] font-semibold text-amber-600/60">
                        Rescheduled to: {fmt(milestone.rescheduled_date)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Sign-off record */}
              {isSignedOff && milestone.sign_off && (
                <div className="flex gap-3 rounded-xl border border-violet-200 dark:border-violet-500/25 bg-violet-50 dark:bg-violet-900/10 p-4">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-violet-500 mt-0.5" />
                  <div>
                    <p className="text-[12px] font-bold text-violet-700 dark:text-violet-400">Signed Off</p>
                    <p className="mt-0.5 text-[12px] text-violet-600/70">
                      By {milestone.sign_off.signed_by_name} · {fmt(milestone.sign_off.signed_at)}
                    </p>
                    {milestone.sign_off.remarks && (
                      <p className="mt-1.5 text-[12px] italic text-violet-700/60">"{milestone.sign_off.remarks}"</p>
                    )}
                  </div>
                </div>
              )}

              {/* Sign-off button */}
              {canApprove && !isSignedOff && st === "completed" && (
                signOffOpen ? (
                  <div className="space-y-3 rounded-xl border border-border p-4">
                    <p className="text-[13px] font-semibold">Remarks (optional)</p>
                    <textarea
                      className={cn(inputCls, "h-20 resize-none")}
                      placeholder="Add sign-off remarks…"
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setSignOffOpen(false)}
                        className="flex-1 rounded-xl border border-border py-2 text-[13px] font-semibold text-muted-foreground hover:bg-muted">
                        Cancel
                      </button>
                      <button onClick={doSignOff} disabled={signingOff}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-[13px] font-bold text-white disabled:opacity-60"
                        style={{ background: "#7c3aed" }}>
                        {signingOff ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                        Sign Off
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setSignOffOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-900/10 py-3 text-[13px] font-bold text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/20 transition-colors">
                    <BadgeCheck className="h-4 w-4" /> Sign Off Milestone
                  </button>
                )
              )}

              {/* Deliverables */}
              {milestone.deliverables?.length > 0 && (
                <div>
                  <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">
                    Deliverables ({milestone.deliverables.length})
                  </p>
                  <div className="space-y-1.5">
                    {milestone.deliverables.map((d, i) => (
                      <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                        <span className="flex-1 text-[13px] font-medium">{d.title}</span>
                        <span className="text-[10px] font-bold text-muted-foreground/30">{String(i + 1).padStart(2, "0")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── SUBTASKS TAB ── */}
          {tab === "subtasks" && (
            <>
              {subtasks.length === 0 && !canManage && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <ListTodo className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-[14px] text-muted-foreground/40">No subtasks yet</p>
                </div>
              )}
              <div className="space-y-1.5">
                {subtasks.map(s => {
                  const done = s.status === "done" || (s as any).status === "approved";
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 group">
                      <button onClick={() => canManage && toggleSubtask(s)}
                        className={cn("shrink-0 rounded-lg border p-1 transition-all",
                          done
                            ? "border-emerald-300 bg-emerald-500 text-white"
                            : s.status === "in_progress"
                              ? "border-orange-300 bg-orange-100 text-orange-600"
                              : "border-border bg-background text-muted-foreground/30"
                        )}>
                        {done ? <Check className="h-3 w-3" /> : s.status === "in_progress" ? <Activity className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                      </button>
                      <span className={cn("flex-1 text-[13px]", done && "line-through text-muted-foreground/40")}>{s.title}</span>
                      {s.assignee_name && (
                        <span className="text-[10px] text-muted-foreground/40">{s.assignee_name}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {canManage && !isSignedOff && (
                <div className="flex gap-2">
                  <input
                    className={cn(inputCls, "flex-1")}
                    placeholder="Add a task…"
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addSubtask(); }}
                  />
                  <button onClick={addSubtask} disabled={adding || !newTask.trim()}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40 transition-all"
                    style={{ background: BRAND }}>
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === "history" && (
            <>
              {histLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
                </div>
              )}
              {!histLoading && history.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <History className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-[14px] text-muted-foreground/40">No history yet</p>
                </div>
              )}
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex gap-3 rounded-xl border border-border px-4 py-3">
                    <div className="mt-0.5 shrink-0">{ACTION_ICONS[h.action] ?? <Info className="h-3.5 w-3.5 text-slate-400" />}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium leading-relaxed">{h.detail}</p>
                      {h.delay_reason && (
                        <p className="mt-1 text-[11px] italic text-amber-600/70">Reason: {h.delay_reason}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-muted-foreground/50">{h.actor_name}</span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-[11px] text-muted-foreground/40">{fmt(h.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   RESCHEDULE MODAL
────────────────────────────────────────────────────────────────────────── */

function RescheduleModal({
  milestone,
  onSave,
  onClose,
}: { milestone: Milestone; onSave: (date: string, reason: string) => Promise<void>; onClose: () => void }) {
  const [date, setDate]     = useState(milestone.planned_date ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) { setErr("Please provide a reason (min 5 characters)."); return; }
    setSaving(true); setErr(null);
    try { await onSave(date, reason); }
    catch { setErr("Failed to reschedule. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="h-0.5" style={{ background: `linear-gradient(to right, ${BAR_DELAYED}, ${BRAND})` }} />
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-500">Reschedule</p>
            <h2 className="mt-0.5 text-[17px] font-bold">Update Milestone Date</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground/60 truncate max-w-[280px]">{milestone.title}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          {err && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/10 px-4 py-3 text-[13px] text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted-foreground/50">
              Current Planned Date
            </label>
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-[14px] text-muted-foreground/60">
              {fmt(milestone.planned_date)}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted-foreground/50">
              New Planned Date *
            </label>
            <input type="date" className={inputCls} required value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted-foreground/50">
              Reason for Delay / Reschedule *
            </label>
            <textarea
              className={cn(inputCls, "h-28 resize-none")}
              required
              minLength={5}
              placeholder="Describe the reason for rescheduling this milestone…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground/40">This will be recorded in the audit log.</p>
          </div>
          <div className="flex gap-3 border-t border-border pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold text-white disabled:opacity-60"
              style={{ background: BRAND }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {saving ? "Saving…" : "Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   CREATE MILESTONE MODAL
────────────────────────────────────────────────────────────────────────── */

function CreateMilestoneModal({
  projects,
  preselectedProjectId,
  onSave,
  onClose,
}: { projects: ProjectOption[]; preselectedProjectId?: number; onSave: (f: any) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({
    project: preselectedProjectId ?? "" as number | "",
    title: "", description: "", planned_date: "", order: "0", status: "pending",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project) { setErr("Please select a project."); return; }
    setSaving(true); setErr(null);
    try { await onSave(form); }
    catch { setErr("Failed to create milestone."); }
    finally { setSaving(false); }
  };

  const preName = preselectedProjectId
    ? (projects.find(p => p.id === preselectedProjectId)?.name ?? `Project #${preselectedProjectId}`)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="h-0.5" style={{ background: `linear-gradient(to right, ${BRAND}, #F97316)` }} />
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: BRAND }}>New Milestone</p>
            <h2 className="mt-0.5 text-[18px] font-bold">Create Milestone</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          {err && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/10 px-4 py-3 text-[13px] text-rose-600">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted-foreground/50">Project *</label>
            {preName ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-[14px]">
                <FolderOpen className="h-4 w-4 text-muted-foreground/40" />
                <span className="flex-1 font-semibold">{preName}</span>
                <span className="text-[10px] text-muted-foreground/30">locked</span>
              </div>
            ) : (
              <div className="relative">
                <select className={cn(inputCls, "appearance-none pr-10")} value={form.project}
                  onChange={e => setForm(f => ({ ...f, project: e.target.value ? Number(e.target.value) : "" }))} required>
                  <option value="" disabled>Select a project…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted-foreground/50">Title *</label>
            <input className={inputCls} required value={form.title} onChange={set("title")} placeholder="e.g. Design Kickoff" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted-foreground/50">Planned Date *</label>
              <input type="date" className={inputCls} required value={form.planned_date} onChange={set("planned_date")} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted-foreground/50">Status</label>
              <div className="relative">
                <select className={cn(inputCls, "appearance-none pr-10")} value={form.status} onChange={set("status")}>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted-foreground/50">Description</label>
            <textarea className={cn(inputCls, "h-20 resize-none")} value={form.description} onChange={set("description")} placeholder="Brief milestone overview…" />
          </div>
          <div className="flex gap-3 border-t border-border pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold text-white disabled:opacity-60"
              style={{ background: BRAND }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Creating…" : "Create Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   FILTER DROPDOWN
────────────────────────────────────────────────────────────────────────── */

function FilterDropdown<T extends { id: string | number; name: string }>({
  options, selectedId, allLabel, onChange, icon,
}: { options: T[]; selectedId?: T["id"]; allLabel: string; onChange: (id?: T["id"]) => void; icon?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = options.find(o => o.id === selectedId);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className={cn(
          "flex min-w-[150px] items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition-all",
          open || selectedId !== undefined
            ? "border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/5 text-orange-600 dark:text-orange-400"
            : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
        )}>
        {icon && <span className="shrink-0 opacity-50">{icon}</span>}
        <span className="flex-1 truncate text-left">{sel?.name ?? allLabel}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="max-h-60 overflow-y-auto p-1.5">
            <button onClick={() => { onChange(undefined); setOpen(false); }}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                selectedId === undefined ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600" : "hover:bg-muted")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", selectedId === undefined ? "bg-orange-500" : "bg-border")} />
              {allLabel}
            </button>
            {options.length > 0 && <div className="my-1 mx-2 h-px bg-border" />}
            {options.map(opt => (
              <button key={opt.id} onClick={() => { onChange(opt.id as any); setOpen(false); }}
                className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                  selectedId === opt.id ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600" : "hover:bg-muted")}>
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", selectedId === opt.id ? "bg-orange-500" : "bg-muted-foreground/30")} />
                <span className="flex-1 truncate text-left">{opt.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MAIN PAGE
────────────────────────────────────────────────────────────────────────── */

export default function Milestones({ projectId: propProjectId }: { projectId?: number } = {}) {
  const { user } = useAuth();
  const isAdmin   = user?.role === "admin";
  const isManager = user?.role === "project_manager";
  const canManage = isAdmin || isManager;
  const canApprove = user?.role === "customer_admin" || isAdmin || isManager;

  const [projects, setProjects]       = useState<ProjectOption[]>([]);
  const [customers, setCustomers]     = useState<CustomerOption[]>([]);
  const [customerAdmins, setCustomerAdmins] = useState<CustomerAdminOption[]>([]);
  const [milestones, setMilestones]   = useState<Milestone[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [activeProjectId, setActiveProjectId]       = useState<number | undefined>(propProjectId);
  const [activeCustomerId, setActiveCustomerId]     = useState<number | string | undefined>();
  const [activeCustomerAdminId, setActiveCAId]      = useState<number | undefined>();

  const [selected, setSelected]   = useState<Milestone | null>(null);
  const [reschedule, setReschedule] = useState<Milestone | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  /* Gantt window start = earliest planned date of visible milestones, or today.
     Memoized so it isn't recomputed (with fresh Date objects) on every render. */
  const ganttStart = useMemo(() => {
    if (milestones.length === 0) return getWeekStart(new Date());
    const dates = milestones
      .map(m => new Date(m.planned_date))
      .filter(d => !isNaN(d.getTime()));
    if (dates.length === 0) return getWeekStart(new Date());
    return getWeekStart(dates.reduce((a, b) => (a < b ? a : b)));
  }, [milestones]);

  /* Number of weeks the Gantt grid should span: from ganttStart out to the
     furthest planned_date (+4 weeks padding), at least 26, capped at
     MAX_GANTT_WEEKS so a bad/far-future date can't blow up the DOM. */
  const ganttWeekCount = useMemo(() => {
    const maxOffset = milestones.reduce((mx, m) => {
      if (!m.planned_date) return mx;
      const d = new Date(m.planned_date);
      if (isNaN(d.getTime())) return mx;
      const offset = weeksBetween(ganttStart, d);
      return Math.max(mx, offset);
    }, 0);
    const needed = Math.max(26, maxOffset + 4);
    return Math.min(needed, MAX_GANTT_WEEKS);
  }, [milestones, ganttStart]);

  /* filtered customer admins + projects */
  const filteredCAs = useMemo(
    () => (activeCustomerId
      ? customerAdmins.filter(ca => ca.company === activeCustomerId)
      : customerAdmins),
    [customerAdmins, activeCustomerId]
  );

  const filteredProjects = useMemo(() => {
    let r = projects;
    if (activeCustomerId)
      r = r.filter(p => p.customer_id === activeCustomerId || p.customer_name === activeCustomerId);
    if (activeCustomerAdminId) {
      const admin = customerAdmins.find(ca => ca.id === activeCustomerAdminId);
      if (admin?.project_ids?.length)
        r = r.filter(p => admin.project_ids.includes(p.id));
    }
    return r;
  }, [projects, activeCustomerId, activeCustomerAdminId, customerAdmins]);

  const load = useCallback((pid?: number, cid?: number | string, caid?: number) => {
    setLoading(true); setError(null);
    milestonesService.list(pid, cid, caid)
      .then(res => setMilestones(Array.isArray(res) ? res : (res as any).milestones ?? []))
      .catch(() => setError("Failed to load milestones."))
      .finally(() => setLoading(false));
  }, []);

  /* Bootstrap */
  useEffect(() => {
    Promise.all([
      milestonesService.listProjects().catch(() => [] as ProjectOption[]),
      milestonesService.listCustomers().catch(() => [] as CustomerOption[]),
      canManage ? milestonesService.listCustomerAdmins().catch(() => [] as CustomerAdminOption[]) : Promise.resolve([] as CustomerAdminOption[]),
    ]).then(([ps, cs, cas]) => {
      setProjects(ps);
      if (cs?.length > 0) setCustomers(cs);
      if (cas?.length > 0) setCustomerAdmins(cas);

      if (propProjectId) { load(propProjectId); return; }

      if (!canManage && ps.length > 0) {
        setActiveProjectId(ps[0].id);
        load(ps[0].id);
        return;
      }

      if (cs?.length > 0) {
        const firstC = cs[0];
        setActiveCustomerId(firstC.id);
        const cp = ps.filter(p => p.customer_id === firstC.id || p.customer_name === firstC.id);
        const fp = cp[0] ?? ps[0];
        if (fp) { setActiveProjectId(fp.id); load(fp.id, firstC.id); }
        else load(undefined, firstC.id);
      } else if (ps.length > 0) {
        setActiveProjectId(ps[0].id);
        load(ps[0].id);
      } else {
        load();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setActiveProjectId(propProjectId); }, [propProjectId]);

  /* Re-load on filter change */
  const prevFilters = useRef({ pid: activeProjectId, cid: activeCustomerId, caid: activeCustomerAdminId });
  useEffect(() => {
    const prev = prevFilters.current;
    if (prev.pid === activeProjectId && prev.cid === activeCustomerId && prev.caid === activeCustomerAdminId) return;
    prevFilters.current = { pid: activeProjectId, cid: activeCustomerId, caid: activeCustomerAdminId };
    load(activeProjectId, activeCustomerId, activeCustomerAdminId);
  }, [activeProjectId, activeCustomerId, activeCustomerAdminId, load]);

  /* Summary counts */
  const summary = useMemo(() => ({
    total:     milestones.length,
    completed: milestones.filter(m => m.status === "completed").length,
    delayed:   milestones.filter(m => m.is_delayed && m.status !== "completed").length,
    pending:   milestones.filter(m => m.status === "pending").length,
  }), [milestones]);

  const handleMilestoneUpdated = useCallback((updated: Milestone) => {
    setMilestones(prev => prev.map(m => m.id === updated.id ? updated : m));
    setSelected(prev => (prev && prev.id === updated.id ? updated : prev));
  }, []);

  const handleReschedule = useCallback(async (date: string, reason: string) => {
    if (!reschedule) return;
    const { data } = await api.post(`/milestones/${reschedule.id}/reschedule/`, {
      new_planned_date: date, delay_reason: reason,
    });
    handleMilestoneUpdated(data);
    setReschedule(null);
  }, [reschedule, handleMilestoneUpdated]);

  const handleCreate = useCallback(async (form: any) => {
    const m = await milestonesService.create({
      project: Number(form.project),
      title: form.title,
      description: form.description,
      status: form.status,
      planned_date: form.planned_date,
      order: Number(form.order ?? 0),
    });
    setMilestones(prev => [...prev, m]);
    setShowCreate(false);
  }, []);

  const handleRowClick = useCallback((m: Milestone) => setSelected(m), []);
  const handleRowReschedule = useCallback((m: Milestone) => setReschedule(m), []);

  return (
    <div className="flex h-full flex-col bg-background">

      {/* ── Page header ── */}
      <div className="shrink-0 border-b border-border px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">Project Milestones</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground/60">
              Gantt chart view · {summary.total} milestones
              {summary.delayed > 0 && <span className="ml-2 font-semibold text-rose-500">{summary.delayed} delayed</span>}
            </p>
          </div>
          {canManage && (
            <button onClick={() => setShowCreate(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: BRAND }}>
              <Plus className="h-4 w-4" /> New Milestone
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total",     val: summary.total,     color: "text-foreground",    bg: "bg-muted/60" },
            { label: "Completed", val: summary.completed,  color: "text-emerald-600",   bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Delayed",   val: summary.delayed,    color: "text-rose-600",      bg: "bg-rose-50 dark:bg-rose-900/20" },
            { label: "Pending",   val: summary.pending,    color: "text-slate-500",     bg: "bg-slate-50 dark:bg-slate-800/40" },
          ].map(s => (
            <div key={s.label} className={cn("rounded-xl px-4 py-3", s.bg)}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">{s.label}</p>
              <p className={cn("mt-1 text-[22px] font-bold tabular-nums", s.color)}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        {canManage && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FilterDropdown
              options={customers}
              selectedId={activeCustomerId}
              allLabel="All Customers"
              onChange={id => { setActiveCustomerId(id); setActiveCAId(undefined); }}
              icon={<Building2 className="h-3.5 w-3.5" />}
            />
            {filteredCAs.length > 0 && (
              <FilterDropdown
                options={filteredCAs.map(ca => ({ id: ca.id, name: ca.name }))}
                selectedId={activeCustomerAdminId}
                allLabel="All Admins"
                onChange={id => setActiveCAId(id as number | undefined)}
                icon={<Users className="h-3.5 w-3.5" />}
              />
            )}
            <FilterDropdown
              options={filteredProjects.map(p => ({ id: p.id, name: p.name }))}
              selectedId={activeProjectId}
              allLabel="All Projects"
              onChange={id => setActiveProjectId(id as number | undefined)}
              icon={<FolderOpen className="h-3.5 w-3.5" />}
            />
            {(activeCustomerId !== undefined || activeCustomerAdminId !== undefined || (activeProjectId !== undefined && !propProjectId)) && (
              <button
                onClick={() => { setActiveCustomerId(undefined); setActiveCAId(undefined); if (!propProjectId) setActiveProjectId(undefined); }}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto p-6">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
            <p className="text-[15px] font-semibold text-muted-foreground">{error}</p>
            <button onClick={() => load(activeProjectId, activeCustomerId, activeCustomerAdminId)}
              className="rounded-xl border border-border px-4 py-2 text-[13px] font-semibold hover:bg-muted">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && milestones.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
              <Flag className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-[16px] font-bold">No milestones found</p>
              <p className="mt-1 text-[13px] text-muted-foreground/50">
                {canManage ? "Create the first milestone to get started." : "No milestones have been created for this project yet."}
              </p>
            </div>
            {canManage && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white"
                style={{ background: BRAND }}>
                <Plus className="h-4 w-4" /> New Milestone
              </button>
            )}
          </div>
        )}

        {!loading && !error && milestones.length > 0 && (
          <GanttChart
            milestones={milestones}
            canManage={canManage}
            onRowClick={handleRowClick}
            onReschedule={handleRowReschedule}
            startDate={ganttStart}
            weekCount={ganttWeekCount}
          />
        )}
      </div>

      {/* ── Modals / panels ── */}
      {selected && (
        <MilestonePanel
          milestone={selected}
          canManage={canManage}
          canApprove={canApprove}
          onClose={() => setSelected(null)}
          onUpdated={handleMilestoneUpdated}
        />
      )}

      {reschedule && (
        <RescheduleModal
          milestone={reschedule}
          onSave={handleReschedule}
          onClose={() => setReschedule(null)}
        />
      )}

      {showCreate && (
        <CreateMilestoneModal
          projects={projects}
          preselectedProjectId={activeProjectId}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}