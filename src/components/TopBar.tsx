import { Bell, Search, LogOut, Settings, User as UserIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { notifications } from "@/data/mock";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unread = notifications.filter((n) => !n.read);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border glass">
      <div className="flex h-full items-center gap-3 px-4 lg:px-6">
        <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-muted" />

        <div className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects, documents, tickets…"
              className="h-9 pl-9 bg-muted/40 border-border/60 focus-visible:bg-background"
            />
          </div>
        </div>

        <div className="flex-1 md:hidden" />

        <div className="flex items-center gap-1">
          <ThemeToggle />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg hover:bg-muted">
                <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {unread.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[360px] p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Notifications</h3>
                <Badge variant="secondary" className="text-[10px] font-medium">{unread.length} new</Badge>
              </div>
              <div className="max-h-[380px] overflow-y-auto scrollbar-thin">
                {notifications.slice(0, 6).map((n) => (
                  <button
                    key={n.id}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors flex gap-3",
                      !n.read && "bg-accent/[0.04]",
                    )}
                    onClick={() => navigate("/notifications")}
                  >
                    <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", !n.read ? "bg-accent" : "bg-transparent")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{n.timestamp}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="border-t border-border p-2">
                <Button variant="ghost" size="sm" className="w-full justify-center text-accent" onClick={() => navigate("/notifications")}>
                  View all notifications
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-2 flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-muted transition-colors">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-gradient-accent text-accent-foreground text-xs font-semibold">
                    {user?.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start leading-tight">
                  <span className="text-xs font-semibold">{user?.name}</span>
                  <span className="text-[10px] text-muted-foreground">{user?.role}</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{user?.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <UserIcon className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <Settings className="mr-2 h-4 w-4" /> Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
