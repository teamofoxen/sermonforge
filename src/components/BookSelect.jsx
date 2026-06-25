import { BOOKS, GENRES } from "../data/canonicalBooks";

// The canonical genre-grouped book picker. The option list (— Select book — plus
// the Dever-genre optgroups) lives here once, shared by the New Series modal and
// the Outline's Book details so the two can't drift. AI-free — a plain dropdown
// over the bundled reference module.
export default function BookSelect({ id, value, onChange, className = "field-input", autoFocus = false }) {
  return (
    <select id={id} className={className} value={value} onChange={onChange} autoFocus={autoFocus}>
      <option value="">— Select book —</option>
      {Object.entries(GENRES).map(([genreKey, genreLabel]) => (
        <optgroup key={genreKey} label={genreLabel}>
          {BOOKS.filter((b) => b.genre === genreKey).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
