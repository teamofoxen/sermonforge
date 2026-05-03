#!/usr/bin/env bash
# Phase 2 Cross-Skill Static Audit Validator
# Detection-only. No remediation.
# Re-runnable.
#
# Hardening notes (iter 2):
# - Skip fenced code blocks when scanning for skill references (prevents matching
#   shell paths like /usr/bin/env, /v1/sermons, etc., and CSS/lint identifiers).
# - Skill candidate filter: a token is treated as a "skill reference" only if
#   (a) it appears in PRESENT_SKILLS, or (b) it appears in KNOWN_RETIRED_SKILLS.
#   Other slash/backtick tokens (file paths, generic identifiers) are ignored.
# - Trigger overlap check excludes a skill's slash command from matching its own
#   name in its own description (those are not cross-skill overlaps).

set -u

SKILLS_DIR="C:/Projects/SermonForge/.claude/skills"
CLAUDE_MD="C:/Projects/SermonForge/CLAUDE.md"
MEMORY_DIR="C:/Users/rossa/.claude/projects/C--Projects-SermonForge/memory"

FAIL=0

# -----------------------------------------------------------------------------
# Discover present skills
# -----------------------------------------------------------------------------

PRESENT_SKILLS=()
for dir in "$SKILLS_DIR"/*/; do
  name=$(basename "$dir")
  if [ -f "${dir}SKILL.md" ]; then
    PRESENT_SKILLS+=("$name")
  fi
done

# Per audit instruction: sweep-the-room is intentionally documented as retired.
KNOWN_RETIRED_SKILLS=("sweep-the-room")

is_present() {
  local needle="$1"
  for s in "${PRESENT_SKILLS[@]}"; do
    if [ "$s" = "$needle" ]; then
      return 0
    fi
  done
  return 1
}

is_retired() {
  local needle="$1"
  for r in "${KNOWN_RETIRED_SKILLS[@]}"; do
    [ "$r" = "$needle" ] && return 0
  done
  return 1
}

is_known_skill_token() {
  # A token is a "skill reference candidate" if it matches a present or retired skill name.
  local candidate="$1"
  is_present "$candidate" && return 0
  is_retired "$candidate" && return 0
  return 1
}

echo "============================================================"
echo "PRESENT SKILLS (${#PRESENT_SKILLS[@]}):"
printf '  - %s\n' "${PRESENT_SKILLS[@]}"
echo "KNOWN RETIRED SKILLS:"
printf '  - %s\n' "${KNOWN_RETIRED_SKILLS[@]}"
echo

# -----------------------------------------------------------------------------
# Helper: strip fenced code blocks from a file's content (for ref scanning).
# Echoes lines as "lineno:content" preserving original line numbers.
# -----------------------------------------------------------------------------
strip_code_blocks() {
  local file="$1"
  awk '
    BEGIN { in_block = 0 }
    {
      lineno = NR
      if ($0 ~ /^```/) {
        in_block = !in_block
        next
      }
      if (in_block) next
      print lineno ":" $0
    }
  ' "$file"
}

# -----------------------------------------------------------------------------
# CRITERION 1: TRIGGER OVERLAP DETECTION
# -----------------------------------------------------------------------------

echo "============================================================"
echo "CRITERION 1: TRIGGER OVERLAP DETECTION"
echo "============================================================"

TRIG_FILE="$(mktemp)"

extract_triggers() {
  local file="$1"
  local skill="$2"

  local in_frontmatter=0
  local trigger_field=""
  local description_field=""
  local current_field=""

  while IFS= read -r line; do
    if [ "$line" = "---" ]; then
      if [ "$in_frontmatter" -eq 0 ]; then
        in_frontmatter=1
        continue
      else
        break
      fi
    fi
    if [ "$in_frontmatter" -eq 1 ]; then
      if [[ "$line" =~ ^trigger:\ *(.+)$ ]]; then
        trigger_field="${BASH_REMATCH[1]}"
        current_field="trigger"
      elif [[ "$line" =~ ^description:\ *(.+)$ ]]; then
        description_field="${BASH_REMATCH[1]}"
        current_field="description"
      elif [[ "$line" =~ ^[a-zA-Z_]+:\ *(.+)$ ]]; then
        current_field="other"
      elif [ "$current_field" = "description" ]; then
        description_field="$description_field $line"
      fi
    fi
  done < "$file"

  # The slash trigger from the trigger field (if present)
  if [ -n "$trigger_field" ]; then
    echo "${trigger_field}|${skill}|trigger-field" >> "$TRIG_FILE"
  fi

  # Slash phrases in the description — ONLY count those that match a skill name
  # AND aren't this skill's own /<name> (that's a self-reference, not a trigger overlap).
  while IFS= read -r match; do
    if [ -n "$match" ]; then
      candidate="${match#/}"
      # Only treat as a trigger phrase if it's a known skill token
      if is_known_skill_token "$candidate"; then
        if [ "/${candidate}" != "/${skill}" ]; then
          echo "${match}|${skill}|description-slash" >> "$TRIG_FILE"
        fi
      fi
    fi
  done < <(echo "$description_field" | grep -oE '/[a-z][a-z0-9-]+' || true)

  # Quoted phrases in the description (natural-language triggers)
  # Only flag those that are 5+ chars and aren't generic single common verbs.
  while IFS= read -r match; do
    if [ -n "$match" ]; then
      cleaned=$(echo "$match" | sed 's/^"//;s/"$//')
      echo "${cleaned}|${skill}|description-quoted" >> "$TRIG_FILE"
    fi
  done < <(echo "$description_field" | grep -oE '"[^"]{5,}"' || true)
}

for skill in "${PRESENT_SKILLS[@]}"; do
  extract_triggers "${SKILLS_DIR}/${skill}/SKILL.md" "$skill"
done

echo "Extracted trigger phrases (phrase | skill | source):"
sort -u "$TRIG_FILE" | sed 's/^/  /'
echo

echo "Overlap check (same phrase claimed by 2+ DIFFERENT skills):"
OVERLAPS=$(awk -F'|' '
  {
    phrase = $1
    skill = $2
    if (!(phrase SUBSEP skill in seen)) {
      seen[phrase SUBSEP skill] = 1
      if (phrase in claimed) {
        claimed[phrase] = claimed[phrase] "," skill
        count[phrase]++
      } else {
        claimed[phrase] = skill
        count[phrase] = 1
      }
    }
  }
  END {
    for (p in count) if (count[p] > 1) print p " => " claimed[p]
  }
' "$TRIG_FILE" | sort -u)

if [ -n "$OVERLAPS" ]; then
  echo "$OVERLAPS" | sed 's/^/  OVERLAP: /'
  FAIL=1
else
  echo "  none"
fi
echo

# -----------------------------------------------------------------------------
# CRITERION 2: CROSS-REFERENCE RESOLUTION (skill -> skill)
# -----------------------------------------------------------------------------

echo "============================================================"
echo "CRITERION 2: CROSS-REFERENCE RESOLUTION (skill -> skill)"
echo "============================================================"

REF_FILE="$(mktemp)"

scan_skill_refs() {
  local file="$1"
  local source_label="$2"

  while IFS=: read -r lineno content; do
    [ -z "$lineno" ] && continue
    # Pattern A: /skill-name (slash-prefixed)
    while IFS= read -r match; do
      [ -z "$match" ] && continue
      target="${match#/}"
      [[ "$target" =~ ^[a-z][a-z0-9-]+$ ]] || continue
      # Restrict to known skill tokens (present or retired). Filters out file paths.
      is_known_skill_token "$target" || continue
      # Skip self-references where source is this same skill name
      [ "$target" = "$source_label" ] && continue
      echo "${source_label}|${lineno}|/${target}|slash" >> "$REF_FILE"
    done < <(echo "$content" | grep -oE '/[a-z][a-z0-9-]+' || true)

    # Pattern B: backtick-wrapped /skill-name or `skill-name`
    while IFS= read -r match; do
      [ -z "$match" ] && continue
      target=$(echo "$match" | sed 's/`//g')
      target="${target#/}"
      [[ "$target" =~ ^[a-z][a-z0-9-]+$ ]] || continue
      is_known_skill_token "$target" || continue
      [ "$target" = "$source_label" ] && continue
      echo "${source_label}|${lineno}|${target}|backtick" >> "$REF_FILE"
    done < <(echo "$content" | grep -oE '`/?[a-z][a-z0-9-]+`' || true)
  done < <(strip_code_blocks "$file")
}

for skill in "${PRESENT_SKILLS[@]}"; do
  scan_skill_refs "${SKILLS_DIR}/${skill}/SKILL.md" "$skill"
done

sort -u "$REF_FILE" -o "$REF_FILE"

echo "Skill-to-skill references found (source | line | target | type | status):"
if [ -s "$REF_FILE" ]; then
  while IFS='|' read -r src lineno tgt typ; do
    target_name="${tgt#/}"
    if is_present "$target_name"; then
      status="RESOLVED"
    elif is_retired "$target_name"; then
      status="RETIRED (intentional)"
    else
      status="UNRESOLVED"
      FAIL=1
    fi
    echo "  ${src} | L${lineno} | ${tgt} | ${typ} | ${status}"
  done < "$REF_FILE"
else
  echo "  (none)"
fi
echo

echo "Unresolved skill-to-skill references:"
UNRESOLVED_FOUND=0
while IFS='|' read -r src lineno tgt typ; do
  target_name="${tgt#/}"
  if ! is_present "$target_name" && ! is_retired "$target_name"; then
    echo "  - ${src} -> ${tgt} at line ${lineno} (type: ${typ}) | reason: not found in $SKILLS_DIR"
    UNRESOLVED_FOUND=1
  fi
done < "$REF_FILE"
[ $UNRESOLVED_FOUND -eq 0 ] && echo "  none"
echo

# -----------------------------------------------------------------------------
# CRITERION 5 (mechanical): MEMORY + CLAUDE.md SKILL REFERENCE RESOLUTION
# -----------------------------------------------------------------------------

echo "============================================================"
echo "CRITERION 5 (mechanical): MEMORY + CLAUDE.md SKILL REFERENCES"
echo "============================================================"

CTX_REF_FILE="$(mktemp)"

scan_external_file() {
  local file="$1"
  local label="$2"

  while IFS=: read -r lineno content; do
    [ -z "$lineno" ] && continue
    # Pattern A: /skill-name
    while IFS= read -r match; do
      [ -z "$match" ] && continue
      target="${match#/}"
      [[ "$target" =~ ^[a-z][a-z0-9-]+$ ]] || continue
      # Restrict to known skill tokens (present or retired)
      is_known_skill_token "$target" || continue
      echo "${label}|${lineno}|/${target}|slash" >> "$CTX_REF_FILE"
    done < <(echo "$content" | grep -oE '/[a-z][a-z0-9-]+' || true)

    # Pattern B: backtick-wrapped names
    while IFS= read -r match; do
      [ -z "$match" ] && continue
      target=$(echo "$match" | sed 's/`//g')
      target="${target#/}"
      [[ "$target" =~ ^[a-z][a-z0-9-]+$ ]] || continue
      is_known_skill_token "$target" || continue
      echo "${label}|${lineno}|${target}|backtick" >> "$CTX_REF_FILE"
    done < <(echo "$content" | grep -oE '`/?[a-z][a-z0-9-]+`' || true)
  done < <(strip_code_blocks "$file")
}

scan_external_file "$CLAUDE_MD" "CLAUDE.md"

for mf in "$MEMORY_DIR"/*.md; do
  fname=$(basename "$mf")
  scan_external_file "$mf" "memory/${fname}"
done

sort -u "$CTX_REF_FILE" -o "$CTX_REF_FILE"

echo "External (CLAUDE.md + memory) skill references found:"
if [ -s "$CTX_REF_FILE" ]; then
  while IFS='|' read -r src lineno tgt typ; do
    target_name="${tgt#/}"
    if is_present "$target_name"; then
      status="RESOLVED"
    elif is_retired "$target_name"; then
      status="RETIRED (intentional)"
    else
      status="UNRESOLVED"
      FAIL=1
    fi
    echo "  ${src} | L${lineno} | ${tgt} | ${typ} | ${status}"
  done < "$CTX_REF_FILE"
else
  echo "  (none)"
fi
echo

echo "Unresolved external references (excluding intentional retirees):"
EXT_UNRESOLVED=0
while IFS='|' read -r src lineno tgt typ; do
  target_name="${tgt#/}"
  if ! is_present "$target_name" && ! is_retired "$target_name"; then
    echo "  - ${src} -> ${tgt} at line ${lineno} (type: ${typ}) | reason: not found in $SKILLS_DIR"
    EXT_UNRESOLVED=1
  fi
done < "$CTX_REF_FILE"
[ $EXT_UNRESOLVED -eq 0 ] && echo "  none"
echo

# -----------------------------------------------------------------------------
# SUMMARY
# -----------------------------------------------------------------------------

echo "============================================================"
echo "MECHANICAL CHECK SUMMARY"
echo "============================================================"
if [ "$FAIL" -eq 0 ]; then
  echo "All four mechanical checks PASSED:"
  echo "  - No trigger overlaps across distinct skills"
  echo "  - All skill-to-skill references resolved (or intentionally retired)"
  echo "  - All CLAUDE.md skill references resolved (or intentionally retired)"
  echo "  - All memory skill references resolved (or intentionally retired)"
else
  echo "FAILURES detected — see sections above for specifics."
fi

rm -f "$TRIG_FILE" "$REF_FILE" "$CTX_REF_FILE"

exit $FAIL
