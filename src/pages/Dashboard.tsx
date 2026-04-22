import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Calendar, LifeBuoy, FileText, ArrowUpRight,
  GitBranch, FolderOpen, Plus, ChevronRight, Activity, Clock, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusChip, PriorityChip } from "@/components/StatusChip";
import { project, milestones, tickets, documents, recentActivity } from "@/data/mock";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();

  const nextMilestone = milestones.find((m) => m.status === "in-progress") ?? milestones.find((m) => m.status === "pending");
  const openTickets = tickets.filter((t) => t.status !== "closed");
  const recentDocs = [...documents].sort((a, b) => b.updatedDate.localeCompare(a.updatedDate)).slice(0, 4);

  const kpis = [
    { label: "Overall Progress", value: `${project.overallProgress}%`, sub: "On track", icon: TrendingUp, trend: "+4% this week", accent: "text-success" },
    { label: "Next Milestone", value: nextMilestone?.name.split(" ").slice(0, 3).join(" ") ?? "—", sub: nextMilestone?.plannedDate ?? "", icon: Calendar, trend: `Due ${nextMilestone?.plannedDate}`, accent: "text-accent" },
    { label: "Open Tickets", value: String(openTickets.length), sub: `${openTickets.filter(t => t.priority === "high" || t.priority === "critical").length} high priority`, icon: LifeBuoy, trend: "1 awaiting reply", accent: "text-warning" },
    { label: "Documents Updated", value: String(recentDocs.length), sub: "in the last 14 days", icon: FileText, trend: "Latest: today", accent: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">{project.customer}</p>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-1">Project overview</h1>
          <p className="text-sm text-muted-foreground mt-1">{project.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/documents")}>
            <FolderOpen className="h-4 w-4" /> Documents
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/milestones")}>
            <GitBranch className="h-4 w-4" /> Milestones
          </Button>
          <Button size="sm" className="bg-gradient-accent hover:opacity-90 shadow-elev-sm hover:shadow-glow transition-all" onClick={() => navigate("/tickets")}>
            <Plus className="h-4 w-4" /> Raise ticket
          </Button>
        </div>
      </div>

      {/* Project status banner */}
      <Card className="relative overflow-hidden border-0 bg-gradient-hero text-primary-foreground shadow-elev-lg">
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-glow/20 blur-3xl" />
        <CardContent className="relative p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-success animate-pulse-dot" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-foreground/80">
                  Current Phase · {project.phase}
                </p>
              </div>
              <h2 className="text-xl lg:text-2xl font-bold mt-2">Commissioning Phase — In Progress</h2>
              <p className="text-sm text-primary-foreground/75 mt-1.5 max-w-xl">
                Factory Acceptance Testing in progress. On-site installation kicks off May 10, 2026.
              </p>
            </div>
            <div className="lg:w-80 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-foreground/70">Overall completion</span>
                <span className="text-2xl font-bold tabular-nums">{project.overallProgress}%</span>
              </div>
              <div className="h-2 bg-primary-foreground/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-glow to-primary-foreground rounded-full animate-progress shadow-[0_0_12px_hsl(var(--primary-glow)/0.6)]"
                  style={{ width: `${project.overallProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-primary-foreground/70">
                <span>Started {project.startDate}</span>
                <span>Target {project.targetCompletion}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <Card key={k.label} className="card-elevated group cursor-default" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted group-hover:bg-accent/10 transition-colors">
                  <k.icon className={cn("h-[18px] w-[18px] text-muted-foreground group-hover:text-accent transition-colors")} strokeWidth={1.75} />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-4">{k.label}</p>
              <p className="text-2xl font-bold tracking-tight mt-1 tabular-nums">{k.value}</p>
              <p className={cn("text-xs font-medium mt-2", k.accent)}>{k.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Milestone preview */}
        <Card className="card-elevated lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Milestone progress</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Tracking 6 milestones across the program</p>
            </div>
            <Button variant="ghost" size="sm" className="text-accent" onClick={() => navigate("/milestones")}>
              View all <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.slice(0, 4).map((m) => (
              <div key={m.id} className="group flex items-center gap-4 p-3 rounded-lg border border-border hover:border-accent/30 hover:bg-muted/30 transition-all">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                  m.status === "completed" && "bg-success/10",
                  m.status === "in-progress" && "bg-accent/10",
                  m.status === "pending" && "bg-muted",
                )}>
                  {m.status === "completed" ? (
                    <CheckCircle2 className="h-[18px] w-[18px] text-success" strokeWidth={2} />
                  ) : m.status === "in-progress" ? (
                    <Activity className="h-[18px] w-[18px] text-accent animate-pulse-dot" strokeWidth={2} />
                  ) : (
                    <Clock className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={2} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold truncate">{m.name}</p>
                    <StatusChip status={m.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <Progress value={m.progress} className="h-1.5 flex-1" />
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground w-9 text-right">{m.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity timeline */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Latest updates across your project</p>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-5 pl-6">
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
              {recentActivity.map((a) => (
                <div key={a.id} className="relative">
                  <div className="absolute -left-[22px] top-0.5 h-3 w-3 rounded-full border-2 border-background bg-accent shadow-glow" />
                  <p className="text-sm font-medium leading-snug">{a.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{a.meta}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Open tickets */}
        <Card className="card-elevated lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Open tickets</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{openTickets.length} active conversations</p>
            </div>
            <Button variant="ghost" size="sm" className="text-accent" onClick={() => navigate("/tickets")}>
              All tickets <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {openTickets.slice(0, 4).map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className="w-full text-left flex items-center gap-4 p-3 rounded-lg border border-border hover:border-accent/30 hover:bg-muted/30 transition-all"
              >
                <div className="flex flex-col items-center w-16 shrink-0">
                  <span className="text-[10px] font-mono font-semibold text-muted-foreground">{t.id}</span>
                  <PriorityChip priority={t.priority} className="mt-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Updated {t.lastUpdated} · {t.assignedEngineer.name}</p>
                </div>
                <StatusChip status={t.status} />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Recent documents */}
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">Recent documents</CardTitle>
            <Button variant="ghost" size="sm" className="text-accent" onClick={() => navigate("/documents")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentDocs.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate("/documents")}
                className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-[10px] font-bold uppercase text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                  {d.type}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">{d.version} · {d.updatedDate}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "View milestones", desc: "Track planned vs actual delivery", icon: GitBranch, to: "/milestones" },
          { title: "Open documents", desc: "Browse drawings, manuals & reports", icon: FolderOpen, to: "/documents" },
          { title: "Raise a ticket", desc: "Get help from your engineering team", icon: Plus, to: "/tickets", primary: true },
        ].map((a) => (
          <button
            key={a.title}
            onClick={() => navigate(a.to)}
            className={cn(
              "group relative overflow-hidden text-left rounded-xl border p-5 transition-all duration-300 hover:shadow-elev-lg hover:-translate-y-0.5",
              a.primary
                ? "border-accent/30 bg-gradient-accent text-accent-foreground hover:shadow-glow"
                : "border-border bg-card hover:border-accent/30",
            )}
          >
            <div className="flex items-center justify-between">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                a.primary ? "bg-accent-foreground/15" : "bg-muted group-hover:bg-accent/10",
              )}>
                <a.icon className={cn("h-5 w-5", a.primary ? "text-accent-foreground" : "text-foreground group-hover:text-accent")} strokeWidth={1.75} />
              </div>
              <ArrowUpRight className={cn("h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5", a.primary ? "text-accent-foreground/80" : "text-muted-foreground")} />
            </div>
            <p className="text-base font-semibold mt-4">{a.title}</p>
            <p className={cn("text-xs mt-1", a.primary ? "text-accent-foreground/80" : "text-muted-foreground")}>{a.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
