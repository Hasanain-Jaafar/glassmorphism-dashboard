import { NextResponse } from "next/server";
import { z } from "zod";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/ai/client";
import { buildAssistantTools } from "@/lib/ai/tools";
import { currentYear } from "@/lib/mock-data";
import { currentMonthNumber } from "@/lib/target-period";
import type { UserRole } from "@/components/providers/auth-provider";

const bodySchema = z.object({
  conversationId: z.string().uuid().nullable(),
  message: z.string().min(1, "Message can't be empty").max(4000, "Keep it under 4000 characters"),
});

const MODEL = "claude-sonnet-5";
const MAX_HISTORY_MESSAGES = 20;

function systemPrompt(name: string, role: UserRole) {
  const period = format(new Date(currentYear, currentMonthNumber - 1, 1), "MMMM yyyy");
  const scopeNote =
    role === "admin"
      ? "You are talking to an admin — tool results reflect the whole company and every sales rep."
      : "You are talking to a sales rep — tool results only ever reflect their own numbers, never a teammate's.";

  return [
    `You are the AI Assistant built into this company's sales management dashboard.`,
    `You're helping ${name} (${role === "admin" ? "an admin" : "a sales rep"}) understand their sales performance and get concrete, grounded advice on marketing and team management.`,
    scopeNote,
    `The current business period is ${period} — use this when a question doesn't name a specific month or year.`,
    `Rules:`,
    `- For any question about sales figures, targets, pipeline, or team performance, always call the relevant tool first. Never guess or invent numbers.`,
    `- Ground every suggestion in the data a tool just returned — cite specific figures rather than giving generic advice.`,
    `- Be concise: short paragraphs or a few bullet points, not long essays.`,
  ].join("\n");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { message } = parsed.data;
  let { conversationId } = parsed.data;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Couldn't load your profile" }, { status: 400 });
  }
  const role = profile.role as UserRole;

  if (conversationId) {
    // Confirm this conversation is actually the caller's own — RLS would
    // return it empty either way, but this turns a foreign/stale id into a
    // clear 404 instead of silently attaching a new message to nothing the
    // caller will ever see again.
    const { data: existing, error: existingError } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
  } else {
    const { data: created, error: createError } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, title: message.slice(0, 60) })
      .select("id")
      .single();
    if (createError || !created) {
      return NextResponse.json(
        { error: createError?.message ?? "Couldn't start a new conversation" },
        { status: 400 }
      );
    }
    conversationId = created.id;
  }

  const { error: insertUserMessageError } = await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: "user",
    content: message,
  });
  if (insertUserMessageError) {
    return NextResponse.json({ error: insertUserMessageError.message }, { status: 400 });
  }

  const { data: historyRows, error: historyError } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);
  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 400 });
  }
  const history = (historyRows ?? []).reverse();

  const tools = buildAssistantTools({ supabase, userId: user.id, role });

  let reply: string;
  try {
    const finalMessage = await anthropic.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt(profile.full_name, role),
      messages: history.map((row) => ({
        role: row.role as "user" | "assistant",
        content: row.content,
      })),
      tools,
      output_config: { effort: "medium" },
    });

    const textParts: string[] = [];
    for (const block of finalMessage.content) {
      if (block.type === "text") textParts.push(block.text);
    }
    reply = textParts.join("\n").trim();

    if (!reply) {
      reply = "I couldn't come up with a response to that — could you rephrase?";
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The assistant couldn't respond right now — try again in a moment.",
      },
      { status: 502 }
    );
  }

  const { error: insertReplyError } = await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: "assistant",
    content: reply,
  });
  if (insertReplyError) {
    return NextResponse.json({ error: insertReplyError.message }, { status: 400 });
  }

  // Bump updated_at so the conversation list re-sorts by recency — the
  // set_updated_at trigger stamps now() regardless of the value sent here.
  await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return NextResponse.json({ conversationId, reply });
}
