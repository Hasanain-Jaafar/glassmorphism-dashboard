"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { navGroups } from "@/lib/nav";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLocalStorageBoolean } from "@/lib/use-local-storage-boolean";

const STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useLocalStorageBoolean(STORAGE_KEY, false);

  function toggleCollapsed() {
    setCollapsed(!collapsed);
  }

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "group/sidebar sticky top-6 lg:top-8 hidden h-[calc(100dvh-3rem)] lg:h-[calc(100dvh-4rem)] shrink-0 flex-col",
        "md:flex md:w-[76px] lg:w-[236px] data-[collapsed=true]:lg:w-[76px]",
        "glass-panel rounded-3xl shadow-lg transition-[width] duration-300 ease-out"
      )}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute top-6 left-full z-10 hidden size-7 -translate-x-1/2 items-center justify-center rounded-full bg-popover text-text-tertiary shadow-md ring-1 ring-foreground/10 transition-all duration-200 hover:scale-110 hover:text-primary hover:shadow-lg lg:flex"
      >
        {collapsed ? (
          <ChevronsRight className="size-3.5" />
        ) : (
          <ChevronsLeft className="size-3.5" />
        )}
      </button>

      <div className="flex items-center gap-2.5 px-4 py-5 md:justify-center lg:justify-start group-data-[collapsed=true]/sidebar:lg:justify-center group-data-[collapsed=true]/sidebar:lg:gap-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.04] shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-5" />
        </div>
        <span className="hidden max-w-[160px] overflow-hidden text-sm font-semibold tracking-tight whitespace-nowrap opacity-100 transition-[max-width,opacity] duration-300 ease-out lg:inline-block group-data-[collapsed=true]/sidebar:lg:max-w-0 group-data-[collapsed=true]/sidebar:lg:opacity-0">
          Sales Dashboard
        </span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="hidden truncate px-3 text-[11px] font-medium tracking-wide text-text-tertiary uppercase lg:block group-data-[collapsed=true]/sidebar:lg:invisible">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                const content = (
                  <span
                    className={cn(
                      "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors md:justify-center lg:justify-start group-data-[collapsed=true]/sidebar:lg:justify-center group-data-[collapsed=true]/sidebar:lg:gap-0",
                      item.enabled
                        ? isActive
                          ? "text-foreground"
                          : "text-text-secondary hover:bg-foreground/[0.04] hover:text-foreground"
                        : "cursor-not-allowed text-text-tertiary"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-indicator"
                        className="absolute inset-0 rounded-xl bg-primary/15 ring-1 ring-primary/25"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <Icon
                      className={cn(
                        "relative size-[18px] shrink-0",
                        isActive && "text-primary"
                      )}
                    />
                    <span className="relative hidden max-w-[140px] truncate opacity-100 transition-[max-width,opacity] duration-300 ease-out lg:inline-block group-data-[collapsed=true]/sidebar:lg:max-w-0 group-data-[collapsed=true]/sidebar:lg:opacity-0">
                      {item.label}
                    </span>
                    {!item.enabled && (
                      <span className="relative ml-auto hidden max-w-[60px] overflow-hidden rounded-full bg-foreground/[0.06] py-0.5 text-[10px] font-medium whitespace-nowrap text-text-tertiary opacity-100 transition-[max-width,opacity,padding,margin] duration-300 ease-out lg:inline-block group-data-[collapsed=true]/sidebar:lg:ml-0 group-data-[collapsed=true]/sidebar:lg:max-w-0 group-data-[collapsed=true]/sidebar:lg:px-0 group-data-[collapsed=true]/sidebar:lg:opacity-0 lg:px-1.5">
                        Soon
                      </span>
                    )}
                  </span>
                );

                if (!item.enabled) {
                  return (
                    <li key={item.href}>
                      <Tooltip>
                        <TooltipTrigger render={<div aria-disabled />}>
                          {content}
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.label} — coming soon
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link href={item.href}>{content}</Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
