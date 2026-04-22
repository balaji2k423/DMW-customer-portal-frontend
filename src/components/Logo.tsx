import { Hexagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-accent rounded-md blur-md opacity-40" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary border border-primary/20">
          <Hexagon className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-tight text-foreground">DMW</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Robotics</span>
        </div>
      )}
    </div>
  );
}
