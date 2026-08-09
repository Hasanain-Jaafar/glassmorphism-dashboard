"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, LogOut } from "lucide-react";
import { navGroups } from "@/lib/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="glass-panel fixed inset-x-4 bottom-4 z-40 flex items-center justify-around rounded-2xl px-2 py-2 shadow-lg md:hidden">
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium",
            pathname === "/dashboard"
              ? "text-primary"
              : "text-text-tertiary"
          )}
        >
          <LayoutDashboard className="size-5" />
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium text-text-tertiary"
        >
          <Menu className="size-5" />
          Menu
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="glass-panel max-h-[80vh] overflow-y-auto rounded-t-3xl"
        >
          <SheetHeader>
            <SheetTitle>Navigate</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 overflow-y-auto px-4 pb-6">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="px-1 text-[11px] font-medium tracking-wide text-text-tertiary uppercase">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        {item.enabled ? (
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                              isActive
                                ? "bg-primary/15 text-foreground ring-1 ring-primary/25"
                                : "text-text-secondary"
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-[18px]",
                                isActive && "text-primary"
                              )}
                            />
                            {item.label}
                          </Link>
                        ) : (
                          <div className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-text-tertiary">
                            <Icon className="size-[18px]" />
                            {item.label}
                            <span className="ml-auto rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-medium">
                              Soon
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-xl border-t border-glass-border pt-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  AU
                </div>
                <div>
                  <p className="text-sm font-medium">Admin User</p>
                  <p className="text-xs text-text-tertiary">Administrator</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <button
                  type="button"
                  aria-disabled
                  className="flex size-8 items-center justify-center rounded-lg text-text-tertiary"
                >
                  <LogOut className="size-[16px]" />
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
