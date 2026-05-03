#!/usr/bin/env bash
# Phase 1 mechanical validator for the sweep-the-universe skill.
# Detection only — exits 0 only if all mechanical checks pass.

set -u

TARGET="C:/Projects/SermonForge/.claude/skills/sweep-the-universe/SKILL.md"
EXPECTED_NAME="sweep-the-universe"
MIN_LINES=50
MAX_LINES=400

fail_count=0
warn_count=0

note_fail() {
  echo "  FAIL: $1"
  fail_count=$((fail_count + 1))
}

note_warn() {
  echo "  WARN: $1"
  warn_count=$((warn_count + 1))
}

note_pass() {
  echo "  PASS: $1"
}

echo "=== sweep-the-universe SKILL.md mechanical validator ==="
echo "Target: $TARGET"
echo

# --- Existence ---
echo "[Criterion] File exists and readable"
if [[ ! -f "$TARGET" ]]; then
  note_fail "Target file does not exist"
  echo
  echo "Mechanical exit: 1 (target missing)"
  exit 1
fi
note_pass "File found"
echo

# --- Frontmatter extraction ---
echo "[Criterion] YAML frontmatter parseable + delimiters"
# A valid frontmatter starts at line 1 with "---" and closes with another "---".
first_line=$(sed -n '1p' "$TARGET")
if [[ "$first_line" != "---" ]]; then
  note_fail "First line is not '---' (got: '$first_line')"
else
  note_pass "Opening '---' delimiter on line 1"
fi

# Find the line number of the closing delimiter (first '---' on or after line 2)
close_ln=$(awk 'NR>1 && /^---[[:space:]]*$/ {print NR; exit}' "$TARGET")
if [[ -z "$close_ln" ]]; then
  note_fail "No closing '---' delimiter found"
  fm_block=""
else
  note_pass "Closing '---' delimiter on line $close_ln"
  fm_block=$(sed -n "2,$((close_ln - 1))p" "$TARGET")
fi
echo

# --- Required frontmatter fields ---
echo "[Criterion] Required frontmatter fields (name, description)"
if [[ -n "$fm_block" ]]; then
  if echo "$fm_block" | grep -Eq '^name:[[:space:]]*'; then
    note_pass "name field present"
  else
    note_fail "name field missing"
  fi
  if echo "$fm_block" | grep -Eq '^description:[[:space:]]*'; then
    note_pass "description field present"
  else
    note_fail "description field missing"
  fi
  # Optional trigger field (informational)
  if echo "$fm_block" | grep -Eq '^trigger:[[:space:]]*'; then
    echo "  INFO: optional trigger field present"
  fi
  # Stray-field surveillance: anything outside known set is reported as INFO (not FAIL).
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^[[:space:]] ]] && continue   # continuation
    key=$(echo "$line" | sed -n 's/^\([A-Za-z_-]\+\):.*/\1/p')
    [[ -z "$key" ]] && continue
    case "$key" in
      name|description|trigger) ;;
      *) echo "  INFO: unknown frontmatter field: $key" ;;
    esac
  done <<< "$fm_block"
else
  note_fail "Cannot evaluate fields — frontmatter block empty"
fi
echo

# --- name field equals directory ---
echo "[Criterion] frontmatter name == '$EXPECTED_NAME'"
name_value=$(echo "$fm_block" | sed -n 's/^name:[[:space:]]*\(.*\)[[:space:]]*$/\1/p' | head -n1 | tr -d '"' | tr -d "'" | sed 's/[[:space:]]*$//')
if [[ "$name_value" == "$EXPECTED_NAME" ]]; then
  note_pass "name = '$name_value'"
else
  note_fail "name = '$name_value' (expected '$EXPECTED_NAME')"
fi
echo

# --- File ends with newline ---
echo "[Criterion] File ends with newline"
last_byte=$(tail -c 1 "$TARGET" | od -An -c | tr -d ' ')
if [[ "$last_byte" == '\n' ]]; then
  note_pass "Final byte is newline"
else
  note_fail "Final byte is not newline (got: '$last_byte')"
fi
echo

# --- Line count and byte size ---
echo "[Criterion] Line count and byte size in [$MIN_LINES, $MAX_LINES]"
line_count=$(awk 'END {print NR}' "$TARGET")
byte_size=$(wc -c < "$TARGET" | tr -d ' \r')
echo "  Lines: $line_count"
echo "  Bytes: $byte_size"
if (( line_count < MIN_LINES )); then
  note_fail "Line count $line_count < $MIN_LINES (may lack constraint)"
elif (( line_count > MAX_LINES )); then
  note_fail "Line count $line_count > $MAX_LINES (truncation risk)"
else
  note_pass "Line count within bounds"
fi
echo

# --- Banned-phrase enforcement ---
echo "[Criterion] Banned-phrase enforcement"
# The skill does NOT define a banned-phrases list. Skip mechanically.
echo "  SKIP: skill defines no banned-phrase list"
echo

# --- Summary ---
echo "=== Summary ==="
echo "FAILs: $fail_count"
echo "WARNs: $warn_count"

if (( fail_count > 0 )); then
  exit 1
fi
exit 0
