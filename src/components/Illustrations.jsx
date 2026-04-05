import { useState, useEffect } from "react";
import { getAllIllustrations, createIllustration, deleteIllustration } from "../db/database";
import { tryParse } from "../utils";
import DeleteButton from "./DeleteButton";

const TYPES = ["all", "personal", "historical", "biblical", "hypothetical"];

export default function Illustrations() {
  const [illustrations, setIllustrations] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newIll, setNewIll] = useState({ type: "personal", text: "", tags: "" });
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await getAllIllustrations();
      setIllustrations(data.map((i) => ({
        ...i,
        tags: tryParse(i.tags, []),
        used_in: tryParse(i.used_in, []),
      })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = illustrations.filter((ill) => {
    if (filter !== "all" && ill.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        ill.text?.toLowerCase().includes(q) ||
        ill.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  async function handleAdd() {
    if (!newIll.text.trim()) return;
    const tags = newIll.tags.split(",").map((t) => t.trim()).filter(Boolean);
    await createIllustration({ ...newIll, tags });
    setNewIll({ type: "personal", text: "", tags: "" });
    setShowAdd(false);
    load();
  }

  async function handleDelete(id) {
    await deleteIllustration(id);
    load();
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="page-title">Illustrations</h1>
            <p className="page-subtitle">{illustrations.length} in your library</p>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Cancel" : "+ Add Illustration"}
          </button>
        </div>
      </div>

      <div className="page-body">
        {showAdd && (
          <div className="card" style={{ marginBottom: "20px" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", marginBottom: "16px" }}>New Illustration</h3>
            <div className="field-group">
              <label className="field-label">Type</label>
              <select
                className="field-input"
                value={newIll.type}
                onChange={(e) => setNewIll((p) => ({ ...p, type: e.target.value }))}
              >
                {["personal", "historical", "biblical", "hypothetical"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Text</label>
              <textarea
                className="field-textarea large"
                value={newIll.text}
                onChange={(e) => setNewIll((p) => ({ ...p, text: e.target.value }))}
                placeholder="Enter the illustration text…"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Tags (comma-separated)</label>
              <input
                className="field-input"
                value={newIll.tags}
                onChange={(e) => setNewIll((p) => ({ ...p, tags: e.target.value }))}
                placeholder="grace, Philippians, suffering…"
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn-primary" onClick={handleAdd}>Save</button>
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-ghost)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            placeholder="Search illustrations and tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-row">
          {TYPES.map((t) => (
            <button
              key={t}
              className={`filter-btn ${filter === t ? "active" : ""}`}
              onClick={() => setFilter(t)}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "var(--ink-ghost)", fontStyle: "italic", padding: "40px 0", textAlign: "center" }}>
            No illustrations found.
          </div>
        ) : (
          filtered.map((ill) => (
            <div key={ill.id} className="illustration-card">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div className="illustration-type">{ill.type}</div>
                <DeleteButton small onDelete={() => handleDelete(ill.id)} />
              </div>
              <div className="illustration-text">{ill.text}</div>
              {ill.tags.length > 0 && (
                <div className="illustration-tags">
                  {ill.tags.map((tag, i) => (
                    <span key={i} className="tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
