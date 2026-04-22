"""
chunk.py

Group parsed paragraphs into ~600-word chunks that respect section and chapter
boundaries. Governed by the manifest's `ingest` block.

Rules (from calvin_institutes_beveridge.yaml):
- chunk_target_words: 600
- chunk_boundary: "section"       — when over target, flush at the next section change
- chunk_hard_boundary: "chapter"  — never cross a chapter, regardless of word count

Usage:
    python scripts/theology/ingest/chunk.py <manifest.yaml>

Input:
    corpus/parsed/<manifest.id>/paragraphs.jsonl

Output:
    corpus/chunked/<manifest.id>/chunks.jsonl

Each chunk:
    {
      "work_id": "calvin_institutes_beveridge_1845",
      "chunk_index": 0,
      "book": 1,
      "chapter": 1,
      "section_start": 1,
      "section_end": 3,
      "ccel_page_start": 37,
      "ccel_page_end": 39,
      "locator": "Book 1, Ch. 1, §1-3",
      "word_count": 612,
      "text": "...",
      "content_hash": "sha256..."
    }
"""

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError as e:
    sys.exit(f"Missing dependency: {e.name}. Install with: pip install pyyaml")


def int_to_roman(n):
    """1 -> 'I', 14 -> 'XIV', 22 -> 'XXII'. Supports 1..3999."""
    if n is None or n < 1:
        return ""
    pairs = [
        (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
        (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
        (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
    ]
    out = []
    for v, sym in pairs:
        while n >= v:
            out.append(sym)
            n -= v
    return "".join(out)


def word_count(text):
    return len(text.split())


def format_locator(book, chapter, section_start, section_end, book_style, has_sections):
    """Human-readable locator.

    Examples:
      Calvin (arabic, has_sections):   "Book 1, Ch. 1, §1-3"
      Augustine (roman, no sections):  "Book XIV, Ch. 28"
    """
    parts = []
    if book is not None:
        book_str = int_to_roman(book) if book_style == "roman" else str(book)
        parts.append(f"Book {book_str}")
    if chapter is not None:
        parts.append(f"Ch. {chapter}")
    if has_sections and section_start is not None:
        if section_end is not None and section_end != section_start:
            parts.append(f"\u00a7{section_start}\u2013{section_end}")
        else:
            parts.append(f"\u00a7{section_start}")
    return ", ".join(parts)


def flush(buffer, work_id, chunk_index, book_style, has_sections):
    """Turn a list of paragraph dicts into one chunk dict."""
    if not buffer:
        return None

    text = "\n\n".join(p["text"] for p in buffer)
    wc = word_count(text)

    # Section range — ignoring any None entries defensively.
    sections = [p["section"] for p in buffer if p.get("section") is not None]
    section_start = sections[0] if sections else None
    section_end = sections[-1] if sections else None

    pages_start = [p["ccel_page_start"] for p in buffer if p.get("ccel_page_start") is not None]
    pages_end = [p["ccel_page_end"] for p in buffer if p.get("ccel_page_end") is not None]
    ccel_page_start = pages_start[0] if pages_start else None
    ccel_page_end = pages_end[-1] if pages_end else None

    book = buffer[0]["book"]
    chapter = buffer[0]["chapter"]

    return {
        "work_id": work_id,
        "chunk_index": chunk_index,
        "book": book,
        "chapter": chapter,
        "section_start": section_start,
        "section_end": section_end,
        "ccel_page_start": ccel_page_start,
        "ccel_page_end": ccel_page_end,
        "locator": format_locator(book, chapter, section_start, section_end, book_style, has_sections),
        "word_count": wc,
        "text": text,
        "content_hash": hashlib.sha256(text.encode("utf-8")).hexdigest(),
    }


def chunk_paragraphs(paragraphs, target_words, work_id, soft_boundary, hard_boundary, book_style, has_sections):
    """Apply the soft/hard boundary rules. Returns a list of chunk dicts.

    soft_boundary: "paragraph" | "section" | "chapter"
        When buffer is at/over target_words, flush at the next transition of
        this granularity. "paragraph" flushes on every paragraph boundary
        (i.e., whenever we're over target, flush immediately).
    hard_boundary: "chapter" | "book"
        Always flush when crossing this boundary, regardless of word count.
    """
    chunks = []
    buffer = []

    def buffer_words():
        return sum(word_count(p["text"]) for p in buffer)

    def crosses_hard(prev, curr):
        if prev["book"] != curr["book"]:
            return True
        if hard_boundary == "chapter" and prev["chapter"] != curr["chapter"]:
            return True
        return False

    def crosses_soft(prev, curr):
        if soft_boundary == "paragraph":
            return True  # every paragraph boundary counts
        if soft_boundary == "section":
            return prev.get("section") != curr.get("section")
        if soft_boundary == "chapter":
            return prev["chapter"] != curr["chapter"]
        return False

    for p in paragraphs:
        if not buffer:
            buffer.append(p)
            continue

        last = buffer[-1]

        if crosses_hard(last, p):
            chunks.append(flush(buffer, work_id, len(chunks), book_style, has_sections))
            buffer = [p]
            continue

        if buffer_words() >= target_words and crosses_soft(last, p):
            chunks.append(flush(buffer, work_id, len(chunks), book_style, has_sections))
            buffer = [p]
            continue

        buffer.append(p)

    if buffer:
        chunks.append(flush(buffer, work_id, len(chunks), book_style, has_sections))

    return chunks


def run(manifest_path):
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = yaml.safe_load(f)

    work_id = manifest["id"]
    ingest = manifest.get("ingest", {})
    target_words = int(ingest.get("chunk_target_words", 600))
    soft_boundary = ingest.get("chunk_boundary", "section")
    hard_boundary = ingest.get("chunk_hard_boundary", "chapter")
    book_style = ingest.get("locator_book_style", "arabic")
    has_sections = bool(ingest.get("locator_has_sections", True))

    repo_root = Path(manifest_path).resolve().parent.parent.parent
    in_path = repo_root / "corpus" / "parsed" / work_id / "paragraphs.jsonl"
    if not in_path.exists():
        sys.exit(
            f"Parsed paragraphs not found at {in_path}. Run parse_ccel_thml.py first."
        )

    print(f"[chunk] Reading {in_path}")
    paragraphs = []
    with open(in_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                paragraphs.append(json.loads(line))
    print(f"[chunk] Loaded {len(paragraphs)} paragraphs")

    chunks = chunk_paragraphs(
        paragraphs, target_words, work_id,
        soft_boundary, hard_boundary, book_style, has_sections,
    )

    out_dir = repo_root / "corpus" / "chunked" / work_id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "chunks.jsonl"
    with open(out_path, "w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")

    # Stats
    wcs = [c["word_count"] for c in chunks]
    avg = sum(wcs) / len(wcs) if wcs else 0
    min_wc = min(wcs) if wcs else 0
    max_wc = max(wcs) if wcs else 0
    over_1000 = sum(1 for w in wcs if w > 1000)
    under_200 = sum(1 for w in wcs if w < 200)

    print(f"[chunk] Wrote {len(chunks)} chunks -> {out_path}")
    print(f"[chunk] Word count: avg={avg:.0f}  min={min_wc}  max={max_wc}")
    print(f"[chunk] Chunks over 1000 words: {over_1000}")
    print(f"[chunk] Chunks under 200 words: {under_200}")
    print(f"[chunk] Target: {target_words} words, soft={soft_boundary}, hard={hard_boundary}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("manifest", help="Path to corpus/manifest/<work>.yaml")
    args = ap.parse_args()
    if not os.path.exists(args.manifest):
        sys.exit(f"Manifest not found: {args.manifest}")
    run(args.manifest)


if __name__ == "__main__":
    main()
