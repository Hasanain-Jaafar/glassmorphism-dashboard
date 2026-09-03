"use client";

import { useEffect, useRef } from "react";
import { MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { InboxMessage } from "@/lib/supabase/inbox";

export function MessageThread({
  messages,
  currentUserId,
  loading,
  otherName,
}: {
  messages: InboxMessage[];
  currentUserId: string;
  loading: boolean;
  otherName: string | null;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Skeleton className="h-10 w-1/2 rounded-2xl" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
        <Skeleton className="h-16 w-2/3 rounded-2xl" />
      </div>
    );
  }

  if (!otherName) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageCircle className="size-5" />
        </span>
        <p className="text-sm font-medium text-foreground">
          Pick an admin to start messaging
        </p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm font-medium text-foreground">No messages yet</p>
        <p className="text-xs text-text-tertiary">Say hello to {otherName}.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {messages.map((message) => {
        const isMine = message.senderId === currentUserId;
        return (
          <div key={message.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
                isMine
                  ? "bg-primary text-primary-foreground"
                  : "bg-foreground/[0.04] text-foreground"
              )}
            >
              {message.body}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
