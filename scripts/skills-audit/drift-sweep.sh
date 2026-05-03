#!/usr/bin/env bash
# Phase 1 Static Audit validator for the `drift-sweep` SKILL.md
# Detection-only. Does not modify the target file.
# Re-runnable.

set -u

TARGET="C:/Projects/SermonForge/.claude/skills/drift-sweep/SKILL.md"
SKILL_NAME="drift-sweep"
MIN_LINES=50
MAX_LINES=400

FAIL=0

pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }
info() { echo "  INFO: $1"; }

echo "=================================================="
echo "VALIDATOR: skills-audit/drift-sweep.sh"
echo "TARGET:    $TARGET"
echo "=================================================="

# [0] Existence
echo ""
echo "[0] File existence"
if [[ ! -f "$TARGET" ]]; then
  fail "Target SKILL.md not found at $TARGET"
  echo ""
  echo "Total failures: $FAIL"
  exit 2
fi
pass "Target file exists"

# [1] Frontmatter delimiters
echo ""
echo "[1] Frontmatter extraction"
fm_start=$(grep -n '^---$' "$TARGET" | sed -n '1p' | cut -d: -f1)
fm_end=$(grep -n '^---$' "$TARGET" | sed -n '2p' | cut -d: -f1)

if [[ -z "${fm_start:-}" || -z "${fm_end:-}" ]]; then
  fail "Could not locate frontmatter delimiters (--- ... ---)"
else
  pass "Frontmatter delimiters located at lines $fm_start and $fm_end"
fi

# Extract frontmatter body
fm_body=""
if [[ -n "${fm_start:-}" && -n "${fm_end:-}" ]]; then
  fm_body=$(sed -n "$((fm_start + 1)),$((fm_end - 1))p" "$TARGET")
fi

# [2] Frontmatter parseable as YAML
echo ""
echo "[2] Frontmatter YAML parseability"
if [[ -z "$fm_body" ]]; then
  fail "Frontmatter body is empty"
else
  # Try python yaml first; fall back to simple grep validation
  if command -v python >/dev/null 2>&1; then
    if echo "$fm_body" | python -c "import sys,yaml; yaml.safe_load(sys.stdin)" 2>/dev/null; then
      pass "Frontmatter parses as valid YAML"
    else
      # Try with different python invocation patterns
      if echo "$fm_body" | python -c "import sys; import yaml; yaml.safe_load(sys.stdin.read())" 2>/dev/null; then
        pass "Frontmatter parses as valid YAML"
      else
        info "python available but yaml module not installed; falling back to structural check"
        # Simple structural check: each non-blank line should be 'key: value' or continuation
        bad=$(echo "$fm_body" | grep -vE '^([a-zA-Z_][a-zA-Z0-9_-]*:|[[:space:]]|$)' || true)
        if [[ -n "$bad" ]]; then
          fail "Lines do not look like valid YAML key/value pairs: $bad"
        else
          pass "Frontmatter looks structurally valid (key: value lines)"
        fi
      fi
    fi
  else
    bad=$(echo "$fm_body" | grep -vE '^([a-zA-Z_][a-zA-Z0-9_-]*:|[[:space:]]|$)' || true)
    if [[ -n "$bad" ]]; then
      fail "Lines do not look like valid YAML key/value pairs: $bad"
    else
      pass "Frontmatter looks structurally valid (no python for full YAML check)"
    fi
  fi
fi

# [3] Required field: name
echo ""
echo "[3] Required frontmatter field: name"
name_line=$(echo "$fm_body" | grep -E '^name:' | head -n 1)
if [[ -z "$name_line" ]]; then
  fail "Missing required field 'name'"
else
  pass "Found: $name_line"
  name_val=$(echo "$name_line" | sed -E 's/^name:[[:space:]]*//; s/[[:space:]]*$//; s/^"//; s/"$//')
  if [[ "$name_val" == "$SKILL_NAME" ]]; then
    pass "name field equals '$SKILL_NAME'"
  else
    fail "name field is '$name_val', expected '$SKILL_NAME'"
  fi
fi

# [4] Required field: description
echo ""
echo "[4] Required frontmatter field: description"
desc_line=$(echo "$fm_body" | grep -E '^description:' | head -n 1)
if [[ -z "$desc_line" ]]; then
  fail "Missing required field 'description'"
else
  pass "Found description field"
  desc_len=$(echo "$desc_line" | wc -c)
  info "description line length: $desc_len chars"
fi

# [5] Optional field: trigger
echo ""
echo "[5] Optional frontmatter field: trigger"
trigger_line=$(echo "$fm_body" | grep -E '^trigger:' | head -n 1)
if [[ -z "$trigger_line" ]]; then
  info "No 'trigger:' field present (known for drift-sweep — INFO not BLOCKER per audit spec)"
else
  pass "Found: $trigger_line"
fi

# [6] Stray frontmatter fields
echo ""
echo "[6] Stray/unknown frontmatter fields"
known_fields="name description trigger"
stray_fields=""
while IFS= read -r line; do
  if [[ "$line" =~ ^([a-zA-Z_][a-zA-Z0-9_-]*): ]]; then
    field="${BASH_REMATCH[1]}"
    if ! echo " $known_fields " | grep -q " $field "; then
      stray_fields="$stray_fields $field"
    fi
  fi
done <<< "$fm_body"
if [[ -z "$stray_fields" ]]; then
  pass "No stray fields"
else
  fail "Stray frontmatter fields:$stray_fields"
fi

# [7] File ends with newline (and not mid-sentence)
echo ""
echo "[7] File ends cleanly (final newline)"
last_byte=$(tail -c 1 "$TARGET" | od -An -c | tr -d ' ')
if [[ "$last_byte" == "\\n" ]]; then
  pass "File ends with a newline"
else
  fail "File does not end with a newline (last byte: '$last_byte')"
fi

# [8] Line count and byte size
echo ""
echo "[8] Length and load profile"
lines=$(wc -l < "$TARGET" | tr -d ' ')
bytes=$(wc -c < "$TARGET" | tr -d ' ')
info "Lines: $lines  Bytes: $bytes"
if (( lines < MIN_LINES )); then
  fail "Line count $lines is below minimum $MIN_LINES (may lack constraint)"
elif (( lines > MAX_LINES )); then
  fail "Line count $lines exceeds maximum $MAX_LINES (truncation risk)"
else
  pass "Line count within range [$MIN_LINES, $MAX_LINES]"
fi

# [9] Banned phrases — drift-sweep DEFINES banned phrases. Verify they are listed concretely.
echo ""
echo "[9] Banned phrases definition (drift-sweep specific)"
# The skill must list banned phrases as quoted strings the body of the file
# Per spec, expected examples: "looks clean," "no drift found," "all consistent," "verified," "appears correct"
expected_bans=("looks clean" "no drift found" "all consistent" "verified" "appears correct")
banned_section_found=0
if grep -q -i 'banned phrases' "$TARGET"; then
  banned_section_found=1
  pass "Body contains a 'Banned phrases' section/label"
else
  fail "Body does not contain any 'Banned phrases' section/label"
fi

if [[ $banned_section_found -eq 1 ]]; then
  missing=()
  found=()
  for phrase in "${expected_bans[@]}"; do
    # Look for the phrase quoted (allowing for "...," ".." etc.)
    if grep -q -i "\"$phrase" "$TARGET"; then
      found+=("$phrase")
    else
      missing+=("$phrase")
    fi
  done
  if (( ${#found[@]} > 0 )); then
    pass "Banned phrases concretely listed (found ${#found[@]}/${#expected_bans[@]}): ${found[*]}"
  fi
  if (( ${#missing[@]} > 0 )); then
    info "Expected banned phrases not found verbatim (may be reworded): ${missing[*]}"
  fi
  # Verify they are concrete — i.e., grep-able strings (quoted), not abstract concepts
  # Count distinct quoted strings within ~5 lines after the "Banned phrases" line
  ban_line=$(grep -n -i 'banned phrases' "$TARGET" | head -n 1 | cut -d: -f1)
  if [[ -n "$ban_line" ]]; then
    # take 3 lines around it
    nearby=$(sed -n "${ban_line},$((ban_line + 3))p" "$TARGET")
    quoted_count=$(echo "$nearby" | grep -oE '"[^"]+"' | wc -l | tr -d ' ')
    info "Quoted phrases near banned-phrases line: $quoted_count"
    if (( quoted_count >= 3 )); then
      pass "Banned phrases appear to be concrete grep-able strings (>=3 quoted)"
    else
      fail "Banned phrases section lacks concrete quoted strings (only $quoted_count near label) — not enforceable by script"
    fi
  fi
fi

# [10] Skill name in body matches frontmatter
echo ""
echo "[10] Skill name in body heading"
if grep -qE "^# $SKILL_NAME\$" "$TARGET"; then
  pass "Body heading '# $SKILL_NAME' present"
else
  info "No exact '# $SKILL_NAME' heading; body may use different format"
fi

# Summary
echo ""
echo "=================================================="
echo "TOTAL FAILURES: $FAIL"
echo "=================================================="

if (( FAIL == 0 )); then
  exit 0
else
  exit 1
fi
