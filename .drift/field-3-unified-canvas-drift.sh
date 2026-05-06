#!/usr/bin/env bash
# Field 3 unified-canvas drift sweep.
#
# Targets two docs that were NOT touched in Sprint 2's doc rewrite but
# reference Field 3 (Divisions / Thought Units) in places. The canonical
# post-rewrite shape is at commit 73fa7d9 (SFDI working doc rewrite).
#
# Anchor: Sprint 2 (2026-05-05 -> 2026-05-06) collapsed three legacy Field 3
# questions (sentence_layout / paraphrases / thought_units) into one
# unified-canvas question. ParaphraseBlocks component retired. Spotlight
# dispatch kind for Field 3 is now `unified-canvas` (was three kinds:
# canvas + paraphrase + synthesis-table). Composite gate is now per-row,
# single-question (main+modifier presence + paraphrase per main row +
# thought_unit_end marker on >=1 main row).

set -u
FAIL=0
TARGETS=(
  "docs/SYSTEMS/sermon-workspace.md"
  "docs/PROPOSALS/sfdi-charter.md"
)

for f in "${TARGETS[@]}"; do
  if [ ! -f "$f" ]; then
    echo "MISSING: $f"
    FAIL=1
  fi
done

echo
echo "=== C1: Legacy three-question key names (sentence_layout / main_sentence_id) ==="
hits=$(grep -nE 'sentence_layout|main_sentence_id' "${TARGETS[@]}" 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "$hits"
  FAIL=1
else
  echo "none"
fi

echo
echo "=== C2: ParaphraseBlocks component reference (retired Sprint 2 Session 2) ==="
hits=$(grep -nE 'ParaphraseBlocks' "${TARGETS[@]}" 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "$hits"
  FAIL=1
else
  echo "none"
fi

echo
echo "=== C3: Field 3 dispatch as kind=paraphrase (now unified-canvas) ==="
hits=$(grep -nE 'kind=paraphrase|kind: *"paraphrase"|kind=canvas[^-]' "${TARGETS[@]}" 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "$hits"
  FAIL=1
else
  echo "none"
fi

echo
echo "=== C4: Field 3 composite gate described as Q1+Q2+Q3 ==="
hits=$(grep -niE 'Q1 canvas|Q2 paraphras|Q3 thought.unit|three.question composite|three structured-exercise' "${TARGETS[@]}" 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "$hits"
  FAIL=1
else
  echo "none"
fi

echo
echo "=== C5: 'three questions' / 'three sub-shapes' descriptions applied to Field 3 ==="
hits=$(grep -niE 'three (questions|sub-?shapes|structured-exercise)' "${TARGETS[@]}" 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "$hits"
  FAIL=1
else
  echo "none"
fi

echo
echo "=== C6: Field 3 referred to as 3-question shape with explicit count ==="
hits=$(grep -niE 'Field (3|4).{0,80}three' "${TARGETS[@]}" 2>/dev/null || true)
if [ -n "$hits" ]; then
  echo "$hits"
  FAIL=1
else
  echo "none"
fi

exit $FAIL
