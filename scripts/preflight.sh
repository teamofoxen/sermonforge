#!/usr/bin/env bash
# preflight.sh — pre-commit checks for /end-session
#
# Exit codes:
#   0  clean — proceed to commit
#   1  blocked — fix the finding and re-run; do not commit
#
# Output:
#   - Hard failures cause exit 1 with a single-line reason.
#   - Advisories print but do not block; agent reads them and decides.
#
# Owned in this file: the trigger-path list for /sweep-the-house.
# Do not duplicate that list elsewhere — link to this script instead.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 99

FAIL=0
ADVISORY=0

echo "=== preflight ==="

# -----------------------------------------------------------------------------
# 1. Working tree must have changes to commit
# -----------------------------------------------------------------------------
if [[ -z "$(git status --porcelain)" ]]; then
  echo "FAIL: working tree clean — nothing to commit"
  exit 1
fi

# -----------------------------------------------------------------------------
# 2. Drift check (delegates to existing scripts/drift-check.sh)
# -----------------------------------------------------------------------------
echo ""
echo "--- drift-check ---"
DRIFT_LOG=$(mktemp)
if ! bash scripts/drift-check.sh > "$DRIFT_LOG" 2>&1; then
  echo "FAIL: drift-check.sh failed. Output:"
  cat "$DRIFT_LOG"
  FAIL=1
else
  echo "PASS: drift-check.sh"
fi
rm -f "$DRIFT_LOG"

# -----------------------------------------------------------------------------
# 3. Sweep-trigger detection (advisory — agent decides whether to run sweep)
# -----------------------------------------------------------------------------
# Single source of truth for which paths require /sweep-the-house.
# If you change this list, you do not need to update CLAUDE.md or any skill —
# the prose has been removed.
echo ""
echo "--- sweep triggers ---"
SWEEP_PATTERNS=(
  '^electron/main\.js$'
  '^electron/preload\.js$'
  '^src/utils/contextBuilder\.js$'
  '^src/utils/ai\.js$'
  '^src/prompts/'
  '^src/db/database\.js$'
  '^migrations/'
)
DIFF_FILES=$(git diff --name-only HEAD 2>/dev/null; git diff --cached --name-only 2>/dev/null)
DIFF_FILES=$(echo "$DIFF_FILES" | sort -u | grep -v '^$' || true)

SWEEP_HITS=""
for pat in "${SWEEP_PATTERNS[@]}"; do
  matches=$(echo "$DIFF_FILES" | grep -E "$pat" || true)
  if [[ -n "$matches" ]]; then
    SWEEP_HITS="$SWEEP_HITS$matches"$'\n'
  fi
done
SWEEP_HITS=$(echo "$SWEEP_HITS" | sort -u | grep -v '^$' || true)

if [[ -n "$SWEEP_HITS" ]]; then
  echo "ADVISORY: diff touches sweep-trigger paths:"
  echo "$SWEEP_HITS" | sed 's/^/  /'
  echo "  → run /sweep-the-house before /end-session if not done"
  ADVISORY=1
else
  echo "PASS: no sweep triggers"
fi

# -----------------------------------------------------------------------------
# 4. Staging hygiene (advisory — flag suspiciously broad staging)
# -----------------------------------------------------------------------------
echo ""
echo "--- staging hygiene ---"
STAGED=$(git diff --cached --name-only | wc -l | tr -d ' ')
if [[ $STAGED -gt 50 ]]; then
  echo "ADVISORY: $STAGED files staged — confirm no 'git add .' was used"
  ADVISORY=1
else
  echo "PASS: $STAGED files staged"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo "=== summary ==="
if [[ $FAIL -ne 0 ]]; then
  echo "PREFLIGHT: FAIL — fix and re-run"
  exit 1
elif [[ $ADVISORY -ne 0 ]]; then
  echo "PREFLIGHT: PASS WITH ADVISORIES — review before committing"
  exit 0
else
  echo "PREFLIGHT: PASS"
  exit 0
fi
