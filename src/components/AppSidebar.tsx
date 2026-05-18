import { useState } from "react";
import {
  LayoutDashboard,
  GitBranch,
  FolderOpen,
  LifeBuoy,
  Bell,
  User,
  ChevronRight,
  Briefcase,
  Users,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { useTicketCount } from "@/hooks/useTicketCount";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { title: "Dashboard",       url: "/",              icon: LayoutDashboard, end: true },
  { title: "Milestones",      url: "/milestones",    icon: GitBranch },
  { title: "Documents",       url: "/documents",     icon: FolderOpen },
  { title: "Support Tickets", url: "/tickets",       icon: LifeBuoy },
  { title: "Notifications",   url: "/notifications", icon: Bell },
  { title: "Profile",         url: "/profile",       icon: User },
];

const adminItems = [
  { title: "Projects",        url: "/admin/projects", icon: Briefcase },
  { title: "Users",           url: "/admin/users",    icon: Users },
  { title: "Company Master",  url: "/admin/company",  icon: Building2 },
];

function NavItem({
  item,
  isHovered,
  badge,
}: {
  item: { title: string; url: string; icon: React.ElementType; end?: boolean };
  isHovered: boolean;
  badge?: number;
}) {
  return (
    <li>
      <NavLink
        to={item.url}
        end={item.end}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-2.5 py-2.5",
          "text-[13px] font-medium text-muted-foreground",
          "transition-colors duration-150",
          "hover:text-foreground hover:bg-muted",
          !isHovered && "justify-center"
        )}
        activeClassName="!text-orange-500 !bg-orange-500/10"
      >
        {/* Active left bar */}
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-orange-500 opacity-0 group-[.active]:opacity-100 transition-opacity" />

        <item.icon
          className="h-[22px] w-[22px] shrink-0 transition-transform duration-150 group-hover:scale-110"
          strokeWidth={1.75}
        />

        <span
          className={cn(
            "whitespace-nowrap transition-all duration-300 leading-none",
            isHovered
              ? "opacity-100 translate-x-0 w-auto"
              : "opacity-0 -translate-x-1 w-0 overflow-hidden"
          )}
        >
          {item.title}
        </span>

        {isHovered && badge && badge > 0 ? (
          <Badge className="ml-auto h-4 min-w-4 px-1 text-[10px] font-semibold leading-none border-none bg-orange-100 text-orange-500 rounded-full">
            {badge > 99 ? "99+" : badge}
          </Badge>
        ) : null}

        {!isHovered && badge && badge > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 ring-1 ring-background" />
        ) : null}
      </NavLink>
    </li>
  );
}

export function AppSidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuth();

  const unreadNotifs = useNotificationCount();
  const openTickets  = useTicketCount();

  const isAdmin   = user?.role === "admin";
  const isManager = user?.role === "project_manager";
  const showAdmin = isAdmin || isManager;

  const badges: Record<string, number> = {
    Notifications:     unreadNotifs,
    "Support Tickets": openTickets,
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative h-full z-30"
    >
      <aside
        className={cn(
          "flex h-full flex-col border-r border-border bg-card shadow-sm",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isHovered ? "w-60" : "w-[3.75rem]"
        )}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400/60 to-transparent" />

        {/* Logo */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-border transition-all duration-300",
            isHovered ? "px-4" : "justify-center px-0"
          )}
        >
          <Logo showText={isHovered} />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">

          {/* Main nav items */}
          <ul className="space-y-0.5">
            {items.map((item) => (
              <NavItem
                key={item.title}
                item={item}
                isHovered={isHovered}
                badge={badges[item.title]}
              />
            ))}
          </ul>

          {/* Admin section */}
          {showAdmin && (
            <div className="mt-4">
              <div className="mb-2 px-1">
                {isHovered ? (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3 shrink-0 text-orange-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-400">
                      Admin
                    </span>
                    <div className="flex-1 h-px bg-orange-200 dark:bg-orange-900/40" />
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="h-px w-5 bg-border" />
                  </div>
                )}
              </div>

              <ul className="space-y-0.5">
                {adminItems.map((item) => (
                  <NavItem
                    key={item.title}
                    item={item}
                    isHovered={isHovered}
                  />
                ))}
              </ul>
            </div>
          )}
        </nav>

        {/* Expand hint */}
        <div
          className={cn(
            "absolute -right-2.5 top-1/2 -translate-y-1/2 transition-opacity duration-200",
            isHovered ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border text-muted-foreground shadow-sm">
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </aside>
    </div>
  );
}