"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Menu } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConversationList } from "@/components/assistant/conversation-list";
import { ChatThread, type DisplayMessage } from "@/components/assistant/chat-thread";
import { ChatInput } from "@/components/assistant/chat-input";
import {
  fetchConversations,
  fetchMessages,
  deleteConversation,
  type Conversation,
} from "@/lib/supabase/ai-assistant";

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const loadConversations = useCallback(() => {
    fetchConversations()
      .then(setConversations)
      .catch((error: Error) =>
        toast.error(error.message ?? "Couldn't load your conversations")
      );
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  async function openConversation(id: string) {
    setActiveId(id);
    setMobileListOpen(false);
    setMessagesLoading(true);
    try {
      const rows = await fetchMessages(id);
      setMessages(rows.map((m) => ({ id: m.id, role: m.role, content: m.content })));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't load that conversation"
      );
    } finally {
      setMessagesLoading(false);
    }
  }

  function startNewChat() {
    setActiveId(null);
    setMessages([]);
    setMobileListOpen(false);
  }

  async function handleDelete(id: string) {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev?.filter((c) => c.id !== id) ?? prev);
      if (activeId === id) startNewChat();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't delete that conversation"
      );
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    const optimisticId = `pending-${Date.now()}`;
    setMessages((prev) => [...prev, { id: optimisticId, role: "user", content: trimmed }]);
    setInput("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, message: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "The assistant couldn't respond right now");
      }

      setMessages((prev) => [
        ...prev,
        { id: `reply-${Date.now()}`, role: "assistant", content: data.reply },
      ]);

      if (!activeId) {
        setActiveId(data.conversationId);
      }
      loadConversations();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The assistant couldn't respond right now"
      );
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInput(trimmed);
    } finally {
      setIsThinking(false);
    }
  }

  const listProps = {
    conversations,
    activeId,
    onSelect: openConversation,
    onNew: startNewChat,
    onDelete: handleDelete,
  };

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="AI Assistant"
          description="Ask about your pipeline, targets, or team performance"
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="glass-panel flex h-[calc(100vh-260px)] min-h-[520px] overflow-hidden rounded-2xl">
          <div className="hidden w-72 shrink-0 border-r border-glass-border lg:block">
            <ConversationList {...listProps} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-glass-border px-4 py-3 lg:hidden">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileListOpen(true)}
                aria-label="Open conversations"
              >
                <Menu className="size-4" />
              </Button>
              <p className="truncate text-sm font-medium text-foreground">
                {conversations?.find((c) => c.id === activeId)?.title ?? "New chat"}
              </p>
            </div>

            <ChatThread
              messages={messages}
              isThinking={isThinking}
              loading={messagesLoading}
              onExamplePick={send}
            />
            <ChatInput value={input} onChange={setInput} onSend={() => send(input)} disabled={isThinking} />
          </div>
        </div>
      </Reveal>

      <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
        <SheetContent side="left" className="glass-panel w-72 p-0">
          <SheetHeader className="p-3 pb-0">
            <SheetTitle>Conversations</SheetTitle>
          </SheetHeader>
          <ConversationList {...listProps} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
