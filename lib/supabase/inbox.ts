import { createClient } from "@/lib/supabase/client";

export type InboxThread = {
  id: string;
  participantOne: string;
  participantTwo: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
};

export type InboxMessage = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

type ThreadRow = {
  id: string;
  participant_one: string;
  participant_two: string;
  last_message_at: string;
  last_message_preview: string | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const THREAD_COLUMNS =
  "id, participant_one, participant_two, last_message_at, last_message_preview";
const MESSAGE_COLUMNS = "id, thread_id, sender_id, body, created_at, read_at";

function fromThreadRow(row: ThreadRow): InboxThread {
  return {
    id: row.id,
    participantOne: row.participant_one,
    participantTwo: row.participant_two,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
  };
}

function fromMessageRow(row: MessageRow): InboxMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

/** Which participant of `thread` isn't the signed-in admin. */
export function otherParticipant(thread: InboxThread, currentUserId: string): string {
  return thread.participantOne === currentUserId
    ? thread.participantTwo
    : thread.participantOne;
}

/** Every DM thread the signed-in admin is part of, most recently active first. */
export async function fetchThreads(): Promise<InboxThread[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dm_threads")
    .select(THREAD_COLUMNS)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromThreadRow);
}

function pairFilter(currentUserId: string, otherId: string) {
  return `and(participant_one.eq.${currentUserId},participant_two.eq.${otherId}),and(participant_one.eq.${otherId},participant_two.eq.${currentUserId})`;
}

/** Finds the existing thread with `otherId`, or creates it. */
export async function fetchOrCreateThread(
  currentUserId: string,
  otherId: string
): Promise<InboxThread> {
  const supabase = createClient();
  const { data: existing, error: findError } = await supabase
    .from("dm_threads")
    .select(THREAD_COLUMNS)
    .or(pairFilter(currentUserId, otherId))
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return fromThreadRow(existing);

  const { data: created, error: insertError } = await supabase
    .from("dm_threads")
    .insert({ participant_one: currentUserId, participant_two: otherId })
    .select(THREAD_COLUMNS)
    .single();

  if (insertError) {
    // Both admins started the thread at the same instant — the unique pair
    // index rejected the loser of the race, so just read back the winner's row.
    if (insertError.code === "23505") {
      const { data: retried, error: retryError } = await supabase
        .from("dm_threads")
        .select(THREAD_COLUMNS)
        .or(pairFilter(currentUserId, otherId))
        .single();
      if (retryError) throw retryError;
      return fromThreadRow(retried);
    }
    throw insertError;
  }
  return fromThreadRow(created);
}

export async function fetchMessages(threadId: string): Promise<InboxMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dm_messages")
    .select(MESSAGE_COLUMNS)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromMessageRow);
}

export async function sendMessage(
  threadId: string,
  senderId: string,
  body: string
): Promise<InboxMessage> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dm_messages")
    .insert({ thread_id: threadId, sender_id: senderId, body })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) throw error;
  return fromMessageRow(data);
}

/** Marks every unread message *from the other participant* in this thread as read. */
export async function markThreadRead(
  threadId: string,
  currentUserId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("dm_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .neq("sender_id", currentUserId)
    .is("read_at", null);
  if (error) throw error;
}

/** Total unread messages addressed to the signed-in admin, across every thread. */
export async function fetchUnreadCount(currentUserId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("dm_messages")
    .select("id", { count: "exact", head: true })
    .neq("sender_id", currentUserId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

/** Unread message counts per thread, for the thread-list badges. */
export async function fetchUnreadByThread(
  currentUserId: string
): Promise<Map<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dm_messages")
    .select("thread_id")
    .neq("sender_id", currentUserId)
    .is("read_at", null);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.thread_id, (counts.get(row.thread_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Live-updates the inbox across every admin session — a message or a brand
 * new thread from any other admin arrives immediately, via Supabase Realtime
 * (see migration 34). RLS scopes which rows actually reach this client, same
 * trust model as subscribeToCustomers in lib/supabase/customers.ts. Returns
 * an unsubscribe function to call on unmount.
 */
export function subscribeToInbox(
  currentUserId: string,
  handlers: {
    onMessageInsert: (message: InboxMessage) => void;
    onMessageUpdate: (message: InboxMessage) => void;
    onThreadInsert: (thread: InboxThread) => void;
  }
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`inbox-${currentUserId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "dm_messages" },
      (payload) => handlers.onMessageInsert(fromMessageRow(payload.new as MessageRow))
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "dm_messages" },
      (payload) => handlers.onMessageUpdate(fromMessageRow(payload.new as MessageRow))
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "dm_threads" },
      (payload) => handlers.onThreadInsert(fromThreadRow(payload.new as ThreadRow))
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
