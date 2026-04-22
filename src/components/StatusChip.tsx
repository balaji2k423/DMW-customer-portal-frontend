import { cn } from "@/lib/utils";
import type { MilestoneStatus, TicketPriority, TicketStatus } from "@/data/mock";

const statusStyles: Record<MilestoneStatus | TicketStatus, string> = {
  "completed": "bg-success/10 text-success border-success/20",
  "in-progress": "bg-accent/10 text-accent border-accent/20",
  "pending": "bg-muted text-muted-foreground border-border",
  "open": "bg-warning/10 text-warning border-warning/20",
  "closed": "bg-muted text-muted-foreground border-border",
};

const statusLabel: Record<string, string> = {
  "completed": "Completed",
  "in-progress": "In Progress",
  "pending": "Pending",
  "open": "Open",
  "closed": "Closed",
};

const priorityStyles: Record<TicketPriority, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-accent/10 text-accent border-accent/20",
  high: "bg-highlight/10 text-highlight border-highlight/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

export function StatusChip({ status, className }: { status: MilestoneStatus | TicketStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        statusStyles[status],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-success": status === "completed",
        "bg-accent animate-pulse-dot": status === "in-progress",
        "bg-muted-foreground": status === "pending" || status === "closed",
        "bg-warning": status === "open",
      })} />
      {statusLabel[status]}
    </span>
  );
}

export function PriorityChip({ priority, className }: { priority: TicketPriority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        priorityStyles[priority],
        className,
      )}
    >
      {priority}
    </span>
  );
}
