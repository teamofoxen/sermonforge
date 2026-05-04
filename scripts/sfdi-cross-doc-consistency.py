#!/usr/bin/env python3
"""
SFDI cross-document consistency drift check (Sweep B).

Verifies the SFDI completion update is consistent across the 6 related docs
plus the two memory files. Exits 0 only when all 7 criteria pass.
"""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

REPO = Path("C:/Projects/SermonForge-sfdi")
MEMORY = Path("C:/Users/rossa/.claude/projects/C--Projects-SermonForge/memory")

DOCS = {
    "SFDI":         REPO / "docs/PROPOSALS/study-field-definition-initiative.md",
    "CORE":         REPO / "docs/CORE.md",
    "SPRD":         REPO / "docs/PROPOSALS/study-phase-redesign.md",
    "charter":      REPO / "docs/PROPOSALS/sfdi-charter.md",
    "vision":       REPO / "docs/PROPOSALS/sfdi-throughline-vision.md",
    "workspace":    REPO / "docs/SYSTEMS/sermon-workspace.md",
    "CHANGELOG":    REPO / "CHANGELOG.md",
    "MEMORY":       MEMORY / "MEMORY.md",
    "state_memory": MEMORY / "project_sprd_sfdi_state.md",
}

content = {}
lines = {}
for name, path in DOCS.items():
    try:
        text = path.read_text(encoding="utf-8")
        content[name] = text
        lines[name] = text.splitlines()
    except FileNotFoundError:
        print(f"ERROR: file not found: {path}")
        sys.exit(2)

print("=" * 78)
print("SFDI CROSS-DOCUMENT CONSISTENCY DRIFT CHECK (Sweep B)")
print("=" * 78)

results = []  # [(name, status, [findings], [info])]


# ---------------------------------------------------------------------------
# C1 — Named outcomes spelled identically
# ---------------------------------------------------------------------------
canonical_outcomes = [
    "Observation Set",
    "Interpretation Set",
    "Christ-Connection Statement",
    "Implications Synthesis",
]
bad_variants = [
    "Observe Set",
    "Interpretive Set",
    "Christ Connection Statement",   # missing hyphen
    "Christ-Connection Set",
    "Implication Synthesis",          # singular
]

c1 = []
for outcome in canonical_outcomes:
    if outcome not in content["SFDI"]:
        c1.append(f"MISSING canonical name in SFDI: '{outcome}'")

for doc_name, text in content.items():
    for variant in bad_variants:
        for ln, line in enumerate(text.splitlines(), 1):
            if variant in line:
                c1.append(f"BAD VARIANT '{variant}' in {doc_name}:{ln} — {line.strip()[:120]}")

results.append(("C1 — Named outcomes spelled identically across all docs", "FAIL" if c1 else "PASS", c1, []))


# ---------------------------------------------------------------------------
# C2 — Canonical vocabulary terms present in SFDI, SPRD, workspace
# ---------------------------------------------------------------------------
canonical_terms = [
    "field", "question", "answer", "sub-phase",
    "throughline", "named outcome", "handoff", "Pastoral Context",
]
c2 = []
for doc_key in ["SFDI", "SPRD", "workspace"]:
    text_lower = content[doc_key].lower()
    for term in canonical_terms:
        if term.lower() not in text_lower:
            c2.append(f"MISSING term '{term}' in {doc_key}")

results.append(("C2 — Canonical vocabulary present in SFDI/SPRD/workspace", "FAIL" if c2 else "PASS", c2, []))


# ---------------------------------------------------------------------------
# C3 — Per-phase field counts (9, 7, 5, 4) consistent
# ---------------------------------------------------------------------------
c3 = []
sfdi = content["SFDI"]
expected_orders = ["9", "7", "5", "4"]
sfdi_orders = re.findall(r"### Field order \(revised — (\d+) fields\)", sfdi)
if sfdi_orders != expected_orders:
    c3.append(f"SFDI field-order counts: {sfdi_orders}, expected {expected_orders}")

ws_text = content["workspace"]
ws_checks = [
    (r"Phase 1.{0,80}9 fields", "Phase 1 = 9"),
    (r"Phase 2.{0,80}7 fields", "Phase 2 = 7"),
    (r"Phase 3.{0,80}5 fields", "Phase 3 = 5"),
    (r"Phase 4.{0,80}4 fields", "Phase 4 = 4"),
]
for pat, desc in ws_checks:
    if not re.search(pat, ws_text):
        c3.append(f"workspace: missing pattern for {desc}  (regex: {pat})")

sprd_text = content["SPRD"]
for stale in ["9+9+7+14", "11+9+7+14"]:
    if stale in sprd_text:
        for ln, line in enumerate(sprd_text.splitlines(), 1):
            if stale in line:
                c3.append(f"SPRD:{ln} — stale field count '{stale}' — {line.strip()[:120]}")

if "9+7+5+4" not in sprd_text:
    c3.append("SPRD: missing canonical '9+7+5+4' Component 3 field-count")

clog = content["CHANGELOG"]
for cstr in ["9 → 7 fields", "8 slots → 5 fields", "15 slots → 4 fields"]:
    if cstr not in clog:
        c3.append(f"CHANGELOG: missing reshape count '{cstr}'")

sm = content["state_memory"]
for cstr in ["Phase 1 Observe: 9", "Phase 2 Interpret: 7", "Phase 3 RT: 5", "Phase 4 Implications: 4"]:
    if cstr not in sm:
        c3.append(f"state_memory: missing per-phase count '{cstr}'")

results.append(("C3 — Per-phase field counts (9, 7, 5, 4) consistent", "FAIL" if c3 else "PASS", c3, []))


# ---------------------------------------------------------------------------
# C4 — Status date 2026-05-04 referenced consistently
# ---------------------------------------------------------------------------
c4 = []
date_required = "2026-05-04"

m = re.search(r"\*\*Status:\*\*[^\n]+", sfdi)
if not m:
    c4.append("SFDI: no Status line found")
elif date_required not in m.group():
    c4.append(f"SFDI status line missing {date_required}: {m.group().strip()[:120]}")

charter = content["charter"]
m = re.search(r"\*\*Status:\*\*[^\n]+", charter)
if not m:
    c4.append("Charter: no Status line found")
elif date_required not in m.group():
    c4.append(f"Charter status line missing {date_required}: {m.group().strip()[:120]}")

m = re.search(r"\*\*Status:\*\*[^\n]+", sprd_text)
if not m:
    c4.append("SPRD: no Status line found")
elif date_required not in m.group():
    c4.append(f"SPRD status line missing {date_required}: {m.group().strip()[:120]}")

m = re.search(r"^description:[^\n]+", sm, re.MULTILINE)
if not m:
    c4.append("state_memory: no description in frontmatter")
elif date_required not in m.group():
    c4.append(f"state_memory frontmatter missing {date_required}: {m.group().strip()[:120]}")

mem_text = content["MEMORY"]
state_entry = None
for line in mem_text.splitlines():
    if "project_sprd_sfdi_state.md" in line:
        state_entry = line
        break
if not state_entry:
    c4.append("MEMORY.md: no project_sprd_sfdi_state.md entry found")
elif date_required not in state_entry:
    c4.append(f"MEMORY.md entry missing {date_required}: {state_entry.strip()[:120]}")

if not re.search(r"^## 2026-05-04", clog, re.MULTILINE):
    c4.append("CHANGELOG: missing '## 2026-05-04' entry header")

results.append(("C4 — Status date 2026-05-04 consistent across status surfaces", "FAIL" if c4 else "PASS", c4, []))


# ---------------------------------------------------------------------------
# C5 — Process Contract #6 binding language consistent
# ---------------------------------------------------------------------------
c5 = []
c5_info = []

for doc_key in ["CORE", "charter", "state_memory"]:
    text = content[doc_key]
    if "binding" not in text:
        c5.append(f"{doc_key}: doesn't mention 'binding' anywhere")

stale_phrases = ["drafted but inactive", "vacuous"]
historical = re.compile(
    r"\b(was|were|previously|no longer|rather than|formerly|prior to|until|originally)\b",
    re.IGNORECASE,
)
for doc_key in ["CORE", "SFDI", "SPRD", "charter", "state_memory"]:
    for ln, line in enumerate(lines[doc_key], 1):
        for phrase in stale_phrases:
            if phrase in line:
                if historical.search(line):
                    c5_info.append(f"OK (historical): {doc_key}:{ln} — '{phrase}' qualified — {line.strip()[:120]}")
                else:
                    c5.append(f"STALE: {doc_key}:{ln} — '{phrase}' without historical qualifier — {line.strip()[:120]}")

results.append(("C5 — Process Contract #6 binding language consistent", "FAIL" if c5 else "PASS", c5, c5_info))


# ---------------------------------------------------------------------------
# C6 — SPRD structural backlog references match SFDI shape
# ---------------------------------------------------------------------------
c6 = []

backlog_items = [
    {
        "name": "Implications restructure",
        "search": "Implications restructure",
        "expected_refs": ["Phase 4", "three-way conversation"],
    },
    {
        "name": "PC card removal",
        "search": "PC card removal",
        "expected_refs": ["Field 3"],
    },
    {
        "name": "Background series-level inheritance",
        "search": "Background field series-level inheritance",
        "expected_refs": ["Phase 1 Field 1"],
    },
    {
        "name": "Component 1 cumulative-column extension",
        "search": "Cumulative-column extension",
        "expected_refs": ["Phase 1 Field 4 Q3", "Phases 2/3/4"],
    },
]

for item in backlog_items:
    sprd_lines = lines["SPRD"]
    occurrences = [ln for ln, line in enumerate(sprd_lines, 1) if item["search"] in line]
    if not occurrences:
        c6.append(f"SPRD: backlog item '{item['name']}' (search='{item['search']}') NOT FOUND")
        continue
    # PASS if AT LEAST ONE occurrence has all expected refs in its window
    any_satisfied = False
    closest_partial = None
    for ln in occurrences:
        start = max(0, ln - 1)
        end = min(len(sprd_lines), ln + 8)
        window = "\n".join(sprd_lines[start:end])
        missing = [ref for ref in item["expected_refs"] if ref not in window]
        if not missing:
            any_satisfied = True
            break
        if closest_partial is None or len(missing) < len(closest_partial[1]):
            closest_partial = (ln, missing)
    if not any_satisfied:
        ln, missing = closest_partial
        c6.append(
            f"SPRD: '{item['name']}' has {len(occurrences)} occurrence(s) but none has all expected refs nearby; "
            f"closest at line {ln} missing: {missing}"
        )

results.append(("C6 — SPRD backlog references SFDI shape accurately", "FAIL" if c6 else "PASS", c6, []))


# ---------------------------------------------------------------------------
# C7 — Field name spellings within SFDI
# ---------------------------------------------------------------------------
c7 = []
c7_info = []

# Identify Field 3's section boundary so "Character Function" mentions inside
# the alternates-considered context can be allowed.
sfdi_lines = lines["SFDI"]
in_field3_block = set()  # 1-indexed line numbers
in_field3 = False
for i, line in enumerate(sfdi_lines, 1):
    if line.startswith("### Field 3 ") and "Character Purpose" in line:
        in_field3 = True
    elif in_field3 and line.startswith("### Field"):
        in_field3 = False
    if in_field3:
        in_field3_block.add(i)

for i, line in enumerate(sfdi_lines, 1):
    if "Character Function" in line:
        if i in in_field3_block:
            c7_info.append(f"OK (Field 3 alternates-considered): SFDI:{i} — {line.strip()[:120]}")
        else:
            c7.append(f"SFDI:{i} — 'Character Function' outside Field 3 alternates context — {line.strip()[:120]}")

for i, line in enumerate(sfdi_lines, 1):
    if "(placeholder)" in line:
        c7.append(f"SFDI:{i} — '(placeholder)' annotation still present — {line.strip()[:120]}")

results.append(("C7 — Field name spellings consistent within SFDI", "FAIL" if c7 else "PASS", c7, c7_info))


# ---------------------------------------------------------------------------
# Print summary
# ---------------------------------------------------------------------------
n_fail = 0
for name, status, findings, info in results:
    print()
    print(f"[{status}] {name}")
    if findings:
        print(f"  Failures: {len(findings)}")
        for f in findings:
            print(f"    - {f}")
    if info:
        print(f"  Informational (historical-context occurrences, not failures): {len(info)}")
        for x in info[:8]:
            print(f"    - {x}")
        if len(info) > 8:
            print(f"    - ... and {len(info)-8} more")
    if status == "FAIL":
        n_fail += 1

print()
print("=" * 78)
print(f"Criteria total: 7    Failing: {n_fail}")
print("=" * 78)
sys.exit(0 if n_fail == 0 else 1)
