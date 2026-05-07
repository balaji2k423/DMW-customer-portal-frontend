import { useEffect, useState } from "react";
import {
  CheckCircle2, Clock, Activity, FileText, BadgeCheck,
  AlertTriangle, Loader2, Calendar, Flag, TrendingUp,
  ArrowLeft, Plus, X, ChevronDown, ChevronRight,
  ListTodo, Trash2, Check, Circle, ShieldCheck,
  GripVertical, BarChart3, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  milestonesService,
  type Milestone,
  type ProjectOption,
  type Subtask,
} from "@/services/milestones";
import { useAuth } from "@/contexts/AuthContext";

/* ─────────────────────────────────────────────────────────────────────────────
   Design system — bold, editorial, data-focused
   Typography scale: readable sizes (no sub-10px body text)
   Accent: orange-500 / amber-400
   Neutral base: zinc
───────────────────────────────────────────────────────────────────────────── */

type UiStatus = "pending" | "in-progress" | "completed" | "delayed" | "cancelled";

const STATUS_MAP: Record<string, UiStatus> = {
  pending: "pending", in_progress: "in-progress",
  completed: "completed", delayed: "delayed", cancelled: "cancelled",
};

const S = {
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25",
    card: "border-l-emerald-400",
    bar: "bg-emerald-500",
    node: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30",
  },
  "in-progress": {
    label: "In Progress",
    dot: "bg-orange-500 animate-pulse",
    text: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/25",
    card: "border-l-orange-400",
    bar: "bg-gradient-to-r from-orange-500 to-amber-400",
    node: "bg-orange-50 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/30",
  },
  delayed: {
    label: "Delayed",
    dot: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/25",
    card: "border-l-rose-400",
    bar: "bg-rose-500",
    node: "bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30",
  },
  pending: {
    label: "Pending",
    dot: "bg-zinc-400",
    text: "text-zinc-500 dark:text-zinc-400",
    badge: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700",
    card: "border-l-zinc-300 dark:border-l-zinc-600",
    bar: "bg-zinc-400",
    node: "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-zinc-300",
    text: "text-zinc-400",
    badge: "bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800",
    card: "border-l-zinc-200 dark:border-l-zinc-800",
    bar: "bg-zinc-300",
    node: "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
  },
} satisfies Record<UiStatus, { label: string; dot: string; text: string; badge: string; card: string; bar: string; node: string }>;

type SubtaskStatus = Subtask["status"] | "approved";

const ST: Record<SubtaskStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  todo:        { label: "To Do",       color: "text-zinc-400",   bg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",              icon: <Circle className="h-4 w-4" />        },
  in_progress: { label: "In Progress", color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400",   icon: <Activity className="h-4 w-4" />      },
  done:        { label: "Done",        color: "text-emerald-500",bg: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",icon: <CheckCircle2 className="h-4 w-4" />  },
  approved:    { label: "Approved",    color: "text-sky-500",    bg: "bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400",               icon: <ShieldCheck className="h-4 w-4" />   },
};

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function progress(m: Milestone): number {
  const st = STATUS_MAP[m.status] ?? "pending";
  if (st === "completed") return 100;
  if (m.subtasks?.length) {
    const done = m.subtasks.filter(s => s.status === "done" || (s as any).status === "approved").length;
    return Math.round((done / m.subtasks.length) * 100);
  }
  return st === "in-progress" ? 45 : st === "delayed" ? 20 : 0;
}

/* ─── Divider ── */
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/50">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ─── Stat card ── */
function StatCard({ value, label, color, icon }: { value: number; label: string; color: string; icon: React.ReactNode }) {
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
   Approve Modal
───────────────────────────────────────────────────────────────────────────── */
function ApproveModal({ title, description, loading, onConfirm, onClose }: {
  title: string; description: string; loading: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-sky-400 to-emerald-400" />
        <div className="p-6">
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-500/10">
              <ShieldCheck className="h-5 w-5 text-sky-500" />
            </div>
            <h3 className="text-lg font-bold">{title}</h3>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-6 flex gap-3">
            <button onClick={onClose} disabled={loading}
              className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-[14px] font-bold text-white hover:bg-sky-600 disabled:opacity-60 transition-colors">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {loading ? "Approving…" : "Approve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Subtask row
───────────────────────────────────────────────────────────────────────────── */
function SubtaskRow({ subtask, canManage, onToggle, onDelete, onApprove }: {
  subtask: Subtask & { status: SubtaskStatus }; canManage: boolean;
  onToggle: (id: number, next: Subtask["status"]) => void;
  onDelete: (id: number) => void;
  onApprove: (id: number) => void;
}) {
  const cfg = ST[subtask.status] ?? ST.todo;
  const isApproved = subtask.status === "approved";
  const nextMap: Record<string, Subtask["status"]> = { todo: "in_progress", in_progress: "done", done: "todo" };

  return (
    <div className={cn(
      "group flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
      isApproved
        ? "border-sky-200 dark:border-sky-500/20 bg-sky-50/40 dark:bg-sky-500/5"
        : "border-border bg-card hover:bg-muted/30 hover:border-border/70"
    )}>
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/20 group-hover:text-muted-foreground/40" />

      {canManage && !isApproved ? (
        <button onClick={() => onToggle(subtask.id, nextMap[subtask.status] ?? "todo")}
          className={cn("shrink-0 transition-transform hover:scale-110", cfg.color)}>
          {cfg.icon}
        </button>
      ) : (
        <span className={cn("shrink-0", cfg.color)}>{cfg.icon}</span>
      )}

      <span className={cn(
        "flex-1 text-[14px] leading-snug",
        isApproved ? "text-muted-foreground/50 line-through" : "font-medium",
        subtask.status === "done" && !isApproved && "text-muted-foreground/60"
      )}>
        {subtask.title}
      </span>

      {subtask.assignee_name && (
        <div className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-[11px] font-bold text-orange-600 dark:text-orange-400 sm:flex">
          {initials(subtask.assignee_name)}
        </div>
      )}

      <span className={cn("rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide", cfg.bg)}>
        {cfg.label}
      </span>

      {canManage && subtask.status === "done" && (
        <button onClick={() => onApprove(subtask.id)}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-3 py-1.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-sky-100 dark:hover:bg-sky-500/20">
          <ShieldCheck className="h-3.5 w-3.5" /> Approve
        </button>
      )}

      {canManage && !isApproved && (
        <button onClick={() => onDelete(subtask.id)}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30 hover:text-rose-500">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Milestone Detail
───────────────────────────────────────────────────────────────────────────── */
function MilestoneDetail({ milestone, index, onBack, canManage, onMilestoneUpdate, onSubtaskChange }: {
  milestone: Milestone; index: number; onBack: () => void; canManage: boolean;
  onMilestoneUpdate: (m: Milestone) => void;
  onSubtaskChange: (id: number, s: Subtask[]) => void;
}) {
  const st  = STATUS_MAP[milestone.status] ?? "pending";
  const cfg = S[st];

  const [mounted, setMounted]     = useState(false);
  const [subtasks, setSubtasks]   = useState<Subtask[]>(milestone.subtasks || []);
  const [newTask, setNewTask]     = useState("");
  const [adding, setAdding]       = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [showApproveM, setShowApproveM] = useState(false);
  const [approvingM, setApprovingM]     = useState(false);
  const [approveStId, setApproveStId]   = useState<number | null>(null);
  const [approvingSt, setApprovingSt]   = useState(false);

  const pct        = progress({ ...milestone, subtasks });
  const doneCount  = subtasks.filter(s => s.status === "done" || (s as any).status === "approved").length;
  const approvedCnt = subtasks.filter(s => (s as any).status === "approved").length;
  const allDone    = subtasks.length > 0 && subtasks.every(s => s.status === "done" || (s as any).status === "approved");
  const isApproved = milestone.status === "completed" && milestone.is_signed_off;

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const addSubtask = async () => {
    if (!newTask.trim()) return;
    setAdding(true);
    try {
      const c = await milestonesService.createSubtask({ milestone_id: milestone.id, title: newTask.trim(), status: "todo", order: subtasks.length });
      const u = [...subtasks, c];
      setSubtasks(u); onSubtaskChange(milestone.id, u);
      setNewTask(""); setShowInput(false);
    } catch {} finally { setAdding(false); }
  };

  const toggleSubtask = async (id: number, status: Subtask["status"]) => {
    const u = subtasks.map(s => s.id === id ? { ...s, status } : s);
    setSubtasks(u); onSubtaskChange(milestone.id, u);
    await milestonesService.updateSubtask(id, { status }).catch(() => {});
  };

  const deleteSubtask = async (id: number) => {
    const u = subtasks.filter(s => s.id !== id);
    setSubtasks(u); onSubtaskChange(milestone.id, u);
    await milestonesService.deleteSubtask(id).catch(() => {});
  };

  const approveSubtask = async () => {
    if (!approveStId) return;
    setApprovingSt(true);
    try {
      await milestonesService.updateSubtask(approveStId, { status: "approved" as any });
      const u = subtasks.map(s => s.id === approveStId ? { ...s, status: "approved" as any } : s);
      setSubtasks(u); onSubtaskChange(milestone.id, u);
    } catch {} finally { setApprovingSt(false); setApproveStId(null); }
  };

  const approveMilestone = async () => {
    setApprovingM(true);
    try {
      const u = await milestonesService.update(milestone.id, { status: "completed" });
      onMilestoneUpdate({ ...milestone, ...u, is_signed_off: true, status: "completed" });
    } catch {} finally { setApprovingM(false); setShowApproveM(false); }
  };

  return (
    <>
      <div
        className={cn(
          "absolute inset-0 overflow-y-auto bg-background transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
          mounted ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        )}
        style={{ zIndex: 10 }}
      >
        {/* Top accent bar */}
        <div className={cn("h-1", isApproved ? "bg-sky-500" : cfg.bar)} />

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-md">
          <div className="flex items-center justify-between px-6 py-3">
            <button onClick={onBack}
              className="group flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <span className={cn("rounded-lg px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide", cfg.badge)}>
                <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle bg-current", st === "in-progress" && "animate-pulse")} />
                {cfg.label}
              </span>
              {milestone.is_signed_off && (
                <span className="flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-[12px] font-bold text-emerald-700 dark:text-emerald-400">
                  <BadgeCheck className="h-3.5 w-3.5" /> Signed off
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Hero ── */}
        <div className="border-b border-border px-6 py-8">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[.2em] text-muted-foreground/50">
            Milestone {String(index).padStart(2, "0")}
          </p>
          <h2 className="text-3xl font-black tracking-tight leading-tight">{milestone.title}</h2>

          {milestone.description && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {milestone.description}
            </p>
          )}

          {/* Meta chips */}
          <div className="mt-5 flex flex-wrap gap-2.5">
            {milestone.owner_name && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/15 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                  {initials(milestone.owner_name)}
                </div>
                <span className="text-[13px] font-semibold">{milestone.owner_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2">
              <Calendar className="h-4 w-4 text-muted-foreground/50" />
              <span className="text-[13px] text-muted-foreground">Planned</span>
              <span className="text-[13px] font-bold">{fmt(milestone.planned_date)}</span>
            </div>
            {milestone.actual_date && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2">
                <Clock className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-[13px] text-muted-foreground">Actual</span>
                <span className={cn("text-[13px] font-bold",
                  milestone.actual_date <= milestone.planned_date ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
                )}>
                  {fmt(milestone.actual_date)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2">
              <FileText className="h-4 w-4 text-muted-foreground/50" />
              <span className="text-[13px] text-muted-foreground">Deliverables</span>
              <span className="text-[13px] font-bold">{milestone.deliverable_count}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6 max-w-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-muted-foreground">
                {subtasks.length > 0 ? `${doneCount} of ${subtasks.length} subtasks complete` : "Progress"}
                {approvedCnt > 0 && <span className="ml-2 text-sky-500">· {approvedCnt} approved</span>}
              </span>
              <span className={cn("text-[15px] font-black tabular-nums", cfg.text)}>{pct}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all duration-1000 delay-300", cfg.bar)}
                style={{ width: mounted ? `${pct}%` : "0%" }} />
            </div>
          </div>

          {/* Approve milestone CTA */}
          {canManage && !isApproved && milestone.status !== "cancelled" && (
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => setShowApproveM(true)}
                disabled={subtasks.length > 0 && !allDone}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-bold transition-all",
                  allDone || subtasks.length === 0
                    ? "bg-sky-500 text-white hover:bg-sky-600 shadow-sm"
                    : "bg-muted text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                <ShieldCheck className="h-4 w-4" /> Approve Milestone
              </button>
              {subtasks.length > 0 && !allDone && (
                <span className="text-[13px] text-muted-foreground/50">Complete all subtasks first</span>
              )}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-8 space-y-10">

          {/* Subtasks section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                  <ListTodo className="h-4 w-4 text-orange-500" />
                </div>
                <h3 className="text-[17px] font-bold">Subtasks</h3>
                {subtasks.length > 0 && (
                  <span className="rounded-lg bg-muted px-2.5 py-1 text-[12px] font-bold text-muted-foreground">
                    {doneCount}/{subtasks.length}
                  </span>
                )}
              </div>
              {canManage && (
                <button onClick={() => setShowInput(true)}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2 text-[13px] font-semibold text-muted-foreground transition-all hover:border-orange-400/60 hover:bg-orange-50 dark:hover:bg-orange-500/5 hover:text-orange-600 dark:hover:text-orange-400">
                  <Plus className="h-4 w-4" /> Add subtask
                </button>
              )}
            </div>

            {subtasks.length === 0 && !showInput && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-14">
                <ListTodo className="mb-3 h-10 w-10 text-muted-foreground/15" />
                <p className="text-[15px] font-semibold text-muted-foreground/50">No subtasks yet</p>
                {canManage && <p className="mt-1 text-[13px] text-muted-foreground/30">Break this milestone into actionable steps</p>}
              </div>
            )}

            <div className="space-y-2">
              {subtasks.map(s => (
                <SubtaskRow key={s.id} subtask={s as any} canManage={canManage}
                  onToggle={toggleSubtask} onDelete={deleteSubtask} onApprove={setApproveStId} />
              ))}
            </div>

            {showInput && (
              <div className="mt-3 flex gap-2.5">
                <input
                  autoFocus
                  className="flex-1 rounded-xl border border-orange-400/50 bg-background px-4 py-2.5 text-[14px] outline-none ring-2 ring-orange-400/15 placeholder:text-muted-foreground/30"
                  placeholder="What needs to be done?"
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") addSubtask();
                    if (e.key === "Escape") { setShowInput(false); setNewTask(""); }
                  }}
                />
                <button onClick={addSubtask} disabled={adding || !newTask.trim()}
                  className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50 hover:bg-orange-600 transition-colors">
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Add
                </button>
                <button onClick={() => { setShowInput(false); setNewTask(""); }}
                  className="rounded-xl border border-border px-3 text-muted-foreground hover:bg-muted transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>

          {/* Deliverables section */}
          {milestone.deliverables?.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <h3 className="text-[17px] font-bold">Deliverables</h3>
              </div>
              <div className="space-y-2">
                {milestone.deliverables.map((d, i) => (
                  <div key={d.id} className="flex items-center gap-3.5 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </div>
                    <span className="flex-1 text-[14px] font-medium">{d.title}</span>
                    <span className="text-[12px] font-bold text-muted-foreground/30">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Alerts */}
          {milestone.is_delayed && st !== "completed" && (
            <div className="flex gap-3.5 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5 px-5 py-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <p className="text-[14px] font-bold text-rose-700 dark:text-rose-400">Behind schedule</p>
                <p className="mt-0.5 text-[13px] text-rose-600/70 dark:text-rose-400/60 leading-relaxed">
                  This milestone has passed its planned date. Review the timeline and update accordingly.
                </p>
              </div>
            </div>
          )}

          {milestone.sign_off && (
            <div className="flex gap-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 px-5 py-4">
              <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
              <div>
                <p className="text-[14px] font-bold text-emerald-700 dark:text-emerald-400">Signed off</p>
                <p className="mt-0.5 text-[13px] text-emerald-600/70 dark:text-emerald-400/60">
                  By {milestone.sign_off.signed_by_name} · {fmt(milestone.sign_off.signed_at)}
                </p>
                {milestone.sign_off.remarks && (
                  <p className="mt-1.5 text-[13px] italic text-emerald-700/60 dark:text-emerald-400/60">
                    "{milestone.sign_off.remarks}"
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showApproveM && (
        <ApproveModal title="Approve this milestone?"
          description={`Mark "${milestone.title}" as completed and approved. This will be permanently recorded.`}
          loading={approvingM} onConfirm={approveMilestone} onClose={() => setShowApproveM(false)} />
      )}
      {approveStId !== null && (
        <ApproveModal title="Approve subtask?"
          description={`Approve "${subtasks.find(s => s.id === approveStId)?.title}"? This action cannot be undone.`}
          loading={approvingSt} onConfirm={approveSubtask} onClose={() => setApproveStId(null)} />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Project Dropdown
───────────────────────────────────────────────────────────────────────────── */
function ProjectDropdown({ projects, selectedId, showAll, onChange }: {
  projects: ProjectOption[]; selectedId: number | undefined;
  showAll: boolean; onChange: (id: number | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const sel = projects.find(p => p.id === selectedId);
  if (projects.length === 0) return null;
  const canSwitch = showAll || projects.length > 1;

  return (
    <div className="relative">
      <button
        onClick={() => canSwitch && setOpen(v => !v)}
        className={cn(
          "flex min-w-[190px] items-center gap-2.5 rounded-xl border px-4 py-2.5 text-[14px] font-semibold transition-all",
          open ? "border-orange-400/50 bg-orange-50 dark:bg-orange-500/5 text-orange-600 dark:text-orange-400"
               : "border-border bg-card hover:bg-muted/50",
          !canSwitch && "cursor-default"
        )}
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full", selectedId ? "bg-orange-500" : "bg-zinc-400")} />
        <span className="flex-1 truncate text-left">
          {sel?.name ?? (showAll ? "All Projects" : projects[0]?.name ?? "Projects")}
        </span>
        {canSwitch && <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />}
      </button>

      {open && canSwitch && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 min-w-[230px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="p-1.5">
              {showAll && (
                <>
                  <button onClick={() => { onChange(undefined); setOpen(false); }}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold transition-colors",
                      !selectedId ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400" : "hover:bg-muted")}>
                    <span className={cn("h-2 w-2 rounded-full", !selectedId ? "bg-orange-500" : "bg-transparent")} />
                    All Projects
                    {!selectedId && <Check className="ml-auto h-4 w-4" />}
                  </button>
                  <div className="my-1.5 mx-3 h-px bg-border" />
                </>
              )}
              {projects.map(p => (
                <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); }}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold transition-colors",
                    selectedId === p.id ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400" : "hover:bg-muted")}>
                  <span className={cn("h-2 w-2 shrink-0 rounded-full bg-orange-500", selectedId !== p.id && "opacity-25")} />
                  <span className="flex-1 truncate text-left">{p.name}</span>
                  {selectedId === p.id && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Create Milestone Modal
───────────────────────────────────────────────────────────────────────────── */
const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 placeholder:text-muted-foreground/30";

type MilestoneForm = {
  project: number | ""; title: string; description: string;
  planned_date: string; order: string; status: string;
};

function MilestoneCreateModal({ preselectedProjectId, projects, onSave, onClose }: {
  preselectedProjectId?: number; projects: ProjectOption[];
  onSave: (f: MilestoneForm) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<MilestoneForm>({
    project: preselectedProjectId ?? "", title: "", description: "",
    planned_date: "", order: "0", status: "pending",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof MilestoneForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project) { setErr("Please select a project."); return; }
    setSaving(true); setErr(null);
    try { await onSave(form); }
    catch { setErr("Failed to create milestone. Please try again."); }
    finally { setSaving(false); }
  };

  const preName = preselectedProjectId
    ? projects.find(p => p.id === preselectedProjectId)?.name ?? `Project #${preselectedProjectId}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-400" />
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-orange-500">New milestone</p>
            <h2 className="mt-0.5 text-[18px] font-bold">Create milestone</h2>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-6">
          {err && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/8 px-4 py-3 text-[13px] text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">Project *</label>
            {preName ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-[14px]">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="flex-1 font-semibold">{preName}</span>
                <span className="text-[11px] text-muted-foreground/40 font-medium">locked</span>
              </div>
            ) : (
              <div className="relative">
                <select className={cn(inputCls, "appearance-none pr-10", !form.project && "text-muted-foreground/40")}
                  value={form.project}
                  onChange={e => setForm(f => ({ ...f, project: e.target.value ? Number(e.target.value) : "" }))} required>
                  <option value="" disabled>Select a project…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">Title *</label>
            <input className={inputCls} required value={form.title} onChange={set("title")} placeholder="e.g. Factory Acceptance Test" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">Planned Date *</label>
              <input type="date" className={inputCls} required value={form.planned_date} onChange={set("planned_date")} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">Status</label>
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
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">Display Order</label>
            <input type="number" min="0" className={inputCls} value={form.order} onChange={set("order")} placeholder="0" />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">Description</label>
            <textarea className={`${inputCls} h-24 resize-none`} value={form.description} onChange={set("description")} placeholder="Brief milestone overview…" />
          </div>

          <div className="flex gap-3 border-t border-border pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-[14px] font-bold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Creating…" : "Create Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────────── */
export default function Milestones({ projectId: propProjectId }: { projectId?: number } = {}) {
  const { user }  = useAuth();
  const isAdmin   = user?.role === "admin";
  const isManager = user?.role === "project_manager";
  const canManage = isAdmin || isManager;

  const [projects, setProjects]               = useState<ProjectOption[]>([]);
  const [milestones, setMilestones]           = useState<Milestone[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [selected, setSelected]               = useState<{ milestone: Milestone; index: number } | null>(null);
  const [showCreate, setShowCreate]           = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<number | undefined>(propProjectId);

  useEffect(() => {
    milestonesService.listProjects()
      .then(ps => {
        setProjects(ps);
        if (!propProjectId && !canManage && ps.length > 0) setActiveProjectId(ps[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { setActiveProjectId(propProjectId); }, [propProjectId]);

  const load = (pid?: number) => {
    setLoading(true); setError(null);
    milestonesService.list(pid)
      .then(setMilestones)
      .catch(() => setError("Failed to load milestones."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(activeProjectId); }, [activeProjectId]);

  const handleFilter   = (id: number | undefined) => { setActiveProjectId(id); setSelected(null); };
  const handleMUpdate  = (m: Milestone) => {
    setMilestones(p => p.map(x => x.id === m.id ? m : x));
    if (selected?.milestone.id === m.id) setSelected(p => p ? { ...p, milestone: m } : null);
  };
  const handleStChange = (mid: number, subtasks: Subtask[]) => {
    setMilestones(p => p.map(m => m.id === mid ? { ...m, subtasks } : m));
    if (selected?.milestone.id === mid) setSelected(p => p ? { ...p, milestone: { ...p.milestone, subtasks } } : null);
  };
  const handleCreate = async (form: MilestoneForm) => {
    if (!form.project) return;
    await milestonesService.create({
      project: Number(form.project), title: form.title,
      description: form.description, status: form.status,
      planned_date: form.planned_date, order: Number(form.order) || 0,
    });
    setShowCreate(false); load(activeProjectId);
  };

  const total      = milestones.length;
  const completed  = milestones.filter(m => m.status === "completed").length;
  const delayed    = milestones.filter(m => m.is_delayed).length;
  const inProgress = milestones.filter(m => m.status === "in_progress").length;
  const pct        = total > 0 ? Math.round((completed / total) * 100) : 0;

  /* ── States ── */
  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="h-12 w-12 rounded-full border-2 border-border" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-orange-500" />
        </div>
        <p className="text-[13px] font-semibold text-muted-foreground/60">Loading milestones…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
          <AlertTriangle className="h-7 w-7 text-rose-500" />
        </div>
        <div>
          <p className="text-[15px] font-bold">{error}</p>
          <button onClick={() => load(activeProjectId)} className="mt-1 text-[13px] font-semibold text-orange-500 hover:underline">
            Try again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative overflow-hidden">

      {/* ── List view ── */}
      <div className={cn(
        "transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
        selected ? "-translate-x-12 opacity-0 pointer-events-none" : "translate-x-0 opacity-100"
      )}>

        {/* ── Page header ── */}
        <div className="mb-8">

          {/* Title + controls row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div>
              <div className="mb-1 flex items-center gap-2.5">
                <div className="h-0.5 w-5 bg-orange-500" />
                <span className="text-[11px] font-bold uppercase tracking-[.2em] text-orange-500">
                  Project Tracking
                </span>
              </div>
              <h1 className="text-[28px] font-black tracking-tight leading-none">Milestones</h1>
              {projects.find(p => p.id === activeProjectId) && (
                <p className="mt-1.5 text-[14px] font-medium text-muted-foreground">
                  {projects.find(p => p.id === activeProjectId)?.name}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ProjectDropdown
                projects={projects} selectedId={activeProjectId}
                showAll={canManage} onChange={handleFilter}
              />
              {canManage && (
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-[14px] font-bold text-white shadow-sm shadow-orange-500/20 transition-all hover:bg-orange-600 hover:shadow-orange-500/30">
                  <Plus className="h-4 w-4" /> New Milestone
                </button>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            <StatCard value={total}      label="Total"       color="text-foreground"                           icon={<Layers className="h-5 w-5" />}       />
            <StatCard value={completed}  label="Completed"   color="text-emerald-600 dark:text-emerald-400"   icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} />
            <StatCard value={inProgress} label="In Progress" color="text-orange-600 dark:text-orange-400"     icon={<Activity className="h-5 w-5 text-orange-500" />}     />
            <StatCard value={delayed}    label="Delayed"     color="text-rose-600 dark:text-rose-400"         icon={<AlertTriangle className="h-5 w-5 text-rose-500" />}  />
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div className="rounded-2xl border border-border bg-card px-6 py-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="h-4 w-4 text-orange-500" />
                  <span className="text-[14px] font-bold">Overall Progress</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold text-muted-foreground">
                    {completed} <span className="text-muted-foreground/40">/ {total} completed</span>
                  </span>
                  <span className="rounded-lg bg-orange-500/10 px-3 py-1 text-[14px] font-black text-orange-600 dark:text-orange-400">
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700"
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Empty state ── */}
        {milestones.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-24">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <Flag className="h-8 w-8 text-muted-foreground/20" />
            </div>
            <p className="text-[16px] font-bold text-muted-foreground/60">No milestones yet</p>
            <p className="mt-1.5 text-[14px] text-muted-foreground/40">
              {canManage ? "Create the first milestone using the button above." : "Milestones will appear here once added."}
            </p>
          </div>
        )}

        {/* ── Timeline ── */}
        {milestones.length > 0 && (
          <div className="space-y-1">
            <Divider label={`${milestones.length} milestone${milestones.length !== 1 ? "s" : ""}`} />

            <div className="space-y-2 pt-2">
              {milestones.map((m, i) => {
                const st        = STATUS_MAP[m.status] ?? "pending";
                const cfg       = S[st];
                const isActive  = st === "in-progress";
                const pct       = progress(m);
                const stCount   = m.subtasks?.length ?? 0;
                const doneSt    = m.subtasks?.filter(s => s.status === "done" || (s as any).status === "approved").length ?? 0;
                const appSt     = m.subtasks?.filter(s => (s as any).status === "approved").length ?? 0;
                const projLabel = !activeProjectId && projects.length > 1
                  ? projects.find(p => p.id === m.project)?.name : null;

                return (
                  <button
                    key={m.id}
                    onClick={() => setSelected({ milestone: m, index: i + 1 })}
                    className={cn(
                      "group w-full border-l-[3px] rounded-xl border border-border bg-card text-left transition-all duration-200",
                      "hover:shadow-md hover:-translate-y-px hover:border-border/70",
                      cfg.card,
                      st === "cancelled" && "opacity-40",
                      isActive && "shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-5 px-5 py-4">

                      {/* Index */}
                      <div className="hidden w-8 shrink-0 sm:block">
                        <span className="text-[13px] font-black text-muted-foreground/25">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div className={cn(
                        "hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:flex",
                        cfg.node
                      )}>
                        {st === "completed"    && <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2.5} />}
                        {st === "in-progress"  && <Activity className="h-4 w-4 text-orange-500" strokeWidth={2} />}
                        {st === "delayed"      && <AlertTriangle className="h-4 w-4 text-rose-500" strokeWidth={2} />}
                        {(st === "pending" || st === "cancelled") && (
                          <Circle className="h-4 w-4 text-muted-foreground/30" />
                        )}
                      </div>

                      {/* Title + meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5 mb-1">
                          <p className="text-[15px] font-bold leading-snug">{m.title}</p>
                          <span className={cn("rounded-lg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", cfg.badge)}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {m.is_signed_off && (
                            <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <BadgeCheck className="h-3.5 w-3.5" /> Signed off
                            </span>
                          )}
                          {stCount > 0 && (
                            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground/60">
                              <ListTodo className="h-3.5 w-3.5" />
                              {doneSt}/{stCount} subtasks
                              {appSt > 0 && <span className="text-sky-500">· {appSt} approved</span>}
                            </span>
                          )}
                          {projLabel && (
                            <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground/50">
                              {projLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: progress + dates */}
                      <div className="hidden shrink-0 items-center gap-6 md:flex">
                        {stCount > 0 && (
                          <div className="w-24 space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-[11px] font-semibold text-muted-foreground/50">{pct}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className={cn("h-full rounded-full", cfg.bar)} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground/40">Planned</p>
                          <p className="mt-0.5 text-[13px] font-bold tabular-nums">{fmt(m.planned_date)}</p>
                        </div>
                        {m.actual_date && (
                          <div className="text-right">
                            <p className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground/40">Actual</p>
                            <p className={cn("mt-0.5 text-[13px] font-bold tabular-nums",
                              m.actual_date <= m.planned_date ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
                            )}>
                              {fmt(m.actual_date)}
                            </p>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/20 transition-all group-hover:translate-x-0.5 group-hover:text-orange-500" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Detail slide-in ── */}
      {selected && (
        <MilestoneDetail
          milestone={selected.milestone} index={selected.index}
          onBack={() => setSelected(null)} canManage={canManage}
          onMilestoneUpdate={handleMUpdate} onSubtaskChange={handleStChange}
        />
      )}

      {/* ── Create modal ── */}
      {showCreate && canManage && (
        <MilestoneCreateModal
          preselectedProjectId={activeProjectId} projects={projects}
          onSave={handleCreate} onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}