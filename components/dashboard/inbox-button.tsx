"use client";

import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useInboxUnreadCount } from "@/lib/use-inbox-unread";
import { cn } from "@/lib/utils";

export function InboxButton({
  className,
  iconClassName = "size-[23px]",
}: {
  className?: string;
  iconClassName?: string;
} = {}) {
  const router = useRouter();
  const unreadCount = useInboxUnreadCount();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => router.push("/inbox")}
            aria-label="Inbox"
            className={cn(
              "relative flex items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-foreground/[0.04]",
              className
            )}
          />
        }
      >
        <Inbox className={iconClassName} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">Inbox</TooltipContent>
    </Tooltip>
  );
}
