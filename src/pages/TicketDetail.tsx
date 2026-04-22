import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Paperclip, Send, Clock, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip, PriorityChip } from "@/components/StatusChip";
import { tickets } from "@/data/mock";
import { cn } from "@/lib/utils";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return <Navigate to="/tickets" replace />;

  const slaPercent = Math.min(100, Math.max(0, (ticket.slaHoursRemaining / 48) * 100));
  const slaCritical = ticket.slaHoursRemaining < 8 && ticket.slaHoursRemaining > 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <button
        onClick={() => navigate("/tickets")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to tickets
      </button>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold tabular-nums text-muted-foreground">{ticket.id}</span>
            <PriorityChip priority={ticket.priority} />
            <StatusChip status={ticket.status} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-2">{ticket.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="card-elevated">
            <CardContent className="p-6 space-y-5">
              {ticket.thread.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm font-semibold">No replies yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to add context for the engineering team.</p>
                </div>
              ) : (
                ticket.thread.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 animate-fade-in",
                      msg.role === "customer" ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <Avatar className={cn("h-9 w-9 shrink-0", msg.role === "engineer" && "ring-2 ring-accent/30")}>
                      <AvatarFallback className={cn(
                        "text-xs font-semibold",
                        msg.role === "engineer" ? "bg-gradient-accent text-accent-foreground" : "bg-muted",
                      )}>{msg.initials}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "flex-1 max-w-[80%]",
                      msg.role === "customer" ? "items-end" : "items-start",
                    )}>
                      <div className={cn(
                        "flex items-center gap-2 mb-1",
                        msg.role === "customer" ? "justify-end" : "justify-start",
                      )}>
                        <span className="text-xs font-semibold">{msg.author}</span>
                        <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                      </div>
                      <div className={cn(
                        "rounded-xl border px-4 py-3",
                        msg.role === "customer"
                          ? "bg-accent text-accent-foreground border-accent rounded-tr-sm"
                          : "bg-muted/40 border-border rounded-tl-sm",
                      )}>
                        <p className="text-sm leading-relaxed">{msg.body}</p>
                        {msg.attachments && (
                          <div className="mt-3 space-y-1.5">
                            {msg.attachments.map((a) => (
                              <div key={a.name} className={cn(
                                "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5",
                                msg.role === "customer" ? "border-accent-foreground/20 bg-accent-foreground/10" : "border-border bg-background",
                              )}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <Paperclip className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                  <span className="text-xs font-medium truncate">{a.name}</span>
                                  <span className="text-[10px] opacity-60">{a.size}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {ticket.status !== "closed" && (
                <div className="pt-4 border-t border-border">
                  <Textarea
                    placeholder="Reply to your engineering team…"
                    className="min-h-24 resize-none focus-visible:shadow-glow"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <Button variant="ghost" size="sm">
                      <Paperclip className="h-4 w-4" /> Attach
                    </Button>
                    <Button size="sm" className="bg-gradient-accent hover:opacity-90 shadow-elev-sm">
                      <Send className="h-3.5 w-3.5" /> Send reply
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="card-elevated">
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned engineer</p>
                <div className="flex items-center gap-3 mt-2">
                  <Avatar className="h-10 w-10 ring-2 ring-accent/30">
                    <AvatarFallback className="bg-gradient-accent text-accent-foreground text-xs font-semibold">
                      {ticket.assignedEngineer.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{ticket.assignedEngineer.name}</p>
                    <p className="text-[11px] text-muted-foreground">{ticket.assignedEngineer.role}</p>
                  </div>
                </div>
              </div>

              {ticket.status !== "closed" && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">SLA window</p>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-xs font-semibold",
                      slaCritical ? "text-destructive" : "text-success",
                    )}>
                      <Clock className="h-3 w-3" />
                      {ticket.slaHoursRemaining}h left
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        slaCritical ? "bg-destructive" : "bg-success",
                      )}
                      style={{ width: `${slaPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Created</p>
                  <p className="text-xs font-semibold tabular-nums mt-0.5">{ticket.createdAt}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last update</p>
                  <p className="text-xs font-semibold tabular-nums mt-0.5">{ticket.lastUpdated}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</p>
              <div className="mt-3 space-y-1.5">
                <Button variant="outline" size="sm" className="w-full justify-start">Mark as resolved</Button>
                <Button variant="outline" size="sm" className="w-full justify-start">Escalate priority</Button>
                <Button variant="outline" size="sm" className="w-full justify-start">Request call</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
