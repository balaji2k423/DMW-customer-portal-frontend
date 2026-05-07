import { useEffect, useState } from "react";
import { notificationsService } from "@/services/notifications";

/**
 * Returns the live unread notification count.
 * Polls every 60 s so the bell badge stays fresh without a websocket.
 */
export function useNotificationCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        const data = await notificationsService.list({ is_read: false });
        if (!cancelled) setCount(Array.isArray(data) ? data.length : 0);
      } catch {
        // silently ignore — badge just stays at 0
      }
    };

    fetch();
    const id = setInterval(fetch, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return count;
}