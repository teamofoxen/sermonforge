#!/usr/bin/env bash
# Mechanical validator for .claude/skills/release/SKILL.md
# Detection-only. Exits 0 iff all mechanical checks pass.

set -u

TARGET="C:/Projects/SermonForge/.claude/skills/release/SKILL.md"
EXPECTED_NAME="release"
EXPECTED_DIR="release"

FAIL=0
pass() { printf '  [PASS] %s\n' "$1"; }
fail() { printf '  [FAIL] %s\n' "$1"; FAIL=1; }
info() { printf '         %s\n' "$1"; }

echo "=== release SKILL.md mechanical validator ==="
echo "Target: $TARGET"
echo

# --- Existence ---
echo "[1] File exists & readable"
if [[ -f "$TARGET" && -r "$TARGET" ]]; then
  pass "file exists and is readable"
else
  fail "file missing or unreadable"
  exit 2
fi
echo

# --- Frontmatter extraction (between first two --- lines) ---
# Robust against CRLF.
FM=$(awk '
  BEGIN{ infm=0; count=0 }
  {
    line=$0
    sub(/\r$/,"",line)
    if (line=="---") {
      count++
      if (count==1) { infm=1; next }
      if (count==2) { infm=0; exit }
    }
    if (infm) print line
  }
' "$TARGET")

echo "[2] Frontmatter present (delimited by --- ... ---)"
if [[ -n "$FM" ]]; then
  pass "frontmatter block found"
else
  fail "frontmatter block not found"
fi
echo

echo "[3] YAML frontmatter parseable"
PARSED_OK=0
PARSER_USED="none"

# Try parsers in order; skip Microsoft Store python3 stub by probing yaml import.
try_parser() {
  local bin="$1"
  command -v "$bin" >/dev/null 2>&1 || return 1
  "$bin" -c "import yaml" >/dev/null 2>&1 || return 1
  printf '%s\n' "$FM" | "$bin" -c "
import sys, yaml
try:
    d = yaml.safe_load(sys.stdin.read())
    if not isinstance(d, dict):
        sys.exit(2)
except Exception:
    sys.exit(2)
" >/dev/null 2>&1
}

for cand in python python3 py; do
  if command -v "$cand" >/dev/null 2>&1 && "$cand" -c "import yaml" >/dev/null 2>&1; then
    PARSER_USED="$cand"
    if try_parser "$cand"; then
      PARSED_OK=1
    fi
    break
  fi
done

if [[ "$PARSER_USED" == "none" ]]; then
  # Fallback: line-grammar check (key: value at top level)
  PARSER_USED="bash-fallback"
  bad=0
  while IFS= read -r line; do
    line="${line%$'\r'}"
    [[ -z "$line" ]] && continue
    if ! [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_-]*:[[:space:]] ]]; then
      bad=1; break
    fi
  done <<< "$FM"
  [[ $bad -eq 0 ]] && PARSED_OK=1
fi

if [[ $PARSED_OK -eq 1 ]]; then
  pass "frontmatter parses (parser: $PARSER_USED)"
else
  fail "frontmatter does not parse (parser: $PARSER_USED)"
fi
echo

# --- Required field extraction (regex on top-level keys; values may span lines) ---
get_field() {
  local key="$1"
  awk -v k="$key" '
    BEGIN { found=0 }
    {
      line=$0
      sub(/\r$/,"",line)
      if (match(line, "^"k":[[:space:]]*")) {
        sub("^"k":[[:space:]]*","",line)
        print line
        found=1
        exit
      }
    }
  ' <<< "$FM"
}

NAME=$(get_field "name")
DESC=$(get_field "description")
TRIG=$(get_field "trigger")

echo "[4] Required field: name"
if [[ -n "$NAME" ]]; then
  pass "name = '$NAME'"
else
  fail "name missing"
fi
echo

echo "[5] Required field: description"
if [[ -n "$DESC" ]]; then
  pass "description present (${#DESC} chars on first line)"
else
  fail "description missing"
fi
echo

echo "[6] Optional field: trigger (informational)"
if [[ -n "$TRIG" ]]; then
  info "trigger = '$TRIG'"
else
  info "trigger absent (allowed)"
fi
echo

echo "[7] name field equals directory name ('$EXPECTED_NAME')"
if [[ "$NAME" == "$EXPECTED_NAME" ]]; then
  pass "name matches directory"
else
  fail "name '$NAME' != expected '$EXPECTED_NAME'"
fi
echo

# --- Stray frontmatter fields ---
echo "[8] No stray/unknown frontmatter fields (allowed: name, description, trigger)"
STRAY=""
while IFS= read -r line; do
  line="${line%$'\r'}"
  [[ -z "$line" ]] && continue
  # only consider lines that look like top-level key: definitions
  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_-]*):[[:space:]] ]]; then
    key="${BASH_REMATCH[1]}"
    case "$key" in
      name|description|trigger) ;;
      *) STRAY="$STRAY $key" ;;
    esac
  fi
done <<< "$FM"
if [[ -z "$STRAY" ]]; then
  pass "no stray fields"
else
  fail "stray fields found:$STRAY"
fi
echo

# --- Final newline ---
echo "[9] File ends with newline"
LAST_BYTE=$(tail -c 1 "$TARGET" | od -An -tx1 | tr -d ' \n')
if [[ "$LAST_BYTE" == "0a" ]]; then
  pass "ends with LF"
else
  fail "does not end with LF (last byte hex = $LAST_BYTE)"
fi
echo

# --- Length profile ---
echo "[10] Line count in [50, 400]"
LINES=$(wc -l < "$TARGET" | tr -d ' ')
info "line count = $LINES"
if (( LINES >= 50 && LINES <= 400 )); then
  pass "within [50, 400]"
else
  fail "outside [50, 400]"
fi
echo

echo "[11] Byte size (informational)"
BYTES=$(wc -c < "$TARGET" | tr -d ' ')
info "byte size = $BYTES"
echo

# --- Banned phrase enforcement ---
echo "[12] Banned-phrase enforcement"
# Inspect skill body for explicit banned-phrase list. The release skill does
# not define an enforceable banned-phrase list (it has HARD RULES about
# behavior, not phrases banned in output).
info "skill does not define banned phrases — check skipped"
echo

echo "=== Summary ==="
if [[ $FAIL -eq 0 ]]; then
  echo "RESULT: PASS"
  exit 0
else
  echo "RESULT: FAIL"
  exit 1
fi
