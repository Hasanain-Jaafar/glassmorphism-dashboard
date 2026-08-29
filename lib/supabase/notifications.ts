import { createClient } from "@/lib/supabase/client";

export type NotificationType =
  | "coaching_note_added"
  | "new_appointment"
  | "deal_won"
  | "target_reached"
  | "quotation_expiring"
  | "weekly_summary";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const notificationColumns = "id, type, title, body, link, read_at, created_at";

function mapNotification(n: {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}): AppNotification {
  return {
    id: n.id,
    type: n.type as NotificationType,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.read_at,
    createdAt: n.created_at,
  };
}

/** RLS already scopes rows to the signed-in user (recipient_id = auth.uid()). */
export async function fetchNotifications(limit = 30): Promise<AppNotification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(notificationColumns)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map(mapNotification);
}

export async function fetchUnreadCount(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) throw error;

  return count ?? 0;
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) throw error;
}

/**
 * Notification preferences. Wired types (real triggers exist):
 * coachingNoteAdded, newAppointment, dealWon. The rest have a column to save
 * into but no trigger yet — see supabase/README.md.
 */
export type NotificationPreferences = {
  coachingNoteAdded: boolean;
  newAppointment: boolean;
  dealWon: boolean;
  targetReached: boolean;
  quotationExpiring: boolean;
  weeklySummary: boolean;
};

const defaultPreferences: NotificationPreferences = {
  coachingNoteAdded: true,
  newAppointment: true,
  dealWon: true,
  targetReached: true,
  quotationExpiring: true,
  weeklySummary: false,
};

const preferenceColumns: Record<keyof NotificationPreferences, string> = {
  coachingNoteAdded: "coaching_note_added",
  newAppointment: "new_appointment",
  dealWon: "deal_won",
  targetReached: "target_reached",
  quotationExpiring: "quotation_expiring",
  weeklySummary: "weekly_summary",
};

function mapPreferences(row: {
  coaching_note_added: boolean;
  new_appointment: boolean;
  deal_won: boolean;
  target_reached: boolean;
  quotation_expiring: boolean;
  weekly_summary: boolean;
}): NotificationPreferences {
  return {
    coachingNoteAdded: row.coaching_note_added,
    newAppointment: row.new_appointment,
    dealWon: row.deal_won,
    targetReached: row.target_reached,
    quotationExpiring: row.quotation_expiring,
    weeklySummary: row.weekly_summary,
  };
}

/** No row yet (user never opened Settings) → the column defaults, i.e. everything on except the weekly summary. */
export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return defaultPreferences;

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(
      "coaching_note_added, new_appointment, deal_won, target_reached, quotation_expiring, weekly_summary"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  return data ? mapPreferences(data) : defaultPreferences;
}

export async function saveNotificationPreference(
  key: keyof NotificationPreferences,
  value: boolean
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: user.id, [preferenceColumns[key]]: value }, { onConflict: "user_id" });

  if (error) throw error;
}
