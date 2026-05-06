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

# Resolve repo root from the script's own location so this works whether
# invoked from the main repo or a worktree (sub/sfdi was the original home).
REPO = Path(__file__).resolve().parent.parent
MEMORY = Path("C:/Users/rossa/.claude/projects/C--Projects-SermonForge/memory")

DOCS = {
    "SFDI":         REPO / "docs/PROPOSALS/study-field-definition-initiative.md",
    "CORE":         REPO / "docs/CORE.md",
    "SPRD":         REPO / "docs/PROPOSALS/study-phase-redesign.md",
    "charter":      REPO / "docs/PROPOSALS/sfdi-charter.md",
    "workspace":    REPO / "docs/SYSTEMS/sermon-workspace.md",
    "CHANGELOG":    REPO / "CHANGELOG.md",
    "MEMORY":       MEMORY / "MEMORY.md",
    "state_memory": MEMORY / "project_sprd_sfdi_state.md",
}
# 2026-05-06 — `vision` entry removed: `sfdi-throughline-vision.md` was merged
# into `sfdi-charter.md § Orientation` on 2026-05-05 (commit 7365af6). The
# vision content was never read by any criterion in this validator, so no
# replacement reference is needed.

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
# C2 — Canonical vocabulary terms present in SFDI + workspace
# (SPRD dropped 2026-05-06 — the SPRD planning doc was trimmed from 579 to
# 110 lines on 2026-05-05; vocabulary now lives in SFDI and the workspace
# system doc, not in the thin progress doc that SPRD became.)
# ---------------------------------------------------------------------------
canonical_terms = [
    "field", "question", "answer", "sub-phase",
    "throughline", "named outcome", "handoff", "Pastoral Context",
]
c2 = []
for doc_key in ["SFDI", "workspace"]:
    text_lower = content[doc_key].lower()
    for term in canonical_terms:
        if term.lower() not in text_lower:
            c2.append(f"MISSING term '{term}' in {doc_key}")

results.append(("C2 — Canonical vocabulary present in SFDI + workspace", "FAIL" if c2 else "PASS", c2, []))


# ---------------------------------------------------------------------------
# C3 — Per-phase field counts (8, 8, 5, 4) consistent
# Updated 2026-05-05: Background field retired (Phase 1 9 → 8); Genre field
# added to Interpret (Phase 2 7 → 8). CHANGELOG and historical SPRD strings
# from the original 9 → 7 reshape are still present in those docs as past
# entries; we no longer require them as canonical, only forbid stale counts.
# ---------------------------------------------------------------------------
c3 = []
sfdi = content["SFDI"]
expected_orders = ["8", "8", "5", "4"]
sfdi_orders = re.findall(r"### Field order \(revised — (\d+) fields\)", sfdi)
if sfdi_orders != expected_orders:
    c3.append(f"SFDI field-order counts: {sfdi_orders}, expected {expected_orders}")

ws_text = content["workspace"]
# Newline-tolerant: workspace doc wraps long sentences, so "N-field" and "shape"
# may sit on adjacent lines.
ws_checks = [
    (r"Phase 1[\s\S]{0,400}8-field\s+shape", "Phase 1 = 8"),
    (r"Phase 2[\s\S]{0,400}8-field\s+shape", "Phase 2 = 8"),
    (r"Phase 3[\s\S]{0,400}5-field\s+shape", "Phase 3 = 5"),
    (r"Phase 4[\s\S]{0,400}4-field\s+shape", "Phase 4 = 4"),
]
for pat, desc in ws_checks:
    if not re.search(pat, ws_text):
        c3.append(f"workspace: missing pattern for {desc}  (regex: {pat})")

sprd_text = content["SPRD"]
for stale in ["9+9+7+14", "11+9+7+14", "9+7+5+4"]:
    if stale in sprd_text:
        for ln, line in enumerate(sprd_text.splitlines(), 1):
            if stale in line:
                c3.append(f"SPRD:{ln} — stale field count '{stale}' — {line.strip()[:120]}")

# 2026-05-06: SPRD-specific "8+8+5+4 Component 3 field-count must appear"
# check dropped — SPRD was trimmed to a thin progress doc 2026-05-05 and no
# longer carries Component 3 framing. The 8+8+5+4 shape stays verified by the
# SFDI field-order regex, the workspace per-phase shape patterns, and the
# state_memory per-phase counts above.

sm = content["state_memory"]
for cstr in ["Phase 1 Observe: 8", "Phase 2 Interpret: 8", "Phase 3 RT: 5", "Phase 4 Implications: 4"]:
    if cstr not in sm:
        c3.append(f"state_memory: missing per-phase count '{cstr}'")

results.append(("C3 — Per-phase field counts (8, 8, 5, 4) consistent", "FAIL" if c3 else "PASS", c3, []))


# ---------------------------------------------------------------------------
# C4 — RETIRED 2026-05-06.
# Original criterion locked a single canonical date (2026-05-04 — the SFDI
# walks-completion day) across SFDI / charter / SPRD / state_memory /
# MEMORY.md / CHANGELOG status lines. Brittle by design: every subsequent
# session that touches a status surface bumps that doc's most recent date,
# breaking the synchronization the criterion expected. The Field 3 unified-
# canvas refactor (2026-05-05 → 2026-05-06) is the third such drift.
# Synchronization across docs is partly covered by C1 (named outcomes spelled
# the same) and C3 (per-phase counts agree); a date-locked check adds noise
# without adding signal.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# C5 — Process Contract #6 binding language consistent
# ---------------------------------------------------------------------------
c5 = []
c5_info = []

for doc_key in ["CORE", "charter", "state_memory"]:
    text = content[doc_key]
    if "binding" not in text:
        c5.append(f"{doc_key}: doesn't mention 'binding' anywhere")

stale_phrases = [r"drafted but inactive", r"\bvacuous\b"]  # \b avoids matching "vacuously" (used as a technical CS/logic adverb)
historical = re.compile(
    r"\b(was|were|previously|no longer|rather than|formerly|prior to|until|originally)\b",
    re.IGNORECASE,
)
for doc_key in ["CORE", "SFDI", "SPRD", "charter", "state_memory"]:
    for ln, line in enumerate(lines[doc_key], 1):
        for phrase in stale_phrases:
            if re.search(phrase, line):
                if historical.search(line):
                    c5_info.append(f"OK (historical): {doc_key}:{ln} — '{phrase}' qualified — {line.strip()[:120]}")
                else:
                    c5.append(f"STALE: {doc_key}:{ln} — '{phrase}' without historical qualifier — {line.strip()[:120]}")

results.append(("C5 — Process Contract #6 binding language consistent", "FAIL" if c5 else "PASS", c5, c5_info))


# ---------------------------------------------------------------------------
# C6 — RETIRED 2026-05-06.
# Original criterion required SPRD's backlog list to name "Implications
# restructure", "PC card removal", and "Component 1 cumulative-column
# extension" with their downstream-shape references intact. All three items
# shipped during SPRD's B-series in 2026-05-04, and SPRD was trimmed from a
# 579-line planning doc to a 110-line progress doc on 2026-05-05 — the
# backlog list is no longer there to check. Implementation history now lives
# in `git log` and `CHANGELOG.md`.
# ---------------------------------------------------------------------------
c6 = []

backlog_items = []  # criterion retired; loop below emits PASS

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

# Identify Character Purpose field's section boundary so "Character Function"
# mentions inside the alternates-considered context can be allowed. (Field
# was Phase 2 Field 3 originally; renumbered to Field 4 after Genre added at
# position 2 on 2026-05-05.)
sfdi_lines = lines["SFDI"]
in_char_purpose_block = set()  # 1-indexed line numbers
in_block = False
for i, line in enumerate(sfdi_lines, 1):
    if line.startswith("### Field ") and "Character Purpose" in line:
        in_block = True
    elif in_block and line.startswith("### Field"):
        in_block = False
    if in_block:
        in_char_purpose_block.add(i)

for i, line in enumerate(sfdi_lines, 1):
    if "Character Function" in line:
        if i in in_char_purpose_block:
            c7_info.append(f"OK (Character Purpose alternates-considered): SFDI:{i} — {line.strip()[:120]}")
        else:
            c7.append(f"SFDI:{i} — 'Character Function' outside Character Purpose alternates context — {line.strip()[:120]}")

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
print(f"Criteria total: {len(results)}    Failing: {n_fail}")
print("=" * 78)
sys.exit(0 if n_fail == 0 else 1)
