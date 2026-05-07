import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full bg-background">

        <AppSidebar />

        <div className="flex flex-1 flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto px-4 py-6 lg:px-8 lg:py-8 animate-fade-in">
            <div className="mx-auto w-full max-w-[1440px]">{children}</div>
          </main>
        </div>

      </div>
    </SidebarProvider>
  );
}