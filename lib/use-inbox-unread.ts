import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchUnreadCount, subscribeToInbox } from "@/lib/supabase/inbox";

/** Live unread-message count for the topbar Inbox badge — re-fetches on every relevant Realtime event rather than tracking a local delta, so it can never drift. */
export function useInboxUnreadCount(): number {
  const { user, isAdmin } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin || !user) return;

    const userId = user.id;
    let cancelled = false;

    function refresh() {
      fetchUnreadCount(userId)
        .then((value) => {
          if (!cancelled) setCount(value);
        })
        .catch(() => {
          // Non-critical — the badge just stays at its last known value.
        });
    }

    refresh();
    const unsubscribe = subscribeToInbox(userId, {
      onMessageInsert: refresh,
      onMessageUpdate: refresh,
      onThreadInsert: () => {},
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isAdmin, user]);

  return count;
}
