#!/usr/bin/env bash
# Phase 1 mechanical validator for the `interrogate` skill.
# Detection-only: this script reports pass/fail per criterion. No edits.
# Re-runnable. Exit 0 only if ALL mechanical checks pass.

set -u

TARGET="C:/Projects/SermonForge/.claude/skills/interrogate/SKILL.md"
SKILL_NAME="interrogate"
MIN_LINES=50
MAX_LINES=400
FAILS=0

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; FAILS=$((FAILS+1)); }
info() { echo "[INFO] $1"; }

echo "=== interrogate SKILL.md mechanical validator ==="
echo "Target: $TARGET"
echo

# 0. File exists
if [[ ! -f "$TARGET" ]]; then
  fail "Target file does not exist"
  echo "Total fails: $FAILS"
  exit 1
fi
pass "Target file exists"

# Extract frontmatter (between first '---' and second '---')
FRONTMATTER="$(awk '
  BEGIN { in_fm=0; count=0 }
  /^---[[:space:]]*$/ {
    count++
    if (count==1) { in_fm=1; next }
    if (count==2) { in_fm=0; exit }
  }
  in_fm==1 { print }
' "$TARGET")"

if [[ -z "$FRONTMATTER" ]]; then
  fail "Frontmatter block not found or empty"
else
  pass "Frontmatter block extracted"
fi

# 1a. YAML parseable (prefer python yaml; fallback to grep-based)
YAML_OK=0
if command -v python >/dev/null 2>&1; then
  if python -c "
import sys, yaml
try:
    data = yaml.safe_load(open(r'$TARGET','r',encoding='utf-8').read().split('---')[1])
    if not isinstance(data, dict):
        sys.exit(2)
    sys.exit(0)
except Exception as e:
    print('YAML error:', e, file=sys.stderr)
    sys.exit(1)
" 2>/dev/null; then
    YAML_OK=1
    pass "Frontmatter YAML parses cleanly (python yaml)"
  else
    fail "Frontmatter YAML failed to parse (python yaml)"
  fi
else
  # Fallback: heuristic — every non-empty line is `key: value`
  BAD=0
  while IFS= read -r line; do
    [[ -z "${line// }" ]] && continue
    if ! echo "$line" | grep -Eq '^[A-Za-z_][A-Za-z0-9_-]*[[:space:]]*:[[:space:]]*.+'; then
      BAD=1
      break
    fi
  done <<< "$FRONTMATTER"
  if [[ $BAD -eq 0 ]]; then
    YAML_OK=1
    pass "Frontmatter YAML appears well-formed (heuristic; python not available)"
  else
    fail "Frontmatter YAML appears malformed (heuristic; python not available)"
  fi
fi

# 1b. Required fields: name, description
if echo "$FRONTMATTER" | grep -Eq '^name[[:space:]]*:'; then
  pass "Required field 'name' present"
else
  fail "Required field 'name' missing"
fi

if echo "$FRONTMATTER" | grep -Eq '^description[[:space:]]*:'; then
  pass "Required field 'description' present"
else
  fail "Required field 'description' missing"
fi

# 1c. name == interrogate
NAME_VALUE="$(echo "$FRONTMATTER" | grep -E '^name[[:space:]]*:' | head -1 | sed -E 's/^name[[:space:]]*:[[:space:]]*//; s/[[:space:]]+$//; s/^"//; s/"$//; s/^'"'"'//; s/'"'"'$//')"
if [[ "$NAME_VALUE" == "$SKILL_NAME" ]]; then
  pass "Frontmatter name matches directory ('$SKILL_NAME')"
else
  fail "Frontmatter name '$NAME_VALUE' != directory '$SKILL_NAME'"
fi

# 1d. Stray/unknown frontmatter fields (allowed: name, description, trigger)
STRAY="$(echo "$FRONTMATTER" | grep -E '^[A-Za-z_][A-Za-z0-9_-]*[[:space:]]*:' \
  | sed -E 's/^([A-Za-z_][A-Za-z0-9_-]*)[[:space:]]*:.*/\1/' \
  | grep -Ev '^(name|description|trigger)$' || true)"
if [[ -z "$STRAY" ]]; then
  pass "No stray frontmatter fields"
else
  fail "Stray frontmatter fields detected: $(echo "$STRAY" | tr '\n' ' ')"
fi

# 1e. File ends with newline (no mid-sentence cutoff — newline check is mechanical proxy)
LAST_BYTE="$(tail -c 1 "$TARGET" | od -An -c | tr -d ' ')"
if [[ "$LAST_BYTE" == "\\n" ]]; then
  pass "File ends with newline"
else
  fail "File does not end with newline (last byte: '$LAST_BYTE')"
fi

# 6. Line count and byte size in [50, 400]
LINES=$(wc -l < "$TARGET" | tr -d ' ')
BYTES=$(wc -c < "$TARGET" | tr -d ' ')
info "Line count: $LINES"
info "Byte size: $BYTES"
if (( LINES >= MIN_LINES && LINES <= MAX_LINES )); then
  pass "Line count in range [$MIN_LINES, $MAX_LINES]"
else
  fail "Line count $LINES outside range [$MIN_LINES, $MAX_LINES]"
fi

# 3d. Banned-phrase enforcement IF skill defines banned phrases.
# Scan body for a "banned phrases" / "forbidden phrases" / "do not say" section header.
BANNED_HEADER=$(grep -niE '^#+.*\b(banned|forbidden|disallow(ed)?|prohibited)\b' "$TARGET" || true)
if [[ -n "$BANNED_HEADER" ]]; then
  info "Banned-phrase section detected: $BANNED_HEADER"
  # If a section exists, mechanically scan rest of body for those literal phrases.
  # (Heuristic: extract bullet items from that section.)
  # We don't auto-fail here; we only surface the items.
else
  info "No banned-phrase section defined in skill — skipping banned-phrase enforcement"
fi

echo
if (( FAILS == 0 )); then
  echo "RESULT: ALL MECHANICAL CHECKS PASSED"
  exit 0
else
  echo "RESULT: $FAILS MECHANICAL CHECK(S) FAILED"
  exit 1
fi
