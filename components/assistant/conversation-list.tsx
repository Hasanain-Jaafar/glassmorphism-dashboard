"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/supabase/ai-assistant";

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: {
  conversations: Conversation[] | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  function startRename(conversation: Conversation) {
    setEditingId(conversation.id);
    setDraft(conversation.title);
  }

  function commitRename() {
    if (!editingId) return;
    const trimmed = draft.trim();
    const original = conversations?.find((c) => c.id === editingId)?.title ?? "";
    if (trimmed && trimmed !== original) onRename(editingId, trimmed);
    setEditingId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button onClick={onNew} className="w-full justify-center">
          <Plus className="size-4" />
          New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 pb-3">
        {conversations === null ? (
          <div className="space-y-1.5 px-1.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-text-tertiary">
            No conversations yet.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conversation) => {
              const isEditing = editingId === conversation.id;
              return (
                <li key={conversation.id} className="group/item">
                  {isEditing ? (
                    <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5">
                      <Input
                        ref={inputRef}
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitRename();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingId(null);
                          }
                        }}
                        className="h-7 text-sm"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      onDoubleClick={() => startRename(conversation)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                        conversation.id === activeId
                          ? "bg-primary/10 text-foreground"
                          : "text-text-secondary hover:bg-foreground/[0.04]"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{conversation.title}</p>
                        <p className="mt-0.5 text-[11px] text-text-tertiary">
                          {formatDistanceToNow(new Date(conversation.updatedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Rename conversation"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(conversation);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            e.preventDefault();
                            startRename(conversation);
                          }
                        }}
                        className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-tertiary opacity-0 transition-opacity hover:bg-foreground/[0.08] hover:text-foreground group-hover/item:opacity-100"
                      >
                        <Pencil className="size-3.5" />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Delete conversation"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(conversation.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            e.preventDefault();
                            onDelete(conversation.id);
                          }
                        }}
                        className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-tertiary opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover/item:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
