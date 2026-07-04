#!/usr/bin/env bash
# drift-check.sh — verify SermonForge docs against codebase reality
# Exits 0 only when ALL criteria pass.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 99
FAIL=0
DOCS_DIR="docs"

# C1 — Internal .md links point to files that exist. GATING: a broken link fails the build.
# Skips ARCHIVE/PROPOSALS/AUDITS: frozen, forward-looking, or historical audit material
# whose nested-link + root-relative syntax confuses a regex linter (AUDITS was the sole
# source of every false positive). De-spawned: one grep pass, then pure-bash matching — no
# per-link python3/grep subshell. That old shape cost ~26s on Windows Git Bash AND, being
# piped into `while`, ran in a subshell so its FAIL flag never propagated — the check could
# print BROKEN but never actually fail. Fixed: the loop runs in the parent shell now, so a
# real broken link blocks the commit (the original, intended behavior).
echo "=== C1: broken internal .md links ==="
C1_HITS=""
C1_RE='\(([^)]+\.md)(#[^)]*)?\)'
while IFS=: read -r file lineno match; do
  case "$file" in */ARCHIVE/*|*/PROPOSALS/*|*/AUDITS/*) continue ;; esac
  rest="$match"
  while [[ "$rest" =~ $C1_RE ]]; do
    whole="${BASH_REMATCH[0]}"; target="${BASH_REMATCH[1]}"
    rest="${rest#*"$whole"}"                       # advance past this match (no infinite loop)
    case "$target" in http://*|https://*|mailto:*) continue ;; esac
    if [[ "$target" == /* ]]; then resolved="${target#/}"; else resolved="${file%/*}/$target"; fi
    # -f resolves ../ at the filesystem level, so no path normalization is needed.
    [[ -f "$resolved" ]] || C1_HITS="${C1_HITS}  BROKEN: $file:$lineno -> $target"$'\n'
  done
done < <(grep -rnE '\[[^]]+\]\([^)]+\.md(\#[^)]*)?\)' "$DOCS_DIR" 2>/dev/null)
if [[ -n "$C1_HITS" ]]; then printf 'BROKEN internal links:\n%s' "$C1_HITS"; FAIL=1; else echo "none"; fi

# C2 — File path references (electron/ src/ scripts/ migrations/) exist. GATING.
# Same de-spawn + skip + subshell-fix as C1. House convention: backtick a LIVE path; drop the
# backticks for a deleted/historical name so this doesn't flag it (see docs/ENFORCEMENT_STATUS.md).
echo ""
echo "=== C2: broken file path references in docs ==="
C2_HITS=""
C2_RE='`((electron|src|scripts|migrations)/[A-Za-z0-9_./-]+)`'
while IFS=: read -r file lineno match; do
  case "$file" in */PROPOSALS/*|*/ARCHIVE/*|*/AUDITS/*) continue ;; esac
  rest="$match"
  while [[ "$rest" =~ $C2_RE ]]; do
    whole="${BASH_REMATCH[0]}"; target="${BASH_REMATCH[1]}"
    rest="${rest#*"$whole"}"
    target="${target%[.,;]}"                       # strip one trailing punctuation char
    case "$target" in *'*'*|*/) continue ;; esac   # skip globs and directory paths
    [[ -e "$target" ]] && continue                 # -e covers files and dirs
    C2_HITS="${C2_HITS}  MISSING: $file:$lineno -> $target"$'\n'
  done
done < <(grep -rnE '`(electron|src|scripts|migrations)/[A-Za-z0-9_./\-]+`' "$DOCS_DIR" 2>/dev/null)
if [[ -n "$C2_HITS" ]]; then printf 'MISSING path references:\n%s' "$C2_HITS"; FAIL=1; else echo "none"; fi

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

# C4 — IPC channel names referenced in docs (namespace:action) exist in electron/. GATING.
# De-spawned + subshell-fixed like C1/C2: the old inner `echo|grep|while` pipe ran in a
# subshell, so C4_FAIL never propagated — it could print MISSING but never fail. Only the
# known namespaces below are checked, to avoid flagging incidental "word:word" prose.
echo ""
echo "=== C4: IPC channel reference check ==="
C4_HITS=""
C4_RE="['\`\"][a-z]+:[a-z-]+['\`\"]"
C4_NS='^(sermons|series|ai|theology|passages|search|export|tour|setup|config|window|app|update):[a-z-]+$'
while IFS=: read -r file lineno match; do
  rest="$match"
  while [[ "$rest" =~ $C4_RE ]]; do
    whole="${BASH_REMATCH[0]}"; rest="${rest#*"$whole"}"
    chan="${whole//[\'\`\"]/}"
    [[ "$chan" =~ $C4_NS ]] || continue
    grep -rn "['\"]${chan}['\"]" electron/ >/dev/null 2>&1 \
      || C4_HITS="${C4_HITS}  MISSING: $file:$lineno -> '$chan' (not in electron/)"$'\n'
  done
done < <(grep -rnE "['\`\"][a-z]+:[a-z-]+['\`\"]" "$DOCS_DIR/REFERENCE/ipc-channels.md" "$DOCS_DIR/SYSTEMS/ipc.md" 2>/dev/null)
if [[ -n "$C4_HITS" ]]; then printf 'MISSING IPC channels:\n%s' "$C4_HITS"; FAIL=1; else echo "none"; fi

# (C5 and C6 removed 2026-07-03: decoration that gated nothing. C5 was a soft
#  "structural check only" WARN; C6 declared C6_FAIL but never set it, so it could
#  not fail — it printed a marker count nobody actioned. Their green "ok" lines
#  trained the eye to skip past the checks that do matter. Numbering left as
#  C1–C4, C7, C8 so the C8 references in end-session STEP 1.5 stay valid.)

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
ROOM_REFS=$(grep -rn "sweep-the-room" "$DOCS_DIR" CLAUDE.md 2>/dev/null \
  | grep -v "/ARCHIVE/" \
  | grep -v "retired" \
  | grep -v "has been retired" || true)
if [[ -n "$ROOM_REFS" ]]; then
  echo "STALE REFERENCES TO RETIRED SKILL:"
  echo "$ROOM_REFS"
  FAIL=1
else
  echo "none (or only retirement notice)"
fi

# Check for CLAUDE_original.md references — commit 29dedf9 dropped this.
# Intentional historical-retention contexts are allowed; only flag genuinely dead refs.
echo ""
echo "=== C7c: dead CLAUDE_original.md references ==="
DEAD_REFS=$(grep -rn "CLAUDE_original" "$DOCS_DIR" CLAUDE.md 2>/dev/null \
  | grep -v "/ARCHIVE/" \
  | grep -v "historical reference" \
  | grep -v "original monolithic" \
  | grep -v "retained for" || true)
if [[ -n "$DEAD_REFS" ]]; then
  echo "DEAD REFERENCES:"
  echo "$DEAD_REFS"
  FAIL=1
else
  echo "none (or only historical retention notice)"
fi

# C8 — shipped-but-unstamped charters. A PROPOSALS doc whose status reads
# SHIPPED with no remaining-work marker should carry the ⛔ HISTORICAL RECORD
# stamp (2026-07-01 ruling: charters get stamped the day their build ships —
# stamped docs can't drift; today's 98-finding sweep proved live-dressed ones
# do). ADVISORY only — the stamping judgment stays with the session;
# /end-session STEP 1.5 acts on this output. A doc with genuinely remaining
# work suppresses the advisory by saying so in its status head.
echo ""
echo "=== C8: shipped-but-unstamped charters (advisory) ==="
UNSTAMPED=""
for f in "$DOCS_DIR"/PROPOSALS/*.md; do
  head_txt=$(head -12 "$f")
  echo "$head_txt" | grep -q "HISTORICAL RECORD" && continue
  echo "$head_txt" | grep -qiE "status.*shipped" || continue
  echo "$head_txt" | grep -qiE "\bremaining\b|\bpending\b|\bactive\b|in progress|not yet|open ruling|deferred" && continue
  UNSTAMPED="${UNSTAMPED}  ${f}"$'\n'
done
if [[ -n "$UNSTAMPED" ]]; then
  echo "ADVISORY: shipped charters missing the HISTORICAL RECORD stamp:"
  printf '%s' "$UNSTAMPED"
  echo "→ /end-session STEP 1.5: stamp them + move their ANCHORS.md entry to Historical record"
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
