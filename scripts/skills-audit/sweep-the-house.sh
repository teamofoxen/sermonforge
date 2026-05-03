#!/usr/bin/env bash
# Phase 1 static audit validator for the sweep-the-house skill.
# Detection-only. No remediation. Re-runnable.

set -u

SKILL_PATH="C:/Projects/SermonForge/.claude/skills/sweep-the-house/SKILL.md"
EXPECTED_NAME="sweep-the-house"
MIN_LINES=50
MAX_LINES=400

EXIT_CODE=0
fail() { echo "FAIL: $*"; EXIT_CODE=1; }
pass() { echo "PASS: $*"; }
info() { echo "INFO: $*"; }

echo "=== sweep-the-house static validator ==="
echo "Target: $SKILL_PATH"
echo

# --- Existence ----------------------------------------------------------
if [[ ! -f "$SKILL_PATH" ]]; then
  fail "SKILL.md not found at $SKILL_PATH"
  exit 1
fi
pass "file exists"

# --- Length / size ------------------------------------------------------
LINE_COUNT=$(wc -l < "$SKILL_PATH" | tr -d '[:space:]')
BYTE_SIZE=$(wc -c < "$SKILL_PATH" | tr -d '[:space:]')
echo "Criterion 6 — length and load profile"
info "lines=$LINE_COUNT bytes=$BYTE_SIZE"
if (( LINE_COUNT < MIN_LINES )); then
  fail "line count $LINE_COUNT below minimum $MIN_LINES"
elif (( LINE_COUNT > MAX_LINES )); then
  fail "line count $LINE_COUNT above maximum $MAX_LINES"
else
  pass "line count $LINE_COUNT within [$MIN_LINES, $MAX_LINES]"
fi
echo

# --- Final newline ------------------------------------------------------
echo "Criterion 1 — final newline"
LAST_BYTE=$(tail -c 1 "$SKILL_PATH" | od -An -c | tr -d ' ')
if [[ "$LAST_BYTE" == "\\n" ]]; then
  pass "file ends with newline"
else
  fail "file does not end with newline (last byte: $LAST_BYTE)"
fi
echo

# --- Frontmatter extraction --------------------------------------------
echo "Criterion 1 — frontmatter structure"
FIRST_LINE=$(sed -n '1p' "$SKILL_PATH")
if [[ "$FIRST_LINE" != "---" ]]; then
  fail "file does not start with YAML frontmatter delimiter '---' (got: '$FIRST_LINE')"
  echo
  echo "=== aborting further frontmatter checks ==="
  echo
else
  pass "frontmatter opens with '---'"
fi

# Find closing --- (line 2 onward)
FM_END=$(awk 'NR>1 && /^---[[:space:]]*$/ {print NR; exit}' "$SKILL_PATH")
if [[ -z "$FM_END" ]]; then
  fail "frontmatter has no closing '---'"
else
  pass "frontmatter closes at line $FM_END"
fi

if [[ -n "$FM_END" ]]; then
  FM_BODY=$(sed -n "2,$((FM_END-1))p" "$SKILL_PATH")

  # YAML parse check (best-effort — try python, then node, else regex fallback)
  PARSED_OK=0
  if command -v python >/dev/null 2>&1; then
    if printf '%s\n' "$FM_BODY" | python -c '
import sys, yaml
try:
    data = yaml.safe_load(sys.stdin.read())
    if not isinstance(data, dict):
        sys.exit(2)
    sys.exit(0)
except Exception:
    sys.exit(1)
' 2>/dev/null; then
      PARSED_OK=1
      pass "YAML frontmatter parses (python+yaml)"
    else
      RC=$?
      if [[ $RC -eq 2 ]]; then
        fail "YAML frontmatter parses but is not a mapping"
      else
        info "python+yaml not available or parse failed; falling back to regex"
      fi
    fi
  fi
  if [[ $PARSED_OK -eq 0 ]]; then
    # Regex fallback: each non-empty line should look like 'key: value'
    BAD_LINES=0
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      if ! [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_-]*:[[:space:]] ]]; then
        BAD_LINES=$((BAD_LINES+1))
        info "non key:value frontmatter line: $line"
      fi
    done <<< "$FM_BODY"
    if (( BAD_LINES == 0 )); then
      pass "frontmatter passes regex sanity (key: value lines)"
    else
      fail "frontmatter has $BAD_LINES non key:value lines"
    fi
  fi

  # Required fields
  echo
  echo "Criterion 1 — required frontmatter fields"
  for field in name description; do
    if grep -E "^${field}:[[:space:]]" <<< "$FM_BODY" >/dev/null; then
      pass "field '$field' present"
    else
      fail "field '$field' missing"
    fi
  done

  # Optional 'trigger'
  if grep -E "^trigger:[[:space:]]" <<< "$FM_BODY" >/dev/null; then
    info "optional field 'trigger' present"
  else
    info "optional field 'trigger' absent"
  fi

  # Name match
  echo
  echo "Criterion 1 — name matches directory"
  ACTUAL_NAME=$(grep -E "^name:[[:space:]]" <<< "$FM_BODY" | head -1 | sed -E 's/^name:[[:space:]]+//; s/[[:space:]]+$//')
  if [[ "$ACTUAL_NAME" == "$EXPECTED_NAME" ]]; then
    pass "name='$ACTUAL_NAME' matches expected '$EXPECTED_NAME'"
  else
    fail "name='$ACTUAL_NAME' does not match expected '$EXPECTED_NAME'"
  fi

  # Stray fields
  echo
  echo "Criterion 1 — stray frontmatter fields"
  KNOWN_FIELDS_RE='^(name|description|trigger):[[:space:]]'
  STRAY=$(grep -E '^[A-Za-z_][A-Za-z0-9_-]*:[[:space:]]' <<< "$FM_BODY" | grep -Ev "$KNOWN_FIELDS_RE" || true)
  if [[ -z "$STRAY" ]]; then
    pass "no stray frontmatter fields"
  else
    fail "stray frontmatter fields detected:"
    echo "$STRAY"
  fi
fi
echo

# --- Banned phrases (only if skill itself defines them) ----------------
echo "Criterion 3 — banned-phrase enforcement"
if grep -Ein '^##+[[:space:]]*banned[[:space:]]+phrases?' "$SKILL_PATH" >/dev/null; then
  info "skill declares a banned-phrases section — extracting"
  # Crude extraction: take lines after a Banned heading until next heading.
  awk '
    /^##+[[:space:]]*[Bb]anned[[:space:]]+[Pp]hrases?/ {flag=1; next}
    flag && /^##+[[:space:]]/ {flag=0}
    flag {print}
  ' "$SKILL_PATH"
  info "manual review required — banned-phrase enforcement is not mechanically asserted by this skill"
else
  pass "skill does not declare banned phrases — skipping enforcement check"
fi
echo

# --- Trigger surface signals (informational) ----------------------------
echo "Criterion 2 — trigger surface signals (informational)"
DESC=$(grep -E "^description:[[:space:]]" "$SKILL_PATH" | head -1 | sed -E 's/^description:[[:space:]]+//')
if [[ -n "$DESC" ]]; then
  if echo "$DESC" | grep -Eqi '/sweep-the-house|asks for|user types|when'; then
    pass "description contains concrete trigger phrasing"
  else
    info "description may lack concrete trigger phrasing"
  fi
  if echo "$DESC" | grep -Eqi 'not |except|skip|do not|exclud'; then
    info "description contains explicit non-trigger exclusions"
  else
    info "description does not include explicit non-trigger exclusions"
  fi
fi
echo

# --- Stated purpose (informational scan) -------------------------------
echo "Criterion 5 — stated purpose marker (informational)"
if grep -Ein '(this skill exists to|prevents?|failure mode|guards? against|exists because)' "$SKILL_PATH" >/dev/null; then
  grep -Ein '(this skill exists to|prevents?|failure mode|guards? against|exists because)' "$SKILL_PATH"
  info "potential purpose markers found — semantic review required"
else
  info "no obvious purpose markers — semantic review required"
fi
echo

echo "=== validator complete ==="
exit $EXIT_CODE
