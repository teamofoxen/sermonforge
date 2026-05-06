# scripts/archive

Scripts that served a finished initiative and are kept here as historical reference, not run by default.

## Contents

- **`sfdi-cross-doc-consistency.py`** — Verified SFDI completion state was consistent across nine related surfaces (SFDI working doc, CORE.md, SPRD planning doc, SFDI charter, SFDI vision sheet, sermon-workspace doc, CHANGELOG, MEMORY index, SPRD/SFDI state memory). Pulled weight during the four-sub-phase walks (2026-05-02 to 2026-05-04). **Currently fails** four criteria (C2 / C3 / C4 / C6) because expectations are tied to the pre-trim SPRD planning doc (579 lines → 110 lines on 2026-05-05) and to the hardcoded ratification date 2026-05-04 (now superseded by 2026-05-05–06 ship dates and the unified-canvas refactor). Reviving requires updating C2 (vocabulary doc placement), C3 (8+8+5+4 field-count check moves to SFDI), C4 (hardcoded date → date-range or current canonical), and C6 (backlog items shipped — drop or repoint to follow-up work). The internal-consistency validator was un-archived 2026-05-06 once the SFDI Field 3 unified-canvas rewrite passed it cleanly.

## When to revive

Open a session that edits `docs/PROPOSALS/study-field-definition-initiative.md` substantively (renames, reshape, adding fields). The internal-consistency validator at `scripts/sfdi-internal-consistency.py` is the live one; run before and after the edit. The cross-doc validator stays archived until its expectations are updated against the trimmed SPRD shape.
