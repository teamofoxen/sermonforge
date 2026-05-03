#!/usr/bin/env bash
# Phase 1 mechanical validator for the run-agent skill.
# Detection only; does not modify any source.

set -u

TARGET="C:/Projects/SermonForge/.claude/skills/run-agent/SKILL.md"
EXPECTED_NAME="run-agent"
MIN_LINES=50
MAX_LINES=400

FAIL=0
note_fail() { FAIL=1; }

echo "=== run-agent SKILL.md mechanical audit ==="
echo "Target: $TARGET"
echo

# 0. File existence
echo "--- [0] File exists ---"
if [[ ! -f "$TARGET" ]]; then
  echo "FAIL: target file not found"
  exit 2
fi
echo "PASS"
echo

# 1. Line count and byte size
echo "--- [1] Length and load profile ---"
LINES=$(wc -l < "$TARGET" | tr -d ' \r')
BYTES=$(wc -c < "$TARGET" | tr -d ' \r')
echo "Lines: $LINES"
echo "Bytes: $BYTES"
if (( LINES < MIN_LINES )); then
  echo "WARN: line count $LINES is below minimum $MIN_LINES (may lack constraint)"
  note_fail
elif (( LINES > MAX_LINES )); then
  echo "WARN: line count $LINES exceeds maximum $MAX_LINES (truncation risk)"
  note_fail
else
  echo "PASS: within [$MIN_LINES, $MAX_LINES]"
fi
echo

# 2. Trailing newline
echo "--- [2] Final newline ---"
LAST_BYTE=$(tail -c 1 "$TARGET" | od -An -c | tr -d ' ')
if [[ "$LAST_BYTE" == "\\n" ]]; then
  echo "PASS: file ends with newline"
else
  echo "FAIL: file does not end with newline (last byte: $LAST_BYTE)"
  note_fail
fi
echo

# 3. Frontmatter delimiters
echo "--- [3] Frontmatter delimiters ---"
FIRST_LINE=$(head -n 1 "$TARGET")
if [[ "$FIRST_LINE" != "---" ]]; then
  echo "FAIL: file does not start with ---"
  note_fail
else
  echo "PASS: starts with ---"
fi

# Find closing --- (the second --- in the file)
CLOSE_LINE=$(awk '/^---[[:space:]]*$/ {c++; if (c==2) {print NR; exit}}' "$TARGET")
if [[ -z "$CLOSE_LINE" ]]; then
  echo "FAIL: closing --- not found"
  note_fail
else
  echo "PASS: closing --- at line $CLOSE_LINE"
fi
echo

# 4. Extract frontmatter and parse with Python's PyYAML if available, else manual
echo "--- [4] Frontmatter YAML parse ---"
if [[ -n "${CLOSE_LINE:-}" ]]; then
  FM=$(sed -n "2,$((CLOSE_LINE-1))p" "$TARGET")
  echo "Frontmatter content:"
  echo "$FM" | sed 's/^/  /'
  echo

  # Try python yaml parse
  if command -v python >/dev/null 2>&1; then
    PY=$(command -v python)
  elif command -v python3 >/dev/null 2>&1; then
    PY=$(command -v python3)
  else
    PY=""
  fi

  PARSE_OK=0
  if [[ -n "$PY" ]]; then
    if echo "$FM" | "$PY" -c "import sys, yaml; yaml.safe_load(sys.stdin.read())" 2>/dev/null; then
      echo "PASS: YAML parses (PyYAML)"
      PARSE_OK=1
    else
      # Try without PyYAML — manual key:value sniff
      echo "INFO: PyYAML not available or parse failed; falling back to manual key check"
    fi
  fi

  if (( PARSE_OK == 0 )); then
    # Manual heuristic: every non-empty line should be 'key: value'
    BAD=$(echo "$FM" | grep -nvE '^[[:space:]]*$|^[a-zA-Z_][a-zA-Z0-9_-]*:[[:space:]]' || true)
    if [[ -z "$BAD" ]]; then
      echo "PASS: frontmatter conforms to key: value format (manual check)"
    else
      echo "FAIL: malformed frontmatter lines:"
      echo "$BAD"
      note_fail
    fi
  fi
fi
echo

# 5. Required frontmatter fields
echo "--- [5] Required frontmatter fields ---"
NAME_VAL=$(echo "$FM" | grep -E '^name:' | head -n1 | sed -E 's/^name:[[:space:]]*//')
DESC_VAL=$(echo "$FM" | grep -E '^description:' | head -n1 | sed -E 's/^description:[[:space:]]*//')
TRIGGER_VAL=$(echo "$FM" | grep -E '^trigger:' | head -n1 | sed -E 's/^trigger:[[:space:]]*//')

if [[ -z "$NAME_VAL" ]]; then
  echo "FAIL: 'name' field missing"
  note_fail
else
  echo "PASS: name = '$NAME_VAL'"
fi

if [[ -z "$DESC_VAL" ]]; then
  echo "FAIL: 'description' field missing"
  note_fail
else
  echo "PASS: description present (length=${#DESC_VAL})"
fi

if [[ -n "$TRIGGER_VAL" ]]; then
  echo "INFO: optional trigger = '$TRIGGER_VAL'"
else
  echo "INFO: no trigger field (optional)"
fi
echo

# 6. name matches directory
echo "--- [6] name matches directory ---"
if [[ "$NAME_VAL" == "$EXPECTED_NAME" ]]; then
  echo "PASS: name matches expected '$EXPECTED_NAME'"
else
  echo "FAIL: name '$NAME_VAL' does not match expected '$EXPECTED_NAME'"
  note_fail
fi
echo

# 7. Stray frontmatter fields
echo "--- [7] Stray frontmatter fields ---"
ALLOWED_RE='^(name|description|trigger):'
STRAY=$(echo "$FM" | grep -E '^[a-zA-Z_][a-zA-Z0-9_-]*:' | grep -vE "$ALLOWED_RE" || true)
if [[ -z "$STRAY" ]]; then
  echo "PASS: no unknown frontmatter fields"
else
  echo "WARN: unknown frontmatter fields detected:"
  echo "$STRAY"
  note_fail
fi
echo

# 8. Banned-phrase enforcement
echo "--- [8] Banned-phrase enforcement ---"
# The skill itself does not declare banned phrases (no 'BANNED' or 'Banned phrases' section).
if grep -qiE '^(##|#)[[:space:]]+banned' "$TARGET" || grep -qiE 'banned phrases?' "$TARGET"; then
  echo "INFO: banned-phrase section detected; manual enforcement required"
else
  echo "SKIP: skill defines no banned phrases"
fi
echo

# 9. Mid-sentence cutoff sniff (last non-blank line ends in alnum or terminating punctuation)
echo "--- [9] Final-line clean termination ---"
LAST_NONBLANK=$(awk 'NF {l=$0} END {print l}' "$TARGET")
echo "Last non-blank line: $LAST_NONBLANK"
# Use grep -E for a portable POSIX ERE check (bash regex behavior with embedded
# POSIX classes inside other character classes varies between bash builds).
if printf '%s' "$LAST_NONBLANK" | grep -qE '[[:alnum:]).!?>:_`-]$|\]$'; then
  echo "PASS: last non-blank line ends with terminating character"
else
  echo "WARN: last non-blank line may be cut off"
  note_fail
fi
echo

# Summary
echo "=== Summary ==="
if (( FAIL == 0 )); then
  echo "ALL MECHANICAL CHECKS PASSED"
  exit 0
else
  echo "ONE OR MORE MECHANICAL CHECKS FAILED OR WARNED"
  exit 1
fi
