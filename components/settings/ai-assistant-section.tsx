"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";

const MAX_LENGTH = 1000;

/**
 * Persistent, per-user instructions the AI Assistant includes on every chat
 * — the same idea as ChatGPT's "Custom Instructions". Stored on
 * profiles.custom_instructions (own-row RLS already covers it) and read by
 * app/api/assistant/chat/route.ts's systemPrompt().
 */
export function AiAssistantSection() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [value, setValue] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed local editable state the moment the profile finishes loading — same
  // "compare and update during render" pattern used for tab syncing in
  // app/(dashboard)/settings/page.tsx and team/page.tsx.
  if (!seeded && profile) {
    setSeeded(true);
    setValue(profile.custom_instructions ?? "");
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ custom_instructions: value.trim() || null })
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Instructions saved");
  }

  if (loading || !profile) {
    return (
      <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-3 w-64" />
        <Skeleton className="mt-5 h-32 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold text-foreground sm:text-base">
        AI Assistant
      </h3>
      <p className="mt-0.5 text-xs text-text-tertiary">
        Instructions the assistant should always keep in mind, in every conversation.
      </p>

      <div className="mt-5 space-y-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_LENGTH))}
          rows={6}
          placeholder={
            'e.g. "Focus on B2B accounts over $10k" or "Always suggest next steps as a numbered list"'
          }
          className="resize-none"
        />
        <p className="text-right text-[11px] text-text-tertiary">
          {value.length} / {MAX_LENGTH}
        </p>
      </div>

      <div className="mt-2 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Instructions"}
        </Button>
      </div>
    </div>
  );
}
