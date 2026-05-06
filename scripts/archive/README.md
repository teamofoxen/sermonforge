# scripts/archive

Scripts that served a finished initiative and are kept here as historical reference, not run by default.

## Contents

- **`sfdi-internal-consistency.py`** — Verified the SFDI working doc against seven internal-shape criteria (seven-slot completeness, connects-chain integrity, named outcomes per phase, handoff sections per boundary, cumulative-table column claims, PC progression markers, heavy-lifting overviews). Pulled weight during the four-sub-phase walks (2026-05-02 to 2026-05-04). SFDI walks completed 2026-05-04; the structural shape locked 2026-05-05. Idle now. If SFDI is reopened for refinement, run from this path before editing.

- **`sfdi-cross-doc-consistency.py`** — Verified the SFDI completion state was consistent across nine related surfaces (SFDI working doc, CORE.md, SPRD planning doc, SFDI charter, SFDI vision sheet, sermon-workspace doc, CHANGELOG, MEMORY index, SPRD/SFDI state memory). Same lifecycle as the internal validator. **Note:** references `sfdi-throughline-vision.md` which was merged into `sfdi-charter.md` 2026-05-05; if revived, the `vision` entry in the `DOCS` dict needs updating.

## When to revive

Open a session that edits `docs/PROPOSALS/study-field-definition-initiative.md` substantively (renames, reshape, adding fields). Run both validators before and after the edit to catch drift. If the changes are durable, consider moving the validators back to `scripts/`.
