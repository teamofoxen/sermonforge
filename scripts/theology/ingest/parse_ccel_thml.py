"""
parse_ccel_thml.py

Parse a CCEL ThML XML file into a JSONL of body paragraphs with structural
metadata (book, chapter, section, ccel_page_start, ccel_page_end).

Scope is governed by the manifest's `ingest` block. For Calvin's Institutes
(Beveridge) the current settings are: books_only, skip chapter arguments,
strip footnotes, span pages, section boundaries from leading "N. " in text.

Usage:
    python scripts/theology/ingest/parse_ccel_thml.py <manifest.yaml>

Output:
    corpus/parsed/<manifest.id>/paragraphs.jsonl

Each JSONL line:
    {
      "book": 1,
      "chapter": 2,
      "section": 3,
      "ccel_page_start": 37,
      "ccel_page_end": 38,
      "text": "..."
    }

Dependencies:
    pip install lxml pyyaml
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    import yaml
    from lxml import etree as ET
except ImportError as e:
    sys.exit(
        f"Missing dependency: {e.name}. Install with: pip install lxml pyyaml"
    )


# Lowercase Roman → int for Book identification (only i..iv needed for Institutes).
ROMAN = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8}

SECTION_PREFIX_RE = re.compile(r"^\s*(\d+)\.\s+")
WHITESPACE_RE = re.compile(r"\s+")

# p-classes that are NOT body prose — these are chapter-outline / footnote paragraphs.
SKIP_P_CLASSES = {"introHead", "intro", "footnote"}


def localname(elem):
    return ET.QName(elem).localname


def is_book_div1(elem):
    """True when div1 represents one of the 4 numbered Books (not Title Page, not Prefatory)."""
    title = (elem.get("title") or "").strip()
    return title.upper().startswith("BOOK ")


def book_number_from_div1(elem):
    """Extract book number 1..4 from the `n` attribute (lowercase Roman)."""
    n = (elem.get("n") or "").strip().lower()
    return ROMAN.get(n)


CHAPTER_TITLE_RE = re.compile(r"CHAPTER\s+(\d+)", re.IGNORECASE)


def chapter_number_from_div2(elem):
    """Extract chapter number from the div2 title string. Returns None for ARGUMENT / non-chapter divs."""
    title = (elem.get("title") or "").strip()
    m = CHAPTER_TITLE_RE.search(title)
    return int(m.group(1)) if m else None


def is_body_p(elem):
    """True for body-prose <p> (not chapter-outline, not footnote)."""
    if localname(elem) != "p":
        return False
    cls = elem.get("class")
    if cls is None:
        return True
    return cls not in SKIP_P_CLASSES


def extract_text(elem):
    """Recursively extract text, skipping <note> subtrees entirely."""
    if localname(elem) == "note":
        return ""
    parts = []
    if elem.text:
        parts.append(elem.text)
    for child in elem:
        parts.append(extract_text(child))
        if child.tail:
            parts.append(child.tail)
    return "".join(parts)


def clean_text(s):
    """Normalize whitespace."""
    return WHITESPACE_RE.sub(" ", s).strip()


def normalize_page(n):
    """Page numbers in the 4 Books are Arabic integers. Return int or None."""
    if n is None:
        return None
    n = n.strip()
    if n.isdigit():
        return int(n)
    return None


def parse(manifest_path):
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = yaml.safe_load(f)

    work_id = manifest["id"]
    raw_path = Path(manifest["raw_path"])
    if not raw_path.is_absolute():
        # resolve relative to the repo root (manifest lives at corpus/manifest/...)
        repo_root = Path(manifest_path).resolve().parent.parent.parent
        raw_path = repo_root / raw_path

    if not raw_path.exists():
        sys.exit(f"Raw source not found at {raw_path}")

    ingest = manifest.get("ingest", {})
    scope = ingest.get("scope", "books_only")
    if scope != "books_only":
        sys.exit(f"This parser only supports scope=books_only (got: {scope})")

    print(f"[parse] Loading {raw_path} ...")
    tree = ET.parse(str(raw_path))
    root = tree.getroot()

    # State
    current_book = None
    current_chapter = None
    current_section = None
    current_page = None

    in_book_div1 = False
    in_real_chapter_div2 = False
    in_note = False

    pending_p_start_page = None

    paragraphs = []
    stats = {
        "books_seen": 0,
        "chapters_seen": 0,
        "paragraphs_emitted": 0,
        "paragraphs_skipped_non_body": 0,
        "pages_min": None,
        "pages_max": None,
    }

    for event, elem in ET.iterwalk(root, events=("start", "end")):
        tag = localname(elem)

        if event == "start":
            if tag == "note":
                in_note = True
                continue

            if in_note:
                continue

            if tag == "div1":
                if is_book_div1(elem):
                    current_book = book_number_from_div1(elem)
                    in_book_div1 = True
                    current_chapter = None
                    current_section = None
                    stats["books_seen"] += 1
                else:
                    in_book_div1 = False

            elif tag == "div2" and in_book_div1:
                ch = chapter_number_from_div2(elem)
                if ch is not None:
                    current_chapter = ch
                    current_section = None
                    in_real_chapter_div2 = True
                    stats["chapters_seen"] += 1
                else:
                    # ARGUMENT or other non-chapter div2 — skip its contents.
                    in_real_chapter_div2 = False

            elif tag == "pb" and in_book_div1:
                page = normalize_page(elem.get("n"))
                if page is not None:
                    current_page = page
                    if stats["pages_min"] is None or page < stats["pages_min"]:
                        stats["pages_min"] = page
                    if stats["pages_max"] is None or page > stats["pages_max"]:
                        stats["pages_max"] = page

            elif (
                tag == "p"
                and in_book_div1
                and in_real_chapter_div2
                and is_body_p(elem)
            ):
                # Check leading section number from elem.text (text before first child).
                lead = elem.text or ""
                m = SECTION_PREFIX_RE.match(lead)
                if m:
                    current_section = int(m.group(1))
                pending_p_start_page = current_page

            elif tag == "p" and in_book_div1 and in_real_chapter_div2:
                stats["paragraphs_skipped_non_body"] += 1

        else:  # end event
            if tag == "note":
                in_note = False
                continue

            if in_note:
                continue

            if (
                tag == "p"
                and in_book_div1
                and in_real_chapter_div2
                and is_body_p(elem)
                and pending_p_start_page is not None
            ):
                raw_text = extract_text(elem)
                # Strip leading "N. " so the text reads as prose.
                raw_text = SECTION_PREFIX_RE.sub("", raw_text, count=1)
                text = clean_text(raw_text)
                if text:
                    paragraphs.append(
                        {
                            "book": current_book,
                            "chapter": current_chapter,
                            "section": current_section,
                            "ccel_page_start": pending_p_start_page,
                            "ccel_page_end": current_page,
                            "text": text,
                        }
                    )
                    stats["paragraphs_emitted"] += 1
                pending_p_start_page = None

            elif tag == "div2" and in_book_div1:
                in_real_chapter_div2 = False

            elif tag == "div1":
                in_book_div1 = False
                current_page = None

    # Write output.
    out_dir = Path(manifest_path).resolve().parent.parent.parent / "corpus" / "parsed" / work_id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "paragraphs.jsonl"
    with open(out_path, "w", encoding="utf-8") as f:
        for p in paragraphs:
            f.write(json.dumps(p, ensure_ascii=False) + "\n")

    print(f"[parse] Wrote {len(paragraphs)} paragraphs → {out_path}")
    print(f"[parse] Books: {stats['books_seen']}")
    print(f"[parse] Chapters: {stats['chapters_seen']}")
    print(f"[parse] Body paragraphs emitted: {stats['paragraphs_emitted']}")
    print(f"[parse] Non-body <p> skipped inside chapters: {stats['paragraphs_skipped_non_body']}")
    print(f"[parse] Page range seen: {stats['pages_min']}–{stats['pages_max']}")
    return out_path, stats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("manifest", help="Path to corpus/manifest/<work>.yaml")
    args = ap.parse_args()

    if not os.path.exists(args.manifest):
        sys.exit(f"Manifest not found: {args.manifest}")

    parse(args.manifest)


if __name__ == "__main__":
    main()
