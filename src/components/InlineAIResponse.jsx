import { useState } from "react";

/**
 * InlineAIResponse — appears directly below the field that triggered an AI request.
 * Replaces in-place if the same field is analyzed again (parent manages state by key).
 *
 * Props:
 *   fieldName  — label shown in header, e.g. "Observations"
 *   response   — AI response string (null/empty → hidden unless loading)
 *   loading    — boolean: show loading dots instead of text
 *   onDismiss  — callback to clear the response
 */
export default function InlineAIResponse({ fieldName, response, loading, onDismiss }) {
  if (!response && !loading) return null;

  return (
    <div className="inline-ai-response">
      <div className="inline-ai-label">AI · {fieldName}</div>
      {loading ? (
        <div className="ai-loading" style={{ padding: "6px 0" }}>
          <div className="ai-loading-dot" />
          <div className="ai-loading-dot" />
          <div className="ai-loading-dot" />
        </div>
      ) : (
        <>
          <div className="inline-ai-text">{response}</div>
          <div className="inline-ai-actions">
            <InlineCopyButton text={response} />
            <button className="inline-ai-dismiss" onClick={onDismiss}>✕ Dismiss</button>
          </div>
        </>
      )}
    </div>
  );
}

function InlineCopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="inline-ai-copy"
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
      }
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}
