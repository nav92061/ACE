"use client";

import { useState, type ChangeEvent } from "react";
import { MAX_NOTES_CHARS } from "@/lib/limits";
import { createSet, deleteSet, loadSets, setCounts, type NotesSet } from "@/lib/notes";

const MIN_CHARS = 120;

export function NotesScreen({
  onLaunch,
  onBack,
}: {
  onLaunch: (setId: string) => void;
  onBack: () => void;
}) {
  const [sets, setSets] = useState<NotesSet[]>(() => loadSets());
  const [adding, setAdding] = useState(() => loadSets().length === 0);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const texts = await Promise.all(files.map((f) => f.text()));
    setNotes((prev) => [prev, ...texts].filter((t) => t.trim()).join("\n\n"));
    if (!title.trim()) setTitle(files[0]!.name.replace(/\.[^.]+$/, ""));
    setError(null);
  }

  function save() {
    const body = notes.trim();
    if (body.length < MIN_CHARS) {
      setError("Paste a bit more: at least a few sentences of notes.");
      return;
    }
    if (body.length > MAX_NOTES_CHARS) {
      setError(
        `That's ${body.length.toLocaleString()} characters. Split it into sets under ${MAX_NOTES_CHARS.toLocaleString()}.`,
      );
      return;
    }
    try {
      const set = createSet(title, body);
      onLaunch(set.id);
    } catch {
      setError("Your browser storage is full. Delete an old notes set and try again.");
    }
  }

  function remove(id: string) {
    deleteSet(id);
    setSets(loadSets());
    setConfirmDelete(null);
  }

  return (
    <main className="overlay">
      <article className="pixel-frame card pop wide-card">
        <div className="pixel-inner">
          <p className="kicker">Study mode</p>
          <h2>Your notes</h2>
          <p className="explain">
            Paste notes or study material and launch. Every launch asks 10 questions you haven&apos;t seen
            from those notes. Anything you miss comes back later as a retry opportunity.
          </p>

          {sets.length > 0 ? (
            <ul className="set-list">
              {sets.map((set) => {
                const c = setCounts(set);
                return (
                  <li key={set.id} className="set-card">
                    <div className="set-head">
                      <strong>{set.title}</strong>
                      <span className="set-meta">
                        {set.launches} launch{set.launches === 1 ? "" : "es"} ·{" "}
                        {Math.round(set.notes.length / 1000) || 1}k chars
                      </span>
                    </div>
                    <div className="set-bar" aria-hidden>
                      <span
                        className="mastered"
                        style={{ flexGrow: c.mastered }}
                      />
                      <span className="retry" style={{ flexGrow: c.retry }} />
                      <span className="fresh" style={{ flexGrow: Math.max(c.fresh, c.asked ? 0 : 1) }} />
                    </div>
                    <p className="set-stats">
                      <span className="good">{c.mastered} mastered</span>
                      <span className="warn">{c.retry} to retry</span>
                      <span>{c.asked} asked</span>
                    </p>
                    <div className="mini-row">
                      <button type="button" className="btn-mini go" onClick={() => onLaunch(set.id)}>
                        ▲ Launch
                      </button>
                      {confirmDelete === set.id ? (
                        <button type="button" className="btn-mini danger" onClick={() => remove(set.id)}>
                          Delete for good?
                        </button>
                      ) : (
                        <button type="button" className="btn-mini" onClick={() => setConfirmDelete(set.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {adding ? (
            <div className="notes-form">
              <label className="field-label" htmlFor="notes-title">
                Name
              </label>
              <input
                id="notes-title"
                className="text-input"
                placeholder="e.g. Bio unit 4: cell division"
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
              />
              <label className="field-label" htmlFor="notes-body">
                Notes and materials
              </label>
              <textarea
                id="notes-body"
                className="text-input notes-area"
                placeholder="Paste your notes, a study guide, textbook sections, vocab lists…"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setError(null);
                }}
              />
              <div className="notes-tools">
                <label className="btn-mini file-btn">
                  Add .txt / .md file
                  <input type="file" accept=".txt,.md,.markdown,.csv,text/plain" multiple onChange={onFiles} />
                </label>
                <span className="char-count">{notes.trim().length.toLocaleString()} chars</span>
              </div>
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button type="button" className="btn-launch big" onClick={save}>
                Save &amp; launch
              </button>
              {sets.length > 0 ? (
                <button type="button" className="btn-mini wide" onClick={() => setAdding(false)}>
                  Cancel
                </button>
              ) : null}
            </div>
          ) : (
            <button type="button" className="btn-mini wide add-set" onClick={() => setAdding(true)}>
              + New notes set
            </button>
          )}

          <button type="button" className="btn-launch" onClick={onBack}>
            Back
          </button>
        </div>
      </article>
    </main>
  );
}
