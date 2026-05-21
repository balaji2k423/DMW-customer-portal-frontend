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
  Crown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { useTicketCount } from "@/hooks/useTicketCount";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const BRAND       = "#E8510A";
const BRAND_LIGHT = "#FEF0E9";

const items = [
  { title: "Dashboard",       url: "/",              icon: LayoutDashboard, end: true },
  { title: "Milestones",      url: "/milestones",    icon: GitBranch },
  { title: "Documents",       url: "/documents",     icon: FolderOpen },
  { title: "Support Tickets", url: "/tickets",       icon: LifeBuoy },
  { title: "Notifications",   url: "/notifications", icon: Bell },
  { title: "Profile",         url: "/profile",       icon: User },
];

const adminItems = [
  { title: "Projects",       url: "/admin/projects", icon: Briefcase },
  { title: "Users",          url: "/admin/users",    icon: Users },
  { title: "Company Master", url: "/admin/company",  icon: Building2 },
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
          "group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5",
          "text-[13px] font-medium text-muted-foreground",
          "transition-all duration-150",
          "hover:text-foreground hover:bg-muted",
          !isHovered && "justify-center"
        )}
        activeClassName="!text-white"
        activeStyle={{ background: BRAND }}
      >
        {/* Active left accent — hidden when full orange bg active */}
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full opacity-0 group-[.active]:opacity-0 transition-opacity"
          style={{ background: BRAND }}
        />

        <item.icon
          className="h-[20px] w-[20px] shrink-0 transition-transform duration-150 group-hover:scale-110"
          strokeWidth={1.75}
        />

        <span className={cn(
          "whitespace-nowrap transition-all duration-300 leading-none flex-1",
          isHovered ? "opacity-100 translate-x-0 w-auto" : "opacity-0 -translate-x-1 w-0 overflow-hidden"
        )}>
          {item.title}
        </span>

        {/* Badge — shown as text pill when expanded */}
        {isHovered && badge && badge > 0 ? (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center text-white"
            style={{ background: BRAND }}>
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}

        {/* Badge — shown as dot when collapsed */}
        {!isHovered && badge && badge > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-card"
            style={{ background: BRAND }} />
        ) : null}
      </NavLink>
    </li>
  );
}

export function AppSidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const unreadNotifs = useNotificationCount();
  const openTickets  = useTicketCount();
  const showAdmin    = user?.role === "admin";

  const badges: Record<string, number> = {
    Notifications:     unreadNotifs,
    "Support Tickets": openTickets,
  };

  const initials  = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";
  const fullName  = user ? `${user.first_name} ${user.last_name}`.trim() : "";
  const roleLabel = user?.role?.replace(/_/g, " ") ?? "";

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative h-full z-30"
    >
      <aside className={cn(
        "flex h-full flex-col border-r border-border bg-card shadow-sm",
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isHovered ? "w-60" : "w-[3.75rem]"
      )}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(to right, transparent, ${BRAND}99, transparent)` }} />

        {/* Logo */}
        <div className={cn(
          "flex h-14 shrink-0 items-center border-b border-border transition-all duration-300",
          isHovered ? "px-4 gap-3" : "justify-center px-0"
        )}>
          {/* Icon mark */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: BRAND }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </div>
          {isHovered && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-foreground leading-none">DMW</p>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">Robotics</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-0.5">

          <ul className="space-y-0.5">
            {items.map((item) => (
              <NavItem key={item.title} item={item} isHovered={isHovered} badge={badges[item.title]} />
            ))}
          </ul>

          {/* Admin section */}
          {showAdmin && (
            <div className="mt-4">
              <div className="mb-2 px-1">
                {isHovered ? (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3 shrink-0" style={{ color: BRAND }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: BRAND }}>
                      Admin
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="h-px w-5 bg-border" />
                  </div>
                )}
              </div>
              <ul className="space-y-0.5">
                {adminItems.map((item) => (
                  <NavItem key={item.title} item={item} isHovered={isHovered} />
                ))}
              </ul>
            </div>
          )}
        </nav>

       

        {/* User footer */}
        <div className={cn(
          "flex items-center border-t border-border transition-all duration-300",
          isHovered ? "gap-2.5 px-3 py-3" : "justify-center px-0 py-3"
        )}>
          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white"
            style={{ background: BRAND }}>
            {initials}
          </div>
          {isHovered && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{fullName || user?.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{roleLabel}</p>
            </div>
          )}
          {isHovered && (
            <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
          )}
        </div>

        {/* Expand chevron hint */}
        <div className={cn(
          "absolute -right-2.5 top-1/2 -translate-y-1/2 transition-opacity duration-200",
          isHovered ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border text-muted-foreground shadow-sm">
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </aside>
    </div>
  );
}