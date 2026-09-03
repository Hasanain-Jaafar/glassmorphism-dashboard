"use client";

import { useRouter } from "next/navigation";
import { Brain, LogOut, Settings } from "lucide-react";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { InboxButton } from "@/components/dashboard/inbox-button";
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
import { useScrolled } from "@/lib/use-scrolled";
import { cn } from "@/lib/utils";

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
  const scrolled = useScrolled();

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  const iconButtonSize = scrolled ? "size-8" : "size-9";
  const iconSize = scrolled ? "size-[19px]" : "size-[23px]";

  return (
    <header
      className={cn(
        "glass-panel sticky top-6 lg:top-8 z-30 flex items-center rounded-2xl shadow-sm transition-all duration-200 ease-out",
        scrolled
          ? "h-11 w-auto self-end gap-2 px-2.5 md:px-3"
          : "h-14 w-full gap-3 px-3 md:max-w-xl md:ml-auto md:px-4"
      )}
    >
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex size-8 items-center justify-center rounded-lg bg-foreground/[0.04]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-4.5" />
        </div>
      </div>

      <div className="flex-1">
        <CommandPalette compact={scrolled} />
      </div>

      {isAdmin && (
        <InboxButton
          className={iconButtonSize}
          iconClassName={cn("transition-all duration-200 ease-out", iconSize)}
        />
      )}

      {isAdmin && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => router.push("/assistant")}
                aria-label="AI Brain"
                className={cn(
                  "flex items-center justify-center rounded-xl text-primary transition-all duration-200 ease-out hover:bg-primary/10",
                  iconButtonSize
                )}
              />
            }
          >
            <Brain className={cn("transition-all duration-200 ease-out", iconSize)} />
          </TooltipTrigger>
          <TooltipContent side="bottom">AI Brain</TooltipContent>
        </Tooltip>
      )}

      <NotificationBell
        className={iconButtonSize}
        iconClassName={cn("transition-all duration-200 ease-out", iconSize)}
      />

      <ThemeToggle
        className={cn(
          "flex items-center justify-center rounded-xl text-text-secondary hover:bg-foreground/[0.04]",
          iconButtonSize
        )}
        iconClassName={cn("transition-all duration-200 ease-out", iconSize)}
      />

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      "flex items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-accent-foreground ring-1 ring-glass-border transition-all duration-200 ease-out hover:opacity-80",
                      iconButtonSize
                    )}
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
