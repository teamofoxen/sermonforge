#!/usr/bin/env bash
# Drift sweep: post-ARI / post-BTI Phase 1.5 doc consistency
# One-off audit, 2026-05-09.
#
# Convention:
#   - Scans docs/ + CLAUDE.md.
#   - Excludes intentional historical refs in:
#       * docs/PROPOSALS/ai-removal-initiative.md (the ARI charter itself)
#       * docs/ARCHIVE/* (historical by definition)
#       * Lines explicitly tagged "Pre-ARI" or "ARI Phase ... (2026-05-09):"
#   - Each criterion prints its label + matches. Sets FAIL=1 on any hit.
#   - Exit 0 only when every criterion is clean.

set -u
FAIL=0

# Common find/grep scope: tracked docs + CLAUDE.md, excluding ARI charter and ARCHIVE.
SCOPE=(
  CLAUDE.md
  docs/CORE.md
  docs/RULES.md
  docs/ANCHORS.md
  docs/ENFORCEMENT_STATUS.md
  docs/SYSTEMS
  docs/REFERENCE
  docs/PROPOSALS
  docs/handoff
)

# Files with explicit post-ARI banners. Their bodies preserve historical
# reasoning; the banner at the top tells readers AI references in the body
# are historical. We skip these for body-content criteria (4, 7) but still
# enforce broken-reference criteria (1, 2, 3) where appropriate.
BANNER_TAGGED_RE='docs/PROPOSALS/(sfdi-charter|sadi-charter|sermon-anchor-definition-initiative|study-field-definition-initiative|study-phase-redesign|sermon-workspace-tour|sermonforge-field-walkthrough|sermon-workspace-field-walkthrough\.build|dashboard-design-brief|theology-corpus|ai-clarity-and-constraint)\.(md|js)'

# Helper: grep that excludes ARI charter, ARCHIVE/, intentional ARI-tagged
# historical sentences, and markdown blockquote lines (banner block content).
# Args: pattern, [extra grep flags...]
sweep_grep() {
  local pattern="$1"; shift
  grep -rn "$@" -E "$pattern" "${SCOPE[@]}" 2>/dev/null \
    | grep -v "docs/PROPOSALS/ai-removal-initiative.md" \
    | grep -v "docs/PROPOSALS/bti-build-mvp.md" \
    | grep -v "docs/ARCHIVE/" \
    | grep -v -E ':[0-9]+:[[:space:]]*>' \
    | grep -v -i -E "Pre-ARI[: ,.]" \
    | grep -v -i -E "ARI Phase [0-9]+ \(2026-05-09\)" \
    | grep -v -i -E "ARI, 2026-05-09" \
    | grep -v -i -E "ARI \(2026-05-09\)" \
    | grep -v -i -E "post-ARI" \
    | grep -v -i -E "ARI Phase 9 audit" \
    | grep -v -i -E "ARI hanging-chads" \
    | grep -v -i -E "removed when AI was removed" \
    | grep -v -i -E "removed in ARI" \
    | grep -v -i -E "deleted by ARI" \
    | grep -v -i -E "retired by ARI" \
    | grep -v -i -E "ARI Phase [0-9]" \
    | grep -v -i -E "ARI removed" \
    | grep -v -i -E "ARI deleted" \
    | grep -v -i -E "have been removed" \
    | grep -v -i -E "now-deleted" \
    | grep -v -i -E "(\.jsx|\.js|\.md|directory|subsystem|panel) deleted\b" \
    | grep -v -i -E "deleted (the |when ARI |alongside)" \
    | grep -v -i -E "deleted in ARI" \
    | grep -v -i -E "deleted alongside" \
    | grep -v -i -E "AI removed from product" \
    | grep -v -i -E "no longer (exists|exist)" \
    | grep -v -i -E "removed alongside" \
    | grep -v -i -E "ARI rewrite" \
    | grep -v -i -E "rewrote the clause" \
    | grep -v -i -E "ARI took the" \
    | grep -v -i -E "RESOLVED 2026-05-04" \
    | grep -v -i -E "shipped 2026-05-04" \
    | grep -v -i -E "MPT/MPS field def" \
    | grep -v -i -E "is moot now" \
    | grep -v -i -E "Anthropic key handling removed" \
    | grep -v -i -E "AI subsystem deleted" \
    | grep -v -i -E "key handling removed" \
    | grep -v -i -E "AI panel entirely" \
    | grep -v -i -E "originally also mentioned" \
    | grep -v -i -E "ai_proposal.*ai_apply.*mutation cycle" \
    | grep -v -i -E "Pilot C silently introduced" \
    || true
}

# Variant that also skips banner-tagged files entirely.
# Used for body-content criteria (4, 7) where the doc-top banner already
# tells readers the body is historical.
sweep_grep_skip_banner_tagged() {
  sweep_grep "$@" | grep -v -E "$BANNER_TAGGED_RE" || true
}

# A printer that runs sweep_grep, evaluates if anything came out, and updates FAIL.
report() {
  local label="$1"; shift
  local pattern="$1"; shift
  echo "=== $label ==="
  local out
  out=$(sweep_grep "$pattern" "$@")
  if [ -n "$out" ]; then
    printf '%s\n' "$out"
    FAIL=1
  else
    echo "  none"
  fi
  echo ""
}

# Variant for body-content criteria — skips banner-tagged charter docs whose
# top-of-file banners explicitly acknowledge body content as historical.
report_skip_banner_tagged() {
  local label="$1"; shift
  local pattern="$1"; shift
  echo "=== $label (banner-tagged docs excluded) ==="
  local out
  out=$(sweep_grep_skip_banner_tagged "$pattern" "$@")
  if [ -n "$out" ]; then
    printf '%s\n' "$out"
    FAIL=1
  else
    echo "  none"
  fi
  echo ""
}

# ----------------------------------------------------------------------
# Criterion 1 — Broken file references to deleted docs
# ----------------------------------------------------------------------
report "1. References to deleted system docs" \
  '(SYSTEMS/(ai-model-migration|ai-panel|context-pipeline|series-planner)\.md|HOW_AI_WORKS\.md)'

# ----------------------------------------------------------------------
# Criterion 2 — References to deleted source files (as if extant)
# ----------------------------------------------------------------------
report "2a. References to deleted React components" \
  '(AIPanel\.jsx|ProposalPanel\.jsx|InlineAIResponse\.jsx|SeriesPlanner\.jsx|Planning\.jsx|NewSeriesModal\.jsx|DeliveryTab\.jsx)'

report "2b. References to deleted utils / electron AI modules" \
  '(src/utils/(ai|aiSchema|contextBuilder|incorporateHelpers|outlineChat|reviewPrompts|theologyCitation|lastAiCallRegistry|memory)\.(js|test\.js)|electron/ai\.js|electron/ai/provider\.js|src/prompts/|src/constants/contextSchema\.js)'

# ----------------------------------------------------------------------
# Criterion 3 — Stale IPC channel descriptions
# ----------------------------------------------------------------------
report "3a. Removed IPC channels documented as live" \
  '("db-backupMemory"|"db-restoreMemory"|"sermon-export-pmb"|"ai-message"|sendAIMessage)'

report "3b. app-get-key-status / app-save-api-key with Anthropic semantics" \
  '(loadKey\(\)|Anthropic API key|sk-ant-|resetClient|Validates Anthropic|Anthropic key)'

# ----------------------------------------------------------------------
# Criterion 4 — Stale AI-as-current-feature language
# ----------------------------------------------------------------------
report_skip_banner_tagged "4a. AI Panel as live surface" \
  '(\bAI [Pp]anel\b|\bai-panel\b)'

report "4b. Look Around / Look Again as live" \
  '(\bLook [Aa]round\b|\bLook [Aa]gain\b|LookAgainBlock)'

report_skip_banner_tagged "4c. AI authorship verbs as live (Suggest Outline, Generate MPT/MPS/Summary, Review buttons, Flow Coach, Ear Check, Final Tune-Up as AI)" \
  '(Suggest Outline button|Generate MPT|Generate MPS|Generate Summary|Review Outline|Review E/A/I|Flow Coach|Series Coherence Check|Incorporate \(AI|\bai-router\b|AI mediator|AI synthesis|AI affordance|inline AI request|Inline AI request)'

report_skip_banner_tagged "4d. AI proposal/apply cycle described as current Mutation pattern" \
  '(ai_proposal|ai_apply|AiProposal|AiApply|AI proposal cycle|proposal/apply cycle|AI proposals live in a separate slot)'

# ----------------------------------------------------------------------
# Criterion 5 — ESLint no-direct-ai allowlist (no longer exists)
# ----------------------------------------------------------------------
report "5. no-direct-ai rule still describing allowlist" \
  '(no-direct-ai.*provider\.js|no-direct-ai.*src/utils/ai\.js|outside .electron/ai/provider\.js.|outside .src/utils/ai\.js.)'

# ----------------------------------------------------------------------
# Criterion 6 — Memory system references (deleted in ARI Phase 9 audit fix-pass)
# ----------------------------------------------------------------------
report "6. Memory system documented as live" \
  '(localStorage\.sermonforge_memory|memory-backup\.json|backupMemory|restoreMemory|captureMemory|updateMemory|extractOutlinePattern|extractPhrasePatterns|restoreMemoryFromBackup|aiPhrasePatterns|phrasePatterns)'

# ----------------------------------------------------------------------
# Criterion 7 — Stale Mutation #2 / Process #4 / SADI AI clause descriptions
# ----------------------------------------------------------------------
report "7a. Mutation #2 ProposalPanel deferred to Phase 4 (clause is retired)" \
  '(<ProposalPanel>|ProposalPanel.* implemented|primitive-layer generalization completes structural enforcement of "AI proposals)'

report_skip_banner_tagged "7b. AI prompts treated as current commitment (Process #4, SADI principle)" \
  '(AI prompts treat PC|prompt-contract commitment that AI|AI Draft / AI Suggest / AI Tighten|AI clarifies the pastor.s voice|MPS_DRAFT prompt)'

# ----------------------------------------------------------------------
# Criterion 8 — Stale build/distribution refs
# ----------------------------------------------------------------------
report "8. SetupScreen described as Claude+ESV (post-ARI is ESV+telemetry only)" \
  '(Claude \+ ESV keys|first-run API key entry|Anthropic-key first-run|enters their API key once)'

# ----------------------------------------------------------------------
# Final
# ----------------------------------------------------------------------
echo "===================="
if [ $FAIL -eq 0 ]; then
  echo "ALL CRITERIA CLEAN"
else
  echo "DRIFT FOUND — see above"
fi
exit $FAIL
