import { LayoutDashboard, GitBranch, FolderOpen, LifeBuoy, Bell, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { notifications, tickets } from "@/data/mock";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, end: true },
  { title: "Milestones", url: "/milestones", icon: GitBranch },
  { title: "Documents", url: "/documents", icon: FolderOpen },
  { title: "Support Tickets", url: "/tickets", icon: LifeBuoy },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const openTickets = tickets.filter((t) => t.status !== "closed").length;

  const badges: Record<string, number> = {
    "Notifications": unreadNotifs,
    "Support Tickets": openTickets,
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 px-4 flex items-center justify-center border-b border-sidebar-border">
        <Logo showText={!collapsed} />
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10 px-3">
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg text-sm font-medium text-sidebar-foreground transition-all",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold [&>span.indicator]:opacity-100"
                    >
                      <span
                        className="indicator absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-accent opacity-0 transition-opacity"
                        aria-hidden
                        style={{ boxShadow: "0 0 12px hsl(var(--accent) / 0.6)" }}
                      />
                      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.title}</span>
                          {badges[item.title] > 0 && (
                            <Badge className="h-5 min-w-5 px-1.5 bg-accent text-accent-foreground text-[10px] font-semibold rounded-full">
                              {badges[item.title]}
                            </Badge>
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter className="px-3 py-4 border-t border-sidebar-border">
          <div className="rounded-lg bg-gradient-hero p-3 text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-glow opacity-50" aria-hidden />
            <div className="relative">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">Project</p>
              <p className="text-xs font-semibold mt-1 leading-tight">PRJ-2041</p>
              <p className="text-[11px] text-primary-foreground/80 mt-0.5">Northwind Auto</p>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
