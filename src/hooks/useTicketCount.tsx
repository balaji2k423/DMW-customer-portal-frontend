import { useEffect, useState } from "react";
import api from "@/lib/api";

/**
 * Returns the live count of non-closed tickets.
 * Polls every 60 s.
 */
export function useTicketCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        const { data } = await api.get("/tickets/", {
          params: { status__ne: "closed", page_size: 1 },
        });
        // DRF pagination shape: { count: N, results: [...] }
        if (!cancelled) {
          setCount(typeof data.count === "number" ? data.count : (data.results?.length ?? 0));
        }
      } catch {
        // silently ignore
      }
    };

    fetch();
    const id = setInterval(fetch, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return count;
}