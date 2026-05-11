// Collapsible — shared parchment-warm panel with clickable header + chevron.
//
// Used by ManuscriptReview. Controlled component: parent
// owns open/close state via `open` + `onToggle`. Children render in the
// expanded body when `open` is true.

const ROOT_STYLE = {
  background: "var(--parchment-warm)",
  border: "1px solid var(--parchment-deep)",
  borderRadius: "var(--radius)",
};

const HEADER_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 14px",
  cursor: "pointer",
  userSelect: "none",
};

const LABEL_STYLE = {
  fontFamily: "var(--font-serif)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-ghost)",
};

const CHEVRON_STYLE = (open) => ({
  transform: open ? "rotate(180deg)" : "rotate(0deg)",
  transition: "transform 0.2s ease",
  color: "var(--ink-ghost)",
});

export default function Collapsible({ label, open, onToggle, bodyStyle, children }) {
  return (
    <div style={ROOT_STYLE}>
      <div onClick={onToggle} style={HEADER_STYLE}>
        <span style={LABEL_STYLE}>{label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={CHEVRON_STYLE(open)}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && <div style={bodyStyle}>{children}</div>}
    </div>
  );
}
