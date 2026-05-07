import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string | (({ isActive, isPending }: { isActive: boolean; isPending: boolean }) => string);
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) => {
          const base =
            typeof className === "function"
              ? className({ isActive, isPending })
              : className;
          return cn(base, isActive && activeClassName, isPending && pendingClassName);
        }}
        {...props}
      />
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };