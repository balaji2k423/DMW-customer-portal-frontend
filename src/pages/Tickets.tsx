import { useNavigate } from "react-router-dom";
import { Plus, ChevronRight, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusChip, PriorityChip } from "@/components/StatusChip";
import { tickets } from "@/data/mock";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Tickets() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const filtered = tickets.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()) || t.id.toLowerCase().includes(query.toLowerCase()));

  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in-progress").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Engineering support</p>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-1">Support tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Direct line to your DMW engineering team — average first response under 2 hours.
          </p>
        </div>
        <Button
          className="bg-gradient-accent hover:opacity-90 shadow-elev-sm hover:shadow-glow transition-all"
          onClick={() => toast({ title: "New ticket", description: "Open the ticket composer (demo)." })}
        >
          <Plus className="h-4 w-4" /> Raise new ticket
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open", value: counts.open, accent: "text-warning", bg: "bg-warning/10" },
          { label: "In progress", value: counts.inProgress, accent: "text-accent", bg: "bg-accent/10" },
          { label: "Closed (30d)", value: counts.closed, accent: "text-success", bg: "bg-success/10" },
        ].map((s) => (
          <Card key={s.label} className="card-elevated">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-bold tabular-nums mt-1">{s.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${s.bg}`}>
                <span className={`text-lg font-bold ${s.accent}`}>{s.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID or title…"
              className="h-10 pl-9 bg-muted/40 focus-visible:bg-background"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-3 border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-2">Ticket</div>
          <div className="col-span-5">Title</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Assigned · Updated</div>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/tickets/${t.id}`)}
              className="w-full grid grid-cols-12 items-center px-4 py-4 text-left hover:bg-muted/40 transition-colors group"
            >
              <div className="col-span-2">
                <span className="font-mono text-xs font-semibold tabular-nums">{t.id}</span>
              </div>
              <div className="col-span-5 pr-4 min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-accent transition-colors">{t.title}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{t.description}</p>
              </div>
              <div className="col-span-1">
                <PriorityChip priority={t.priority} />
              </div>
              <div className="col-span-2">
                <StatusChip status={t.status} />
              </div>
              <div className="col-span-2 flex items-center justify-end gap-3">
                <div className="text-right leading-tight">
                  <p className="text-xs font-semibold">{t.assignedEngineer.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.lastUpdated}</p>
                </div>
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] font-semibold bg-muted">{t.assignedEngineer.initials}</AvatarFallback>
                </Avatar>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
