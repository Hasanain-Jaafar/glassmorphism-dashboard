"use client";

import { useRouter } from "next/navigation";
import { Brain, LogOut, Settings } from "lucide-react";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/components/providers/auth-provider";

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function Topbar() {
  const router = useRouter();
  const { profile, isAdmin, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <header className="glass-panel sticky top-6 lg:top-8 z-30 flex h-14 items-center gap-3 rounded-2xl px-3 shadow-sm md:w-full md:max-w-xl md:ml-auto md:px-4">
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex size-8 items-center justify-center rounded-lg bg-foreground/[0.04]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-4.5" />
        </div>
      </div>

      <div className="flex-1">
        <CommandPalette />
      </div>

      {isAdmin && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => router.push("/assistant")}
                aria-label="AI Brain"
                className="flex size-9 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary/10"
              />
            }
          >
            <Brain className="size-[23px]" />
          </TooltipTrigger>
          <TooltipContent side="bottom">AI Brain</TooltipContent>
        </Tooltip>
      )}

      <NotificationBell />

      <ThemeToggle
        className="flex size-9 items-center justify-center rounded-xl text-text-secondary hover:bg-foreground/[0.04]"
        iconClassName="size-[23px]"
      />

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-accent-foreground ring-1 ring-glass-border transition-opacity hover:opacity-80"
                  />
                }
              />
            }
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              initials(profile?.full_name ?? "?")
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {profile?.full_name ?? "Account"}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" sideOffset={10} className="w-56">
          <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
            <span className="text-sm font-medium text-foreground">
              {profile?.full_name ?? "Loading…"}
            </span>
            <span className="text-xs font-normal text-text-tertiary">
              {isAdmin ? "Administrator" : "Sales Representative"}
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
