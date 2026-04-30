// Re-export shim. The canonical DeleteButton (Mutation Contract #4 structural
// primitive) now lives in `src/components/primitives/DeleteButton.jsx`; this
// file is preserved only so existing imports keep compiling. New code should
// import from `./primitives/DeleteButton` directly.
export { default } from "./primitives/DeleteButton";
