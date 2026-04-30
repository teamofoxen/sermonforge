// Mutation Contract #5 (docs/CORE.md): errors speak in one voice.
//
// Canonical inline error display for field-level / surface-level failures.
// For persistent retryable top-level failures (e.g. disk write failed) use
// the App.jsx `.write-error-banner` pattern instead.
//
// Conventions:
//   - User language only. Never references env files, console, or shell paths.
//   - Optional Retry callback shows a small inline Retry button.
//   - Optional onDismiss callback shows a small × dismiss button.
//   - Renders nothing when `children` is empty / nullish.

export default function InlineError({ children, onRetry, onDismiss, style }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      style={{
        padding: "8px 12px",
        background: "var(--parchment-warm)",
        border: "1px solid var(--parchment-deep)",
        borderLeft: "3px solid var(--crimson-soft)",
        borderRadius: "6px",
        color: "var(--crimson-soft)",
        fontFamily: "'Crimson Pro', serif",
        fontSize: "13px",
        lineHeight: "1.4",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        ...style,
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {onRetry && (
        <button
          className="btn-ghost btn-sm"
          style={{ fontSize: "12px", padding: "2px 8px", flexShrink: 0 }}
          onClick={onRetry}
        >
          Retry
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-ghost)",
            fontSize: "16px",
            lineHeight: 1,
            padding: 0,
            flexShrink: 0,
          }}
        >×</button>
      )}
    </div>
  );
}
