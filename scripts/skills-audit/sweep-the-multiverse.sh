#!/usr/bin/env bash
# Phase 1 static audit validator for the sweep-the-multiverse skill.
# Mechanical checks only. Detection only — does not modify the target.

set -u

TARGET="C:/Projects/SermonForge/.claude/skills/sweep-the-multiverse/SKILL.md"
SKILL_NAME="sweep-the-multiverse"
EXIT=0

pass() { printf "  [PASS] %s\n" "$1"; }
fail() { printf "  [FAIL] %s\n" "$1"; EXIT=1; }
info() { printf "  [INFO] %s\n" "$1"; }

echo "=== sweep-the-multiverse mechanical audit ==="
echo "Target: $TARGET"
echo

# --- File exists ---
echo "[Criterion 1] File exists & readable"
if [ ! -f "$TARGET" ]; then
  fail "Target file missing"
  echo
  echo "Exit: $EXIT"
  exit $EXIT
else
  pass "File present"
fi
echo

# --- Frontmatter extraction ---
echo "[Criterion 1] Frontmatter present and bounded by --- markers"
FIRST_LINE=$(sed -n '1p' "$TARGET")
if [ "$FIRST_LINE" != "---" ]; then
  fail "First line is not '---' (got: '$FIRST_LINE')"
else
  pass "Opens with '---'"
fi

# Find the closing --- of frontmatter
CLOSE_LINE=$(awk 'NR>1 && /^---[[:space:]]*$/ { print NR; exit }' "$TARGET")
if [ -z "$CLOSE_LINE" ]; then
  fail "No closing '---' for frontmatter"
else
  pass "Frontmatter closes at line $CLOSE_LINE"
fi
echo

# --- YAML body of frontmatter ---
FM_BODY=""
if [ -n "$CLOSE_LINE" ]; then
  FM_BODY=$(sed -n "2,$((CLOSE_LINE-1))p" "$TARGET")
fi

echo "[Criterion 1] YAML frontmatter parseable"
# Try python YAML if available, otherwise do simple key: value lint.
if command -v python >/dev/null 2>&1; then
  PARSE_RESULT=$(printf '%s\n' "$FM_BODY" | python -c '
import sys
try:
    import yaml
except ImportError:
    print("NOYAML"); sys.exit(0)
try:
    data = yaml.safe_load(sys.stdin.read())
    if not isinstance(data, dict):
        print("ERR:not a mapping"); sys.exit(0)
    print("OK:" + ",".join(sorted(data.keys())))
except Exception as e:
    print("ERR:" + str(e))
' 2>&1)
  case "$PARSE_RESULT" in
    OK:*)
      pass "YAML parses (keys: ${PARSE_RESULT#OK:})"
      FM_KEYS="${PARSE_RESULT#OK:}"
      ;;
    NOYAML)
      info "PyYAML unavailable — falling back to line lint"
      FM_KEYS=$(printf '%s\n' "$FM_BODY" | awk -F: '/^[a-zA-Z_][a-zA-Z0-9_-]*:/ { print $1 }' | paste -sd, -)
      pass "Lint-only check; keys: $FM_KEYS"
      ;;
    *)
      fail "YAML parse error: $PARSE_RESULT"
      FM_KEYS=""
      ;;
  esac
else
  info "python unavailable — line lint only"
  FM_KEYS=$(printf '%s\n' "$FM_BODY" | awk -F: '/^[a-zA-Z_][a-zA-Z0-9_-]*:/ { print $1 }' | paste -sd, -)
  pass "Keys (lint): $FM_KEYS"
fi
echo

# --- Required fields ---
echo "[Criterion 1] Required frontmatter fields: name, description"
for key in name description; do
  if printf '%s\n' "$FM_BODY" | grep -qE "^$key:"; then
    pass "Has '$key'"
  else
    fail "Missing '$key'"
  fi
done
echo

# --- Optional trigger ---
echo "[Criterion 1/2] Optional 'trigger' field"
if printf '%s\n' "$FM_BODY" | grep -qE "^trigger:"; then
  TRIG=$(printf '%s\n' "$FM_BODY" | sed -nE 's/^trigger:[[:space:]]*(.*)$/\1/p' | head -n1)
  pass "trigger present: $TRIG"
else
  info "trigger absent (optional)"
fi
echo

# --- Stray frontmatter fields ---
echo "[Criterion 1] No stray frontmatter fields (allowed: name, description, trigger)"
ALL_KEYS=$(printf '%s\n' "$FM_BODY" | awk -F: '/^[a-zA-Z_][a-zA-Z0-9_-]*:/ { print $1 }')
STRAY=""
for k in $ALL_KEYS; do
  case "$k" in
    name|description|trigger) ;;
    *) STRAY="$STRAY $k" ;;
  esac
done
if [ -z "$STRAY" ]; then
  pass "No stray fields"
else
  fail "Stray field(s):$STRAY"
fi
echo

# --- name matches directory ---
echo "[Criterion 1] name matches directory '$SKILL_NAME'"
NAME_VAL=$(printf '%s\n' "$FM_BODY" | sed -nE 's/^name:[[:space:]]*(.*)$/\1/p' | head -n1 | tr -d '"' | tr -d "'" | sed 's/[[:space:]]*$//')
if [ "$NAME_VAL" = "$SKILL_NAME" ]; then
  pass "name='$NAME_VAL'"
else
  fail "name mismatch: got '$NAME_VAL', expected '$SKILL_NAME'"
fi
echo

# --- Final newline ---
echo "[Criterion 1] File ends with newline"
LAST_BYTE=$(tail -c 1 "$TARGET" | od -An -c | tr -d ' ')
if [ "$LAST_BYTE" = "\\n" ]; then
  pass "Ends with newline"
else
  fail "No trailing newline (last byte: '$LAST_BYTE')"
fi
echo

# --- Length / load profile ---
echo "[Criterion 6] Length and load profile"
LINES=$(wc -l < "$TARGET" | tr -d ' ')
BYTES=$(wc -c < "$TARGET" | tr -d ' ')
echo "  lines=$LINES bytes=$BYTES"
if [ "$LINES" -lt 50 ]; then
  fail "Under 50 lines — may lack constraint"
elif [ "$LINES" -gt 400 ]; then
  fail "Over 400 lines — truncation risk"
else
  pass "Line count within [50, 400]"
fi
echo

# --- Banned phrase enforcement (if defined) ---
echo "[Criterion 3] Banned-phrase enforcement"
BANNED_BLOCK=$(awk 'tolower($0) ~ /banned phrase|banned word|banned terms/ { found=1; print; next } found && /^##/ { exit } found { print }' "$TARGET")
if [ -z "$BANNED_BLOCK" ]; then
  info "Skill defines no banned phrases — skipping"
else
  pass "Banned-phrase section found; enumerate manually"
  printf '%s\n' "$BANNED_BLOCK" | sed 's/^/    /'
fi
echo

echo "=== Done ==="
echo "Exit: $EXIT"
exit $EXIT
