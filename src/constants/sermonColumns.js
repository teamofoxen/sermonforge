// Re-export shim. The canonical SERMON_COLUMNS list now lives in
// `src/core/contracts.ts`; this file is preserved only to keep existing
// imports compiling. New code should import from `../core/contracts` directly.
export { SERMON_COLUMNS, pickSermonColumns } from "../core/contracts";
