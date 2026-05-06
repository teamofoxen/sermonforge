#!/usr/bin/env python3
"""
SFDI internal-consistency drift checker.

Verifies docs/PROPOSALS/study-field-definition-initiative.md against seven criteria
defined for the four-sub-phase walk completion. Exit 0 if all pass.

Usage:  python scripts/sfdi-internal-consistency.py
"""
import re
import sys
from pathlib import Path

# Force UTF-8 stdout so em-dashes and arrows survive on Windows cp1252 consoles.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

DOC = Path("docs/PROPOSALS/study-field-definition-initiative.md")

# Phases and field counts
# Updated 2026-05-05: Background field retired (Phase 1 9 → 8); Genre field
# added to Interpret (Phase 2 7 → 8). All Phase 1 fields renumbered down by
# 1; all Phase 2 fields after position 1 renumbered up by 1.
PHASES = [
    ("Phase 1: Observe",          "Observe",            8, "nothing"),
    ("Phase 2: Interpret",        "Interpret",          8, "Observation Set"),
    ("Phase 3: Redemptive Thread","Redemptive Thread",  5, "Interpretation Set"),
    ("Phase 4: Implications",     "Implications",       4, "Christ-Connection Statement"),
]
NAMED_OUTCOMES = [
    ("Observe",            "Observation Set"),
    ("Interpret",          "Interpretation Set"),
    ("Redemptive Thread",  "Christ-Connection Statement"),
    ("Implications",       "Implications Synthesis"),
]
HEAVY_LIFTING = [
    # (Phase, Field N, Field name fragment, total fields in phase)
    ("Observe",            3, "Divisions / Thought Units",     8),  # was Field 4 of 9
    ("Observe",            8, "Possible Implications",         8),  # was Field 9 of 9
    ("Interpret",          8, "Interpretation Synthesis",      8),  # was Field 7 of 7
    ("Redemptive Thread",  2, "How the Passage Points to Christ", 5),
    ("Redemptive Thread",  5, "Christ-Connection Statement",   5),
    ("Implications",       4, "Implications Synthesis",        4),
]

text = DOC.read_text(encoding="utf-8")
lines = text.splitlines()

results = []  # (criterion_label, status, list[str] details)

# ---------------------------------------------------------------------------
# Helpers: split the doc into per-phase ranges, then per-field blocks.
# ---------------------------------------------------------------------------

def find_line(predicate):
    for i, ln in enumerate(lines):
        if predicate(ln):
            return i
    return None

def phase_ranges():
    """Return [(phase_name, start_line, end_line_exclusive), ...] using
    `## Phase N: <name>` headers as start markers."""
    ph_starts = []
    for i, ln in enumerate(lines):
        m = re.match(r"^## Phase (\d+): (.+)$", ln)
        if m:
            ph_starts.append((int(m.group(1)), m.group(2).strip(), i))
    out = []
    for idx, (n, name, start) in enumerate(ph_starts):
        end = ph_starts[idx + 1][2] if idx + 1 < len(ph_starts) else len(lines)
        out.append((name, start, end))
    return out

def field_blocks(phase_start, phase_end):
    """Return list of (field_n, field_name, start_line, end_line_exclusive)
    inside the phase. The boundary is the next `### Field` *or* the next
    `## ` (start of within-sub-phase flow / handoff section).

    Skips retired fields (annotation contains "RETIRED")."""
    blocks = []
    for i in range(phase_start, phase_end):
        m = re.match(r"^### Field (\d+) — (.+?)(?:\s*\*\((.+)\)\*)?\s*$", lines[i])
        if m:
            annotation = m.group(3) or ""
            if "RETIRED" in annotation:
                continue
            blocks.append([int(m.group(1)), m.group(2).strip(), i, None])
    # Resolve end_line for each block.
    for idx, b in enumerate(blocks):
        if idx + 1 < len(blocks):
            b[3] = blocks[idx + 1][2]
        else:
            # Field block ends at next `## ` or phase_end.
            end = phase_end
            for j in range(b[2] + 1, phase_end):
                if lines[j].startswith("## "):
                    end = j
                    break
            b[3] = end
    return [tuple(b) for b in blocks]

phases = phase_ranges()
phase_to_fields = {}
for name, s, e in phases:
    short = name.split("(")[0].strip()
    phase_to_fields[short] = field_blocks(s, e)

# ---------------------------------------------------------------------------
# Criterion 1 — Seven-slot completeness.
# Each field has all seven `- **Slot:**` bullets.
# ---------------------------------------------------------------------------
SLOT_HEADERS = [
    "Name",
    "Intent",
    "Question sequence",
    "What gets written",
    "Role in sub-phase",
    "Connects from",
    "Connects to",
]
c1_details = []
c1_total_present = 0
c1_total_expected = 0
total_fields = 0
for phase_short, blocks in phase_to_fields.items():
    for n, name, s, e in blocks:
        total_fields += 1
        block_text = "\n".join(lines[s:e])
        for slot in SLOT_HEADERS:
            c1_total_expected += 1
            # Look for `- **Slot:**` (allow leading whitespace and trailing colon).
            pat = re.compile(r"^- \*\*" + re.escape(slot) + r":\*\*", re.M)
            if pat.search(block_text):
                c1_total_present += 1
            else:
                c1_details.append(
                    f"  MISSING slot '{slot}' in {phase_short} Field {n} — {name} (line {s+1})"
                )
status_c1 = "PASS" if c1_total_present == c1_total_expected and total_fields == 25 else "FAIL"
results.append(("C1: Seven-slot completeness", status_c1,
    [f"  Fields seen: {total_fields} (expected 25)",
     f"  Slot occurrences: {c1_total_present}/{c1_total_expected} (expected 175)"]
    + c1_details
))

# ---------------------------------------------------------------------------
# Criterion 2 — Connects-chain integrity.
# For each field N>1: "Connects from" should reference Field N-1's name.
# For first-of-phase (N==1): should reference prior phase's named outcome
# (or "nothing" for Phase 1 Field 1).
# ---------------------------------------------------------------------------
def extract_slot(block_text, slot):
    m = re.search(r"^- \*\*" + re.escape(slot) + r":\*\*\s*(.*)$", block_text, re.M)
    return m.group(1).strip() if m else None

c2_details = []
c2_fail_count = 0
expected_first_upstream = {
    "Observe":            "nothing",
    "Interpret":          "Observation Set",
    "Redemptive Thread":  "Interpretation Set",
    "Implications":       "Christ-Connection Statement",
}
for phase_short, blocks in phase_to_fields.items():
    prev_name = None
    for n, name, s, e in blocks:
        block_text = "\n".join(lines[s:e])
        cf = extract_slot(block_text, "Connects from")
        if cf is None:
            c2_fail_count += 1
            c2_details.append(f"  MISSING 'Connects from' slot in {phase_short} Field {n} — {name}")
            prev_name = name
            continue
        if n == 1:
            expected = expected_first_upstream[phase_short]
            if expected == "nothing":
                ok = re.search(r"\bnothing\b", cf, re.I) is not None
            else:
                ok = expected.lower() in cf.lower()
            if not ok:
                c2_fail_count += 1
                c2_details.append(
                    f"  CHAIN BREAK: {phase_short} Field 1 'Connects from' should reference '{expected}'\n"
                    f"    actual (line {s+1}): {cf[:140]}"
                )
        else:
            if prev_name is None:
                c2_fail_count += 1
                c2_details.append(f"  CHAIN BREAK: cannot verify {phase_short} Field {n}; prev field unknown")
            else:
                # Use the canonical part of the previous field name (strip any decorations).
                prev_short = prev_name.lower()
                if prev_short not in cf.lower():
                    c2_fail_count += 1
                    c2_details.append(
                        f"  CHAIN BREAK: {phase_short} Field {n} 'Connects from' should reference '{prev_name}'\n"
                        f"    actual (line {s+1}): {cf[:140]}"
                    )
        prev_name = name
status_c2 = "PASS" if c2_fail_count == 0 else "FAIL"
results.append(("C2: Connects-chain integrity", status_c2,
    [f"  Chain-break count: {c2_fail_count}"] + c2_details))

# ---------------------------------------------------------------------------
# Criterion 3 — Named outcome declared per phase.
# Each "## Within-sub-phase flow pass for [Phase]" has a
# "### The [Outcome] — [Phase]'s named outcome" subsection.
# ---------------------------------------------------------------------------
c3_details = []
c3_fail = 0
for phase_short, outcome in NAMED_OUTCOMES:
    flow_hdr = f"## Within-sub-phase flow pass for {phase_short}"
    if flow_hdr not in text:
        c3_fail += 1
        c3_details.append(f"  MISSING flow-pass section: '{flow_hdr}'")
        continue
    flow_idx = text.index(flow_hdr)
    # Search forward, until next `## ` header, for the outcome subsection.
    rest = text[flow_idx:]
    next_h2 = re.search(r"^## (?!#)", rest[len(flow_hdr):], re.M)
    end_idx = flow_idx + len(flow_hdr) + (next_h2.start() if next_h2 else len(rest) - len(flow_hdr))
    section = text[flow_idx:end_idx]
    # Accept both "'s" (singular-form phase names) and "'" (plural-form like "Implications'").
    pat = re.compile(rf"^### The {re.escape(outcome)} — {re.escape(phase_short)}(?:'s|')\s+named outcome\s*$", re.M)
    if not pat.search(section):
        c3_fail += 1
        c3_details.append(
            f"  MISSING named-outcome subsection for {phase_short}: "
            f"expected '### The {outcome} — {phase_short}'s named outcome' "
            f"(or {phase_short}' for plural-form names)"
        )
status_c3 = "PASS" if c3_fail == 0 else "FAIL"
results.append(("C3: Named outcome declared per phase", status_c3,
    [f"  Failures: {c3_fail}"] + c3_details))

# ---------------------------------------------------------------------------
# Criterion 4 — Handoff section per boundary.
# Each of four boundaries: '## The [A] → [B] handoff' must contain
# the next-phase reads paragraph, '### The hard gate at the boundary',
# and '### What's preserved across the boundary'.
# ---------------------------------------------------------------------------
HANDOFFS = [
    ("Observe → Interpret",                 "Interpret"),
    ("Interpret → Redemptive Thread",       "Redemptive Thread"),
    ("Redemptive Thread → Implications",    "Implications"),
    ("Implications → MPT/MPS",              "MPT/MPS"),
]
c4_details = []
c4_fail = 0
for label, _next in HANDOFFS:
    hdr = f"## The {label} handoff"
    if hdr not in text:
        c4_fail += 1
        c4_details.append(f"  MISSING handoff header: '{hdr}'")
        continue
    start = text.index(hdr)
    rest = text[start + len(hdr):]
    # Section ends at next `## ` (h2) header.
    nxt = re.search(r"^## (?!#)", rest, re.M)
    section = rest[: nxt.start() if nxt else len(rest)]
    missing = []
    if not re.search(r"### The hard gate at the boundary", section):
        missing.append("'### The hard gate at the boundary'")
    if not re.search(r"### What's preserved across the boundary", section):
        missing.append("'### What\\'s preserved across the boundary'")
    # (a) what the next phase reads — heuristic: "What .* reads:" or "opens" + "reads"
    if not re.search(r"\b(reads|What .* reads|opens (against|not against))", section, re.I):
        missing.append("(no apparent 'what next phase reads' description)")
    if missing:
        c4_fail += 1
        c4_details.append(f"  '{hdr}' missing: {', '.join(missing)}")
status_c4 = "PASS" if c4_fail == 0 else "FAIL"
results.append(("C4: Handoff section per boundary", status_c4,
    [f"  Failures: {c4_fail}"] + c4_details))

# ---------------------------------------------------------------------------
# Criterion 5 — Cumulative-table column claims consistent.
#   P2 F7 Q1 says "fourth column: Meaning"
#   P3 F5 Q1 says "five columns" and Christ-Connection
#   P4 F4 Q1 says "six columns" and Implication
#   Implications → MPT/MPS handoff lists all six columns.
# ---------------------------------------------------------------------------
c5_details = []
c5_fail = 0

def block_text_for(phase_short, n):
    for fn, name, s, e in phase_to_fields[phase_short]:
        if fn == n:
            return "\n".join(lines[s:e]), s, e, name
    return None

# 5a — Phase 2 Field 8 (Interpretation Synthesis; was Field 7 before Genre
# added at position 2 on 2026-05-05) must say "fourth column" and "Meaning"
b = block_text_for("Interpret", 8)
if not b:
    c5_fail += 1; c5_details.append("  MISSING Interpret Field 8 block")
else:
    bt, s, e, _ = b
    if "fourth column" not in bt.lower() or "Meaning" not in bt:
        c5_fail += 1
        c5_details.append("  Interpret F8 Q1: missing 'fourth column' / 'Meaning' phrasing")
    else:
        c5_details.append("  Interpret F8 Q1: 'fourth column' + 'Meaning' present")

# 5b — Phase 3 Field 5 must say "five columns" and "Christ-Connection"
b = block_text_for("Redemptive Thread", 5)
if not b:
    c5_fail += 1; c5_details.append("  MISSING Redemptive Thread Field 5 block")
else:
    bt, s, e, _ = b
    if "five columns" not in bt.lower() or "Christ-Connection" not in bt:
        c5_fail += 1
        c5_details.append("  RT F5 Q1: missing 'five columns' / 'Christ-Connection' phrasing")
    else:
        c5_details.append("  RT F5 Q1: 'five columns' + 'Christ-Connection' present")

# 5c — Phase 4 Field 4 must say "six columns" and "Implication"
b = block_text_for("Implications", 4)
if not b:
    c5_fail += 1; c5_details.append("  MISSING Implications Field 4 block")
else:
    bt, s, e, _ = b
    if "six columns" not in bt.lower() or "Implication" not in bt:
        c5_fail += 1
        c5_details.append("  Implications F4 Q1: missing 'six columns' / 'Implication' phrasing")
    else:
        c5_details.append("  Implications F4 Q1: 'six columns' + 'Implication' present")

# 5d — Implications → MPT/MPS handoff lists all six columns
hdr = "## The Implications → MPT/MPS handoff"
if hdr not in text:
    c5_fail += 1; c5_details.append("  MISSING Implications → MPT/MPS handoff section")
else:
    start = text.index(hdr)
    rest = text[start + len(hdr):]
    nxt = re.search(r"^## (?!#)", rest, re.M)
    section = rest[: nxt.start() if nxt else len(rest)]
    REQ_COLS = ["Thought unit", "After line", "Signal", "Meaning", "Christ-Connection", "Implication"]
    missing_cols = [c for c in REQ_COLS if c not in section]
    if missing_cols:
        c5_fail += 1
        c5_details.append(f"  Handoff missing column names: {missing_cols}")
    else:
        c5_details.append("  Implications → MPT/MPS handoff lists all six columns: " + ", ".join(REQ_COLS))

status_c5 = "PASS" if c5_fail == 0 else "FAIL"
results.append(("C5: Cumulative-table column claims consistent", status_c5,
    [f"  Failures: {c5_fail}"] + c5_details))

# ---------------------------------------------------------------------------
# Criterion 6 — PC progression explicit per field per phase.
# Each field block should contain a PC line — heuristic markers:
#   "PC dormant" | "PC awareness" | "PC surfaces" | "PC enters here"
#   "PC deepens" | "PC at full texture" | "PC integrated" | "PC at full integration"
#   or "**PC ...**" bold pattern.
# Required at minimum for heavy-lifting and named-outcome fields.
# Report fields without an explicit PC marker.
# ---------------------------------------------------------------------------
PC_RE = re.compile(
    r"\bPC\s+(dormant|awareness|surfaces|enters here|deepens|at full texture|integrated|at full integration|implicit|marinating|marinate|marination|in marination)\b",
    re.I,
)
c6_details = []
c6_required_fail = 0
c6_optional_missing = []

required_fields = set()
for phase, n, _name, _total in HEAVY_LIFTING:
    required_fields.add((phase, n))
# Plus named-outcome fields (last field of each phase if not already in heavy-lifting).
named_outcome_fields = {
    ("Observe", 8), ("Interpret", 8),  # was (Observe, 9) and (Interpret, 7) before 2026-05-05 reshape
    ("Redemptive Thread", 5), ("Implications", 4),
}
required_fields |= named_outcome_fields

for phase_short, blocks in phase_to_fields.items():
    for n, name, s, e in blocks:
        bt = "\n".join(lines[s:e])
        has_pc = bool(PC_RE.search(bt))
        if (phase_short, n) in required_fields:
            if not has_pc:
                c6_required_fail += 1
                c6_details.append(
                    f"  MISSING PC marker in heavy-lifting/named-outcome field: {phase_short} Field {n} — {name}"
                )
        else:
            if not has_pc:
                c6_optional_missing.append(f"{phase_short} F{n} — {name}")

status_c6 = "PASS" if c6_required_fail == 0 else "FAIL"
if c6_optional_missing:
    c6_details.append(f"  WARN — non-heavy-lifting fields without explicit PC marker ({len(c6_optional_missing)}):")
    for f in c6_optional_missing:
        c6_details.append(f"    - {f}")
results.append(("C6: PC progression explicit", status_c6,
    [f"  Required-field PC failures: {c6_required_fail}"] + c6_details))

# ---------------------------------------------------------------------------
# Criterion 7 — Heavy-lifting fields have pre-field overview.
# Each heavy-lifting block must contain:
#   "**Pre-field overview (pastor-side copy):**"
#   "> ## <Field name>"
#   "> *Field N of M · <Phase>*"
#   "> [ Begin ]"
# ---------------------------------------------------------------------------
c7_details = []
c7_fail = 0
for phase_short, n, name_frag, total in HEAVY_LIFTING:
    b = block_text_for(phase_short, n)
    if not b:
        c7_fail += 1
        c7_details.append(f"  MISSING block: {phase_short} Field {n} ({name_frag})")
        continue
    bt, s, e, name = b
    missing = []
    if "**Pre-field overview (pastor-side copy):**" not in bt:
        missing.append("'**Pre-field overview (pastor-side copy):**' marker")
    if not re.search(r"^> ## " + re.escape(name_frag), bt, re.M):
        missing.append(f"'> ## {name_frag}' header")
    if not re.search(rf"^> \*Field {n} of {total} · {re.escape(phase_short)}\*", bt, re.M):
        missing.append(f"'> *Field {n} of {total} · {phase_short}*' subhead")
    if not re.search(r"^> \[ Begin \]", bt, re.M):
        missing.append("'> [ Begin ]'")
    if missing:
        c7_fail += 1
        c7_details.append(f"  {phase_short} F{n} ({name_frag}) — missing: {'; '.join(missing)}")
    else:
        c7_details.append(f"  {phase_short} F{n} ({name_frag}) — overview present")

status_c7 = "PASS" if c7_fail == 0 else "FAIL"
results.append(("C7: Heavy-lifting pre-field overview", status_c7,
    [f"  Failures: {c7_fail}"] + c7_details))

# ---------------------------------------------------------------------------
# Report.
# ---------------------------------------------------------------------------
print("=" * 78)
print("SFDI INTERNAL-CONSISTENCY DRIFT CHECK")
print(f"Target: {DOC}")
print("=" * 78)

overall_fail = 0
for label, status, details in results:
    print()
    print(f"[{status}] {label}")
    for d in details:
        print(d)
    if status != "PASS":
        overall_fail += 1

print()
print("=" * 78)
print(f"Criteria total: {len(results)}    Failing: {overall_fail}")
print("=" * 78)

sys.exit(0 if overall_fail == 0 else 1)
