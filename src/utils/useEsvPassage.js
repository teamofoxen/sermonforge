// useEsvPassage — small hook wrapping the existing fetchPassage IPC so
// every consumer of ESV passage text reads from one path and one cache.
//
// Phase D2 (Decision 3): reuse PassagePopup's existing ESV fetch + cache
// rather than writing a second fetch. PassagePopup converts to a consumer
// of this hook; the writing surface's passage column does the same. One
// fetch, one cache, one place to debug.
//
// Returns { data, loading }. `data` shape mirrors the fetchPassage
// resolved shape (with a `fetchError` field on failure). `loading` is
// true while a fetch is in flight.

import { useEffect, useState } from "react";
import { fetchPassage } from "../db/database";

export function useEsvPassage(reference) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reference) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetchPassage(reference)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setData({ fetchError: e?.message ?? String(e) });
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return { data, loading };
}
