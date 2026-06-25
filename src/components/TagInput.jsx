import { useState, useId } from "react";
import IconButton from "./primitives/IconButton";

// TagInput — a free-form, sermon-level topic tag field (Coverage Initiative,
// Phase 3). Renders the tags already on the sermon as removable chips plus a
// text field whose native <datalist> offers the pastor's OWN existing tags as
// they type. That autocomplete is the anti-drift mechanism — it surfaces the
// pastor's vocabulary back so "money" / "finances" / "stewardship" don't
// fragment — and it is NOT AI suggestion (the app is AI-free; the suggestions
// are only prior tags the pastor typed). Tagging is optional + partial.
//
// Commit a tag with Enter or comma, or by blurring a non-empty field (so a tag
// typed at the moment of prep is never silently lost). Backspace on an empty
// field removes the last chip.
export default function TagInput({ tags = [], suggestions = [], onChange }) {
  const [draft, setDraft] = useState("");
  const listId = useId();

  function addTag(raw) {
    const t = (raw || "").trim();
    setDraft("");
    if (!t) return;
    // Case-insensitive de-dupe — picking "Prayer" when "prayer" is already on
    // the sermon is a no-op rather than a near-duplicate chip.
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    onChange([...tags, t]);
  }
  function removeTag(t) {
    onChange(tags.filter((x) => x !== t));
  }
  function onKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  }

  // Suggest only tags not already on this sermon.
  const remaining = suggestions.filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()));

  const chipStyle = {
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: "2px 4px 2px 8px", borderRadius: "10px",
    background: "var(--parchment-deep)", color: "var(--ink)",
    fontSize: "12px", lineHeight: 1.4, whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", flex: 1, minWidth: 0 }}>
      {tags.map((t) => (
        <span key={t} style={chipStyle}>
          {t}
          <IconButton
            aria-label={`Remove topic ${t}`}
            title={`Remove ${t}`}
            onClick={() => removeTag(t)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", fontSize: "13px", lineHeight: 1, padding: "0 2px" }}
          >
            ×
          </IconButton>
        </span>
      ))}
      <input
        list={listId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={tags.length ? "Add another topic" : "Add a topic — e.g. money, prayer, suffering"}
        aria-label="Add a topic tag"
        style={{
          flex: "1 1 140px", minWidth: "120px", border: "none", background: "transparent",
          fontSize: "13px", color: "var(--ink)", padding: "3px 2px", outline: "none",
        }}
      />
      <datalist id={listId}>
        {remaining.map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}
