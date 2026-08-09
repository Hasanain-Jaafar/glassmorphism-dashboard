import type { ReactNode } from "react";
import { AmbientBackground } from "@/components/dashboard/ambient-background";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { AuthProvider } from "@/components/providers/auth-provider";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="relative min-h-screen">
        <AmbientBackground />
        <div className="mx-auto flex max-w-[1600px] gap-6 p-4 pb-24 sm:p-6 md:pb-6 lg:gap-6 lg:p-8 2xl:p-10">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Topbar />
            <main className="flex-1 pb-4">{children}</main>
          </div>
        </div>
        <MobileNav />
      </div>
    </AuthProvider>
  );
}
