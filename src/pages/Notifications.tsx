import { GitBranch, FileText, LifeBuoy, Settings, CheckCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { notifications, type NotificationItem } from "@/data/mock";
import { cn } from "@/lib/utils";

const iconFor = (type: NotificationItem["type"]) => {
  switch (type) {
    case "milestone": return GitBranch;
    case "document": return FileText;
    case "ticket": return LifeBuoy;
    default: return Settings;
  }
};

const colorFor = (type: NotificationItem["type"]) => {
  switch (type) {
    case "milestone": return "text-success bg-success/10";
    case "document": return "text-accent bg-accent/10";
    case "ticket": return "text-warning bg-warning/10";
    default: return "text-muted-foreground bg-muted";
  }
};

const groupOrder = ["Today", "Yesterday", "Earlier this week", "Older"];

const groupOf = (timestamp: string): typeof groupOrder[number] => {
  if (timestamp.includes("hour")) return "Today";
  if (timestamp.toLowerCase().includes("yesterday")) return "Yesterday";
  if (timestamp.includes("days ago")) return "Earlier this week";
  return "Older";
};

export default function Notifications() {
  const grouped = groupOrder.map((g) => ({
    group: g,
    items: notifications.filter((n) => groupOf(n.timestamp) === g),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Activity feed</p>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-1">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything that's happening across your project — chronologically.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </Button>
      </div>

      <div className="space-y-6">
        {grouped.map((g) => (
          <div key={g.group}>
            <div className="flex items-center gap-3 mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{g.group}</p>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Card className="card-elevated overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  {g.items.map((n, idx) => {
                    const Icon = iconFor(n.type);
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "relative flex gap-4 p-4 transition-colors hover:bg-muted/40",
                          idx !== g.items.length - 1 && "border-b border-border",
                          !n.read && "bg-accent/[0.03]",
                        )}
                      >
                        {!n.read && (
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-accent shadow-glow" />
                        )}
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ml-2", colorFor(n.type))}>
                          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold leading-snug">{n.title}</p>
                            <span className="text-[11px] text-muted-foreground shrink-0">{n.timestamp}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
