"""
parse_ccel_thml.py

Parse a CCEL ThML XML file into a JSONL of body paragraphs with structural
metadata (book, chapter, section, ccel_page_start, ccel_page_end).

Behavior is driven by the manifest's `ingest.structure` block, which tells the
parser:
  - which subtree(s) of the source to walk (`scope`)
  - at which div level Books and Chapters live, and how to detect them
  - whether and how to extract section numbers from paragraph text

This lets one parser handle works with different ThML layouts (e.g., Calvin's
Institutes where Books are div1, vs. Augustine's City of God in NPNF where
Books are div2 under a work-level div1).

Usage:
    python scripts/theology/ingest/parse_ccel_thml.py <manifest.yaml>

Output:
    corpus/parsed/<manifest.id>/paragraphs.jsonl

Each JSONL line:
    {
      "book": 1,
      "chapter": 2,
      "section": 3,           # null when section.mode == "none"
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


WHITESPACE_RE = re.compile(r"\s+")
SECTION_PREFIX_RE = re.compile(r"^\s*(\d+)\.\s+")
# Matches a <p> that just restates its enclosing chapter's title (NPNF pattern:
# "Chapter 12.—..."). Calvin's Institutes does not use this pattern, so the
# filter is a no-op there.
CHAPTER_TITLE_P_RE = re.compile(r"^\s*Chapter\s+\d+[.\u2014\-]", re.IGNORECASE)

# p-classes that are NOT body prose — these are chapter-outline / footnote paragraphs.
SKIP_P_CLASSES = {"introHead", "intro", "footnote"}


def localname(elem):
    return ET.QName(elem).localname


def parse_roman(s):
    """Parse a Roman numeral string (any case). Returns int or None."""
    if not s:
        return None
    s = s.strip().upper()
    if not s:
        return None
    values = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    prev = 0
    for ch in reversed(s):
        v = values.get(ch)
        if v is None:
            return None
        if v < prev:
            total -= v
        else:
            total += v
            prev = v
    return total


def parse_n(s, style):
    """Parse a div @n value according to style (roman|arabic)."""
    if s is None:
        return None
    s = s.strip()
    if style == "roman":
        return parse_roman(s)
    if style == "arabic":
        return int(s) if s.isdigit() else None
    return None


def match_selector(elem, selector):
    """True if elem matches the selector dict.

    Supported keys:
      title_prefix: case-insensitive prefix of @title
      title_regex:  regex searched against @title
      type_attr:    exact match against @type
    """
    if not selector:
        return True
    if "title_prefix" in selector:
        title = (elem.get("title") or "").strip().upper()
        if not title.startswith(selector["title_prefix"].upper()):
            return False
    if "title_regex" in selector:
        title = (elem.get("title") or "")
        if not re.search(selector["title_regex"], title, re.IGNORECASE):
            return False
    if "type_attr" in selector:
        if (elem.get("type") or "") != selector["type_attr"]:
            return False
    return True


def extract_chapter_number(elem, chapter_cfg):
    """Return chapter number from elem per chapter_cfg, or None."""
    n_from = chapter_cfg.get("n_from", "n_attr")
    if n_from == "title_regex":
        pattern = chapter_cfg["selector"]["title_regex"]
        m = re.search(pattern, elem.get("title") or "", re.IGNORECASE)
        return int(m.group(1)) if m else None
    if n_from == "n_attr":
        return parse_n(elem.get("n"), chapter_cfg.get("n_style", "arabic"))
    return None


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
    return WHITESPACE_RE.sub(" ", s).strip()


def normalize_page(n):
    """CCEL <pb n="..."> values — arabic integers. Return int or None."""
    if n is None:
        return None
    n = n.strip()
    if n.isdigit():
        return int(n)
    return None


def find_scope_roots(root, scope):
    """Return a list of elements from which to walk, per scope config."""
    kind = scope.get("kind", "all_div1")
    if kind == "all_div1":
        return [root]  # walk from root; book selector filters div1s
    if kind == "div1_id":
        target = scope.get("value")
        matches = [
            e for e in root.iter() if localname(e) == "div1" and e.get("id") == target
        ]
        if not matches:
            sys.exit(f"[parse] scope div1_id={target!r} not found in source")
        return matches
    sys.exit(f"[parse] Unknown scope.kind: {kind!r}")


def parse(manifest_path):
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = yaml.safe_load(f)

    work_id = manifest["id"]
    raw_path = Path(manifest["raw_path"])
    if not raw_path.is_absolute():
        repo_root = Path(manifest_path).resolve().parent.parent.parent
        raw_path = repo_root / raw_path
    if not raw_path.exists():
        sys.exit(f"Raw source not found at {raw_path}")

    ingest = manifest.get("ingest", {})
    structure = ingest.get("structure")
    if not structure:
        sys.exit(
            "Manifest is missing ingest.structure. Legacy scope=books_only manifests "
            "must be migrated — see calvin_institutes_beveridge.yaml for the shape."
        )

    scope_cfg = structure.get("scope", {"kind": "all_div1"})
    book_cfg = structure["book"]
    chapter_cfg = structure["chapter"]
    section_cfg = structure.get("section", {"mode": "none"})

    book_level = book_cfg["level"]          # "div1" or "div2"
    chapter_level = chapter_cfg["level"]     # "div2" or "div3"
    book_n_style = book_cfg.get("n_style", "roman")
    section_mode = section_cfg.get("mode", "none")

    print(f"[parse] Loading {raw_path} ...")
    tree = ET.parse(str(raw_path))
    root = tree.getroot()

    scope_roots = find_scope_roots(root, scope_cfg)

    # State
    current_book = None
    current_chapter = None
    current_section = None
    current_page = None

    in_book = False
    in_chapter = False
    in_note = False

    in_body_p = False
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

    def walk(scope_root):
        nonlocal current_book, current_chapter, current_section, current_page
        nonlocal in_book, in_chapter, in_note, in_body_p, pending_p_start_page

        for event, elem in ET.iterwalk(scope_root, events=("start", "end")):
            tag = localname(elem)

            if event == "start":
                if tag == "note":
                    in_note = True
                    continue
                if in_note:
                    continue

                if tag == book_level:
                    if match_selector(elem, book_cfg.get("selector")):
                        current_book = parse_n(elem.get("n"), book_n_style)
                        in_book = True
                        current_chapter = None
                        current_section = None
                        current_page = None
                        stats["books_seen"] += 1
                    else:
                        in_book = False

                elif tag == chapter_level and in_book:
                    if match_selector(elem, chapter_cfg.get("selector")):
                        ch = extract_chapter_number(elem, chapter_cfg)
                        if ch is not None:
                            current_chapter = ch
                            current_section = None
                            in_chapter = True
                            stats["chapters_seen"] += 1
                        else:
                            in_chapter = False
                    else:
                        in_chapter = False

                elif tag == "pb" and in_book:
                    page = normalize_page(elem.get("n"))
                    if page is not None:
                        current_page = page
                        if stats["pages_min"] is None or page < stats["pages_min"]:
                            stats["pages_min"] = page
                        if stats["pages_max"] is None or page > stats["pages_max"]:
                            stats["pages_max"] = page

                elif tag == "p" and in_book and in_chapter and is_body_p(elem):
                    if section_mode == "leading_number_regex":
                        lead = elem.text or ""
                        m = SECTION_PREFIX_RE.match(lead)
                        if m:
                            current_section = int(m.group(1))
                    in_body_p = True
                    pending_p_start_page = current_page

                elif tag == "p" and in_book and in_chapter:
                    stats["paragraphs_skipped_non_body"] += 1

            else:  # end event
                if tag == "note":
                    in_note = False
                    continue
                if in_note:
                    continue

                if (
                    tag == "p"
                    and in_book
                    and in_chapter
                    and is_body_p(elem)
                    and in_body_p
                ):
                    raw_text = extract_text(elem)
                    if section_mode == "leading_number_regex":
                        raw_text = SECTION_PREFIX_RE.sub("", raw_text, count=1)
                    text = clean_text(raw_text)
                    # Skip <p> that just restates the chapter title.
                    if text and not CHAPTER_TITLE_P_RE.match(text):
                        page_start = pending_p_start_page
                        if page_start is None:
                            page_start = current_page
                        paragraphs.append(
                            {
                                "book": current_book,
                                "chapter": current_chapter,
                                "section": current_section,
                                "ccel_page_start": page_start,
                                "ccel_page_end": current_page,
                                "text": text,
                            }
                        )
                        stats["paragraphs_emitted"] += 1
                    in_body_p = False
                    pending_p_start_page = None

                elif tag == chapter_level and in_book:
                    in_chapter = False

                elif tag == book_level:
                    if in_book:
                        in_book = False
                        current_page = None

    for sr in scope_roots:
        walk(sr)

    out_dir = Path(manifest_path).resolve().parent.parent.parent / "corpus" / "parsed" / work_id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "paragraphs.jsonl"
    with open(out_path, "w", encoding="utf-8") as f:
        for p in paragraphs:
            f.write(json.dumps(p, ensure_ascii=False) + "\n")

    print(f"[parse] Wrote {len(paragraphs)} paragraphs -> {out_path}")
    print(f"[parse] Books: {stats['books_seen']}")
    print(f"[parse] Chapters: {stats['chapters_seen']}")
    print(f"[parse] Body paragraphs emitted: {stats['paragraphs_emitted']}")
    print(f"[parse] Non-body <p> skipped inside chapters: {stats['paragraphs_skipped_non_body']}")
    print(f"[parse] Page range seen: {stats['pages_min']}-{stats['pages_max']}")
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
