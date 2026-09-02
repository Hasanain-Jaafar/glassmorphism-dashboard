"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type DisplayMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const EXAMPLE_PROMPTS = [
  "How am I doing against my target this month?",
  "Who's my top performer this month?",
  "What should I focus on to improve conversion rate?",
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-foreground/[0.04] px-4 py-3">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-bounce rounded-full bg-text-tertiary motion-reduce:animate-none"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

export function ChatThread({
  messages,
  isThinking,
  loading,
  onExamplePick,
}: {
  messages: DisplayMessage[];
  isThinking: boolean;
  loading: boolean;
  onExamplePick: (prompt: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isThinking]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Skeleton className="h-16 w-2/3 rounded-2xl" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
        <Skeleton className="h-20 w-3/4 rounded-2xl" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">
            Ask about your pipeline, targets, or team performance
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Answers are grounded in your real, live dashboard data.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onExamplePick(prompt)}
              className="rounded-full border border-glass-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div
            dir="auto"
            className={cn(
              "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-foreground/[0.04] text-foreground"
            )}
          >
            {message.content}
          </div>
        </div>
      ))}
      {isThinking && (
        <div className="flex justify-start">
          <TypingIndicator />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
