import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
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
import { cn } from "@/lib/utils";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { useTicketCount } from "@/hooks/useTicketCount";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "#E8510A";

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
  const { pathname } = useLocation();

  // Active check: exact match for dashboard, startsWith for others
  const isActive = item.end
    ? pathname === item.url
    : pathname.startsWith(item.url);

  return (
    <li>
      <Link
        to={item.url}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5",
          "text-[13px] font-medium",
          !isHovered && "justify-center",
          isActive
            ? "text-white font-bold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        style={isActive ? { background: BRAND } : {}}
      >
        <item.icon
          className="h-[20px] w-[20px] shrink-0 transition-transform duration-150 group-hover:scale-110"
          strokeWidth={isActive ? 2.25 : 1.75}
        />

        <span className={cn(
          "whitespace-nowrap leading-none flex-1",
          "transition-[width,opacity,transform] duration-300",
          isHovered
            ? "opacity-100 translate-x-0 w-auto"
            : "opacity-0 -translate-x-1 w-0 overflow-hidden"
        )}>
          {item.title}
        </span>

        {/* Badge — pill when expanded */}
        {isHovered && badge && badge > 0 ? (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
            style={
              isActive
                ? { background: "rgba(255,255,255,0.3)", color: "white" }
                : { background: BRAND, color: "white" }
            }
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}

        {/* Badge — dot when collapsed */}
        {!isHovered && badge && badge > 0 ? (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-card"
            style={{ background: isActive ? "white" : BRAND }}
          />
        ) : null}
      </Link>
    </li>
  );
}

export function AppSidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuth();

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
        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isHovered ? "w-60" : "w-[3.75rem]"
      )}>

        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(to right, transparent, ${BRAND}99, transparent)` }}
        />

        {/* ─── Logo / Header ─── */}
        <div className={cn(
          "flex h-14 shrink-0 items-center border-b border-border",
          "transition-[padding] duration-300",
          isHovered ? "px-4 gap-3" : "justify-center px-0"
        )}>
          {!isHovered ? (
            <div
              className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: BRAND }}
            >
              D
            </div>
          ) : (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ background: BRAND }}
              >
                D
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground leading-none">DMW</p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
                  Robotics
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Nav ─── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
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
                    <span
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: BRAND }}
                    >
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