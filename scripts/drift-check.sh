#!/usr/bin/env bash
# drift-check.sh — verify SermonForge docs against codebase reality
# Exits 0 only when ALL criteria pass.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 99
FAIL=0
DOCS_DIR="docs"

# C1 — Internal .md links point to files that exist
echo "=== C1: broken internal .md links ==="
C1_FAIL=0
while IFS= read -r line; do
  file="${line%%:*}"
  rest="${line#*:}"
  lineno="${rest%%:*}"
  match="${rest#*:}"
  # Extract markdown link targets like [text](path.md) or [text](path.md#anchor)
  echo "$match" | grep -oE '\(([^)]+\.md)(#[^)]*)?\)' | while read -r raw; do
    raw_clean="${raw#(}"
    raw_clean="${raw_clean%)}"
    target="${raw_clean%%#*}"
    # Skip URLs (http, mailto)
    if [[ "$target" =~ ^https?:// ]] || [[ "$target" =~ ^mailto: ]]; then
      continue
    fi
    # Resolve relative to file's directory
    file_dir="$(dirname "$file")"
    if [[ "$target" =~ ^/ ]]; then
      resolved="${target#/}"
    else
      resolved="$file_dir/$target"
    fi
    # Normalize path
    resolved=$(python3 -c "import os.path; print(os.path.normpath(r'''$resolved'''))" 2>/dev/null || echo "$resolved")
    if [[ ! -f "$resolved" ]]; then
      echo "BROKEN: $file:$lineno -> $target (resolved: $resolved)"
      C1_FAIL=1
    fi
  done
done < <(grep -rn -E '\[[^]]+\]\([^)]+\.md(\#[^)]*)?\)' "$DOCS_DIR" 2>/dev/null)
[[ $C1_FAIL -eq 0 ]] && echo "none" || FAIL=1

# C2 — File path references (electron/, src/, scripts/) exist
# Skips PROPOSALS/ (forward-looking) and lines under "Deferred"/"Future" headings
echo ""
echo "=== C2: broken file path references in docs ==="
C2_FAIL=0
while IFS= read -r line; do
  file="${line%%:*}"
  rest="${line#*:}"
  lineno="${rest%%:*}"
  match="${rest#*:}"
  # Skip proposal docs (describe future state)
  if [[ "$file" == *"/PROPOSALS/"* ]]; then
    continue
  fi
  # Extract backtick-quoted paths starting with electron/, src/, scripts/, migrations/
  echo "$match" | grep -oE '`(electron|src|scripts|migrations)/[A-Za-z0-9_./\-]+`' | while read -r raw; do
    target="${raw//\`/}"
    # Strip trailing punctuation
    target="${target%.}"
    target="${target%,}"
    target="${target%;}"
    # Skip glob patterns and partial paths (those ending in /)
    if [[ "$target" == *"*"* ]] || [[ "$target" == */ ]]; then
      continue
    fi
    # Skip if it's a directory that exists
    if [[ -d "$target" ]]; then
      continue
    fi
    if [[ ! -e "$target" ]]; then
      echo "MISSING: $file:$lineno -> $target"
      C2_FAIL=1
    fi
  done
done < <(grep -rn -E '`(electron|src|scripts|migrations)/[A-Za-z0-9_./\-]+`' "$DOCS_DIR" 2>/dev/null)
[[ $C2_FAIL -eq 0 ]] && echo "none" || FAIL=1

# C3 — Referenced exports/functions exist in code
echo ""
echo "=== C3: SERMON_COLUMNS reference check ==="
if grep -rn "SERMON_COLUMNS" "$DOCS_DIR" >/dev/null 2>&1; then
  if ! grep -n "SERMON_COLUMNS" electron/main.js >/dev/null 2>&1; then
    echo "MISSING: SERMON_COLUMNS referenced in docs but not found in electron/main.js"
    FAIL=1
  else
    echo "ok"
  fi
else
  echo "n/a (not referenced)"
fi

echo ""
echo "=== C3b: buildUpdate reference check ==="
if grep -rn "buildUpdate" "$DOCS_DIR" >/dev/null 2>&1; then
  if ! grep -n "buildUpdate" electron/main.js >/dev/null 2>&1; then
    echo "MISSING: buildUpdate referenced in docs but not found in electron/main.js"
    FAIL=1
  else
    echo "ok"
  fi
else
  echo "n/a (not referenced)"
fi

# C4 — IPC channel names referenced in docs exist in preload/main
echo ""
echo "=== C4: IPC channel reference check ==="
C4_FAIL=0
# Extract IPC channel names from docs (pattern: 'channel:name' or "channel-name" with colon)
# Common SermonForge pattern: namespace:action e.g., "sermons:save", "ai:generate"
while IFS= read -r line; do
  file="${line%%:*}"
  rest="${line#*:}"
  lineno="${rest%%:*}"
  match="${rest#*:}"
  echo "$match" | grep -oE "['\`\"][a-z]+:[a-z\-]+['\`\"]" | while read -r raw; do
    chan=$(echo "$raw" | sed -E "s/^['\`\"]//;s/['\`\"]$//")
    # Filter common false positives — only check things that look like real IPC channels
    # Real channels in this codebase: sermons:*, ai:*, series:*, theology:*, etc.
    if [[ "$chan" =~ ^(sermons|series|ai|theology|passages|search|export|tour|setup|config|window|app|update):[a-z\-]+$ ]]; then
      if ! grep -rn "['\"]${chan}['\"]" electron/ >/dev/null 2>&1; then
        echo "MISSING: $file:$lineno -> '$chan' (not found in electron/)"
        C4_FAIL=1
      fi
    fi
  done
done < <(grep -rn -E "['\`\"][a-z]+:[a-z\-]+['\`\"]" "$DOCS_DIR/REFERENCE/ipc-channels.md" "$DOCS_DIR/SYSTEMS/ipc.md" 2>/dev/null)
[[ $C4_FAIL -eq 0 ]] && echo "none" || FAIL=1

# C5 — Schema column references match actual schema
echo ""
echo "=== C5: schema.md column references ==="
C5_FAIL=0
# Extract column names listed in schema.md as belonging to sermons table
# This is a sanity check: ensure docs/REFERENCE/schema.md mentions a column,
# verify it appears in either electron/main.js (SERMON_COLUMNS) or migrations/
if [[ -f "$DOCS_DIR/REFERENCE/schema.md" ]]; then
  # Just confirm the file references stay in sync — flag if schema.md has no recent reference to migrations
  if ! grep -q "migrations" "$DOCS_DIR/REFERENCE/schema.md" 2>/dev/null; then
    echo "WARN: schema.md does not mention migrations directory — may be stale"
    # Soft warning, not a fail
  fi
  echo "ok (structural check only)"
else
  echo "n/a (schema.md not found)"
fi

# C6 — Status marker drift: items marked "planned" or "in progress" that have shipped
echo ""
echo "=== C6: status marker drift (planned/in-progress vs CHANGELOG) ==="
C6_FAIL=0
# Look for SPRD/SFDI/ACCI items marked as "planned" or "open" in docs
# Cross-reference against CHANGELOG mentions of "shipped" or commit log
# This is a heuristic — flags potential drift, manual review required
if [[ -f "$DOCS_DIR/ENFORCEMENT_STATUS.md" ]]; then
  # ENFORCEMENT_STATUS is supposed to be authoritative — flag if it shows TODO/PLANNED on items
  # that already appear in recent commits as shipped
  PLANNED_COUNT=$(grep -ciE '\b(planned|todo|in[- ]?progress|open)\b' "$DOCS_DIR/ENFORCEMENT_STATUS.md" 2>/dev/null || echo 0)
  echo "ENFORCEMENT_STATUS.md planned/todo/in-progress markers: $PLANNED_COUNT (review for staleness)"
fi
echo "ok (heuristic — manual review)"

# C7 — Acronym usage: SFDI/SPRD/ACCI/CCE consistency
echo ""
echo "=== C7: acronym consistency ==="
C7_FAIL=0
# Check for any unexpanded or misspelled acronyms
# Known acronyms: SFDI, SPRD, ACCI, CCE, CCD, FTS, IPC, ADR, MVP
# Flag potential typos like SFDII, SPRDD, ACCIE (close but wrong)
TYPO_PATTERNS='SFDII|SPRDD|ACCIE|SFID|SRPD|CEE'
TYPOS=$(grep -rnE "\b($TYPO_PATTERNS)\b" "$DOCS_DIR" 2>/dev/null || true)
if [[ -n "$TYPOS" ]]; then
  echo "TYPOS FOUND:"
  echo "$TYPOS"
  C7_FAIL=1
  FAIL=1
else
  echo "none"
fi

# Also check for the old "/sweep-the-room" reference — CLAUDE.md says it's retired
echo ""
echo "=== C7b: retired skill references (sweep-the-room) ==="
ROOM_REFS=$(grep -rn "sweep-the-room" "$DOCS_DIR" CLAUDE.md 2>/dev/null | grep -v "retired" | grep -v "has been retired" || true)
if [[ -n "$ROOM_REFS" ]]; then
  echo "STALE REFERENCES TO RETIRED SKILL:"
  echo "$ROOM_REFS"
  FAIL=1
else
  echo "none (or only retirement notice)"
fi

# Check for CLAUDE_original.md references — commit 29dedf9 dropped this
echo ""
echo "=== C7c: dead CLAUDE_original.md references ==="
DEAD_REFS=$(grep -rn "CLAUDE_original" "$DOCS_DIR" CLAUDE.md 2>/dev/null || true)
if [[ -n "$DEAD_REFS" ]]; then
  echo "DEAD REFERENCES:"
  echo "$DEAD_REFS"
  FAIL=1
else
  echo "none"
fi

echo ""
echo "=========================================="
if [[ $FAIL -eq 0 ]]; then
  echo "DRIFT-CHECK: PASS"
else
  echo "DRIFT-CHECK: FAIL"
fi
exit $FAIL
