"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Lock, Menu } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThreadList } from "@/components/inbox/thread-list";
import { MessageThread } from "@/components/inbox/message-thread";
import { ChatInput } from "@/components/assistant/chat-input";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import {
  fetchThreads,
  fetchOrCreateThread,
  fetchMessages,
  sendMessage,
  markThreadRead,
  fetchUnreadByThread,
  subscribeToInbox,
  otherParticipant,
  type InboxThread,
  type InboxMessage,
} from "@/lib/supabase/inbox";

export default function InboxPage() {
  const { user, isAdmin } = useAuth();
  const currentUserId = user?.id ?? "";

  const [admins, setAdmins] = useState<TeamMember[] | null>(null);
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [unreadByThread, setUnreadByThread] = useState<Map<string, number>>(new Map());
  const [activeOtherId, setActiveOtherId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<InboxThread | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const activeThreadIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeThreadIdRef.current = activeThread?.id ?? null;
  }, [activeThread]);

  const loadUnread = useCallback(() => {
    if (!isAdmin || !currentUserId) return;
    fetchUnreadByThread(currentUserId)
      .then(setUnreadByThread)
      .catch(() => {
        // Non-critical — unread badges just stay stale until the next refresh.
      });
  }, [isAdmin, currentUserId]);

  useEffect(() => {
    if (!isAdmin || !currentUserId) return;
    fetchTeamMembers()
      .then((team) =>
        setAdmins(team.filter((m) => m.role === "admin" && m.id !== currentUserId))
      )
      .catch((error: Error) =>
        toast.error(error.message ?? "Couldn't load the admin team")
      );
    fetchThreads()
      .then(setThreads)
      .catch((error: Error) => toast.error(error.message ?? "Couldn't load your inbox"));
    loadUnread();
  }, [isAdmin, currentUserId, loadUnread]);

  function bumpThread(threadId: string, lastMessageAt: string, preview: string) {
    setThreads((prev) => {
      const idx = prev.findIndex((t) => t.id === threadId);
      if (idx === -1) return prev;
      const updated = { ...prev[idx], lastMessageAt, lastMessagePreview: preview };
      const next = [...prev];
      next.splice(idx, 1);
      return [updated, ...next];
    });
  }

  // Live sync — a message or a brand new thread from any other admin session
  // updates this page immediately, same pattern as the Customers page.
  useEffect(() => {
    if (!isAdmin || !currentUserId) return;
    return subscribeToInbox(currentUserId, {
      onMessageInsert: (message) => {
        bumpThread(message.threadId, message.createdAt, message.body.slice(0, 140));

        if (activeThreadIdRef.current === message.threadId) {
          setMessages((prev) =>
            prev.some((m) => m.id === message.id) ? prev : [...prev, message]
          );
          if (message.senderId !== currentUserId) {
            markThreadRead(message.threadId, currentUserId).catch(() => {});
          }
        } else if (message.senderId !== currentUserId) {
          loadUnread();
        }
      },
      onMessageUpdate: loadUnread,
      onThreadInsert: (thread) => {
        setThreads((prev) => (prev.some((t) => t.id === thread.id) ? prev : [thread, ...prev]));
      },
    });
  }, [isAdmin, currentUserId, loadUnread]);

  async function openThread(otherId: string) {
    setActiveOtherId(otherId);
    setMobileListOpen(false);

    const existing =
      threads.find((t) => otherParticipant(t, currentUserId) === otherId) ?? null;
    setActiveThread(existing);

    if (!existing) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    try {
      const rows = await fetchMessages(existing.id);
      setMessages(rows);
      await markThreadRead(existing.id, currentUserId);
      loadUnread();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't open that conversation"
      );
    } finally {
      setMessagesLoading(false);
    }
  }

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || !activeOtherId || sending) return;

    setSending(true);
    setInput("");
    try {
      let thread = activeThread;
      if (!thread) {
        thread = await fetchOrCreateThread(currentUserId, activeOtherId);
        setActiveThread(thread);
        setThreads((prev) => (prev.some((t) => t.id === thread!.id) ? prev : [thread!, ...prev]));
      }

      const message = await sendMessage(thread.id, currentUserId, trimmed);
      setMessages((prev) => [...prev, message]);
      bumpThread(thread.id, message.createdAt, trimmed.slice(0, 140));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send that message");
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Reveal>
          <PageHeader title="Inbox" />
        </Reveal>
        <Reveal delay={0.05}>
          <div className="glass-panel flex flex-col items-center rounded-2xl p-10 text-center">
            <Lock className="size-6 text-text-tertiary" />
            <p className="mt-3 text-sm font-medium text-foreground">Admins only</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-tertiary">
              The inbox is for admin-to-admin messaging and isn&apos;t available to
              sales representatives.
            </p>
          </div>
        </Reveal>
      </div>
    );
  }

  const activeAdmin = admins?.find((a) => a.id === activeOtherId) ?? null;

  const listProps = {
    admins,
    threads,
    unreadByThread,
    currentUserId,
    activeOtherId,
    onSelect: openThread,
  };

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader title="Inbox" description="Direct messages between admins" />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="glass-panel flex h-[calc(100vh-260px)] min-h-[520px] overflow-hidden rounded-2xl">
          <div className="hidden w-72 shrink-0 border-r border-glass-border lg:block">
            <ThreadList {...listProps} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-glass-border px-4 py-3 lg:hidden">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileListOpen(true)}
                aria-label="Open admins list"
              >
                <Menu className="size-4" />
              </Button>
              <p className="truncate text-sm font-medium text-foreground">
                {activeAdmin?.name ?? "Select an admin"}
              </p>
            </div>

            <MessageThread
              messages={messages}
              currentUserId={currentUserId}
              loading={messagesLoading}
              otherName={activeAdmin?.name ?? null}
            />
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={send}
              disabled={sending || !activeOtherId}
              placeholder={
                activeAdmin ? `Message ${activeAdmin.name}...` : "Pick an admin to start messaging"
              }
            />
          </div>
        </div>
      </Reveal>

      <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
        <SheetContent side="left" className="glass-panel w-72 p-0">
          <SheetHeader className="p-3 pb-0">
            <SheetTitle>Admins</SheetTitle>
          </SheetHeader>
          <ThreadList {...listProps} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
