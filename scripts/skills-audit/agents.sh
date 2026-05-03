#!/usr/bin/env bash
# Phase 1 Static Audit validator for the `agents` SKILL.md
# Detection-only. Does not modify the target file.
# Re-runnable.

set -u

TARGET="C:/Projects/SermonForge/.claude/skills/agents/SKILL.md"
SKILL_NAME="agents"
MIN_LINES=50
MAX_LINES=400

PASS=0
FAIL=0

pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }
info() { echo "  INFO: $1"; }

echo "=================================================="
echo "VALIDATOR: skills-audit/agents.sh"
echo "TARGET:    $TARGET"
echo "=================================================="

# Existence
echo ""
echo "[0] File existence"
if [[ ! -f "$TARGET" ]]; then
  fail "Target SKILL.md not found at $TARGET"
  echo ""
  echo "Total failures: $FAIL"
  exit 2
fi
pass "Target file exists"

# Read frontmatter (between the first two '---' lines)
echo ""
echo "[1] Frontmatter extraction"
fm_start=$(grep -n '^---$' "$TARGET" | sed -n '1p' | cut -d: -f1)
fm_end=$(grep -n '^---$' "$TARGET" | sed -n '2p' | cut -d: -f1)

if [[ -z "${fm_start:-}" || -z "${fm_end:-}" ]]; then
  fail "Could not locate frontmatter delimiters (--- ... ---)"
else
  pass "Frontmatter delimiters located at lines $fm_start and $fm_end"
fi

if [[ -n "${fm_start:-}" && -n "${fm_end:-}" ]]; then
  fm_body=$(sed -n "$((fm_start + 1)),$((fm_end - 1))p" "$TARGET")
else
  fm_body=""
fi

# YAML parseability
echo ""
echo "[2] YAML parseability"
yaml_ok=0
parser_used=""
if command -v python >/dev/null 2>&1; then
  parser_used="python"
elif command -v python3 >/dev/null 2>&1; then
  parser_used="python3"
fi

if [[ -n "$parser_used" ]]; then
  parse_result=$(printf '%s\n' "$fm_body" | "$parser_used" -c "
import sys, yaml
try:
    data = yaml.safe_load(sys.stdin.read())
    if not isinstance(data, dict):
        print('NOT_A_MAPPING')
        sys.exit(1)
    print('OK')
    for k, v in data.items():
        print('KEY:' + str(k))
except Exception as e:
    print('ERROR:' + str(e))
    sys.exit(1)
" 2>&1)
  if echo "$parse_result" | grep -q '^OK$'; then
    pass "YAML frontmatter parses cleanly ($parser_used + PyYAML)"
    yaml_ok=1
  else
    fail "YAML frontmatter did not parse: $parse_result"
  fi
  yaml_keys=$(echo "$parse_result" | grep '^KEY:' | sed 's/^KEY://')
else
  info "No python interpreter found; falling back to grep-based key detection"
  yaml_keys=$(printf '%s\n' "$fm_body" | grep -oE '^[a-zA-Z_][a-zA-Z0-9_-]*:' | tr -d ':' )
  yaml_ok=1
fi

echo "  Detected frontmatter keys:"
while IFS= read -r k; do
  [[ -n "$k" ]] && echo "    - $k"
done <<< "$yaml_keys"

# Required fields
echo ""
echo "[3] Required frontmatter fields (name, description)"
for required in name description; do
  if echo "$yaml_keys" | grep -qx "$required"; then
    pass "Field present: $required"
  else
    fail "Missing required field: $required"
  fi
done

# Optional + unknown fields
echo ""
echo "[4] Optional/unknown frontmatter fields"
allowed_pattern='^(name|description|trigger)$'
while IFS= read -r k; do
  [[ -z "$k" ]] && continue
  if echo "$k" | grep -Eqx "$allowed_pattern"; then
    info "Known field: $k"
  else
    fail "Unknown frontmatter field: $k"
  fi
done <<< "$yaml_keys"

# name == directory name
echo ""
echo "[5] name field equals '$SKILL_NAME'"
name_value=$(printf '%s\n' "$fm_body" | grep -E '^name:' | head -n1 | sed -E 's/^name:[[:space:]]*//; s/^"//; s/"$//; s/^'"'"'//; s/'"'"'$//')
if [[ "$name_value" == "$SKILL_NAME" ]]; then
  pass "name == '$SKILL_NAME'"
else
  fail "name is '$name_value', expected '$SKILL_NAME'"
fi

# Final newline
echo ""
echo "[6] File ends with newline"
last_byte=$(tail -c 1 "$TARGET" | od -An -c | tr -d ' ')
if [[ "$last_byte" == '\n' ]]; then
  pass "File ends with newline"
else
  fail "File does not end with a newline (last char: '$last_byte')"
fi

# Line count and byte size
echo ""
echo "[7] Line count and byte size in [$MIN_LINES, $MAX_LINES] lines"
line_count=$(wc -l < "$TARGET" | tr -d ' ')
byte_count=$(wc -c < "$TARGET" | tr -d ' ')
echo "  Line count: $line_count"
echo "  Byte count: $byte_count"

if [[ "$line_count" -lt "$MIN_LINES" ]]; then
  fail "Line count $line_count < $MIN_LINES (may lack constraint)"
elif [[ "$line_count" -gt "$MAX_LINES" ]]; then
  fail "Line count $line_count > $MAX_LINES (truncation risk)"
else
  pass "Line count within range"
fi

# Banned phrases — only enforce if SKILL.md itself defines them.
echo ""
echo "[8] Banned-phrase enforcement"
# Detect a 'Banned' / 'Forbidden' phrases section in the body.
if grep -niE '^#{1,6}[[:space:]]*(banned|forbidden)[[:space:]]+(phrase|word)' "$TARGET" >/dev/null 2>&1; then
  info "Banned-phrases section detected — manual phrase enforcement would be required"
  # Without an explicit list format, we cannot mechanically enforce.
  fail "Banned-phrases section present but no machine-readable list format defined; cannot mechanically enforce"
else
  pass "No banned-phrases list defined in skill (nothing to enforce)"
fi

echo ""
echo "=================================================="
echo "TOTAL FAILURES: $FAIL"
echo "=================================================="

if [[ "$FAIL" -eq 0 ]]; then
  exit 0
else
  exit 1
fi
