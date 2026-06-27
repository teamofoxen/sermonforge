// useEsvPassage — small hook wrapping the existing fetchPassage IPC so
// every consumer of ESV passage text reads from one path and one cache.
//
// Phase D2 (Decision 3): reuse PassagePopup's existing ESV fetch + cache
// rather than writing a second fetch. PassagePopup converts to a consumer
// of this hook; the writing surface's passage column does the same. One
// fetch, one cache, one place to debug.
//
// Returns { data, loading, refresh }. `data` shape mirrors the
// fetchPassage resolved shape (with a `fetchError` field on transport
// failure). `loading` is true while a fetch is in flight. `refresh()`
// re-runs the fetch in place — the main-process cache only stores
// successes, so a refresh after fixing the key (or the network) actually
// re-attempts.

import { useCallback, useEffect, useState } from "react";
import { fetchPassage } from "../db/database";

export function useEsvPassage(reference, opts) {
  const headings = !!(opts && opts.headings);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!reference) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetchPassage(reference, { headings })
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
  }, [reference, refreshKey, headings]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { data, loading, refresh };
}
