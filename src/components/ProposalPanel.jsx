// AI proposal panel — Mutation Contract clauses #1 and #2.
//
// AI-generated content is shown here as a *proposal* in a slot separate from
// the user's field. The user's typed content is never touched until they
// explicitly click "Use this." Discard is one click; rejection is the default.
//
// See docs/CORE.md "The Framework" → Mutation Contract for the rule this enforces.

import PrimaryButton from "./primitives/PrimaryButton";
import SecondaryButton from "./primitives/SecondaryButton";

export default function ProposalPanel({
  loading,
  proposal,
  onAccept,
  onDiscard,
  label = "AI proposes",
  acceptLabel = "Use this",
}) {
  if (!loading && !proposal) return null;

  return (
    <div
      style={{
        marginTop: "8px",
        background: "var(--parchment-warm)",
        border: "1px solid var(--parchment-deep)",
        borderLeft: "3px solid var(--gold)",
        borderRadius: "6px",
        padding: "10px 14px",
        fontFamily: "var(--font-serif)",
        fontSize: "14px",
        color: "var(--ink-mid)",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-ghost)",
          marginBottom: "6px",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      {loading && !proposal ? (
        <div className="ai-loading" style={{ padding: "4px 0" }}>
          <div className="ai-loading-dot" /><div className="ai-loading-dot" /><div className="ai-loading-dot" />
        </div>
      ) : (
        <>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.5", marginBottom: "10px" }}>
            {proposal}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <PrimaryButton
              size="sm"
              style={{ fontSize: "12px" }}
              onClick={onAccept}
            >
              {acceptLabel}
            </PrimaryButton>
            <SecondaryButton
              size="sm"
              style={{ fontSize: "12px" }}
              onClick={onDiscard}
            >
              Discard
            </SecondaryButton>
          </div>
        </>
      )}
    </div>
  );
}
