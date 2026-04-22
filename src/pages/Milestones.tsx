import { CheckCircle2, Clock, Activity, FileText, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { StatusChip } from "@/components/StatusChip";
import { milestones } from "@/data/mock";
import { cn } from "@/lib/utils";

export default function Milestones() {
  const completedCount = milestones.filter((m) => m.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Project tracking</p>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-1">Milestones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {completedCount} of {milestones.length} milestones complete · Full traceability across the program lifecycle.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <Card className="card-elevated overflow-hidden">
        <CardContent className="p-6">
          <div className="relative">
            <div className="absolute left-0 right-0 top-5 h-0.5 bg-border" />
            <div
              className="absolute left-0 top-5 h-0.5 bg-gradient-accent shadow-[0_0_12px_hsl(var(--accent)/0.5)] transition-all"
              style={{ width: `${(completedCount / (milestones.length - 1)) * 100}%` }}
            />
            <div className="relative grid grid-cols-6 gap-2">
              {milestones.map((m, i) => (
                <div key={m.id} className="flex flex-col items-center text-center">
                  <div
                    className={cn(
                      "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background transition-all",
                      m.status === "completed" && "border-success bg-success text-success-foreground",
                      m.status === "in-progress" && "border-accent bg-background text-accent shadow-glow",
                      m.status === "pending" && "border-border text-muted-foreground",
                    )}
                  >
                    {m.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
                    ) : m.status === "in-progress" ? (
                      <Activity className="h-4 w-4 animate-pulse-dot" strokeWidth={2.5} />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold mt-3 leading-tight line-clamp-2">{m.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{m.plannedDate}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {milestones.map((m, i) => (
          <Card
            key={m.id}
            className={cn(
              "card-elevated relative overflow-hidden",
              m.status === "in-progress" && "border-accent/30",
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {m.status === "in-progress" && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-accent" />
            )}
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold text-muted-foreground">{m.id}</span>
                    {m.signedOff && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                        <BadgeCheck className="h-3 w-3" /> Signed off
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold mt-1 leading-tight">{m.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{m.description}</p>
                </div>
                <StatusChip status={m.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Planned</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5">{m.plannedDate}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actual</p>
                  <p className={cn(
                    "text-sm font-semibold tabular-nums mt-0.5",
                    m.actualDate && m.actualDate <= m.plannedDate && "text-success",
                    m.actualDate && m.actualDate > m.plannedDate && "text-warning",
                  )}>
                    {m.actualDate ?? "—"}
                  </p>
                </div>
              </div>

              {m.status !== "pending" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Progress</span>
                    <span className="text-xs font-semibold tabular-nums">{m.progress}%</span>
                  </div>
                  <Progress value={m.progress} className="h-1.5" />
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] font-semibold bg-muted">{m.owner.initials}</AvatarFallback>
                  </Avatar>
                  <div className="leading-tight">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Owner</p>
                    <p className="text-xs font-semibold">{m.owner.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{m.deliverables.length} deliverable{m.deliverables.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {m.deliverables.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.deliverables.map((d) => (
                    <span key={d} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      <FileText className="h-3 w-3" /> {d}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
