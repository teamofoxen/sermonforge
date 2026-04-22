export function formatCitation(h) {
  if (!h) return "";
  const head = [h.author, h.work].filter(Boolean).join(" — ");
  const loc = h.locator ? `, ${h.locator}` : "";
  const pg = formatPages(h);
  return `${head}${loc}${pg}`;
}

export function formatPages(h) {
  if (!h?.ccel_page_start) return "";
  const start = h.ccel_page_start;
  const end = h.ccel_page_end;
  if (end && end !== start) return `, pp. ${start}–${end}`;
  return `, p. ${start}`;
}

export function formatChunkForLLM(h) {
  return `[${formatCitation(h)}]\n${h.text_chunk}`;
}

export function dedupSources(hits) {
  const map = new Map();
  for (const h of hits || []) {
    const key = `${h.author}|||${h.work}|||${h.locator || ""}|||${h.ccel_page_start || ""}|||${h.ccel_page_end || ""}`;
    if (!map.has(key)) {
      map.set(key, {
        author: h.author,
        work: h.work,
        locator: h.locator,
        ccel_page_start: h.ccel_page_start,
        ccel_page_end: h.ccel_page_end,
      });
    }
  }
  return [...map.values()];
}
