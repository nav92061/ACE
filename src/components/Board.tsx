"use client";

import { useState } from "react";
import { boardSummary, loadLaunches, type LaunchRecord } from "@/lib/board";
import { loadSets, setCounts } from "@/lib/notes";
import type { FlightMode } from "@/lib/types";

const FILTERS: { id: "all" | FlightMode; label: string }[] = [
  { id: "all", label: "All" },
  { id: "notes", label: "Notes" },
  { id: "daily", label: "Daily" },
  { id: "unlimited", label: "Unlimited" },
  { id: "practice", label: "Practice" },
];

function when(at: number) {
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

export function Board({ onBack, highlight }: { onBack: () => void; highlight?: string }) {
  const [rows] = useState<LaunchRecord[]>(() => loadLaunches());
  const [sets] = useState(() => loadSets());
  const [filter, setFilter] = useState<"all" | FlightMode>("all");
  const shown = filter === "all" ? rows : rows.filter((r) => r.mode === filter);
  const sum = boardSummary(shown);
  const best = [...shown].sort((a, b) => b.points - a.points || b.altitude - a.altitude).slice(0, 10);

  const tiles: [string, string][] = [
    ["Launches", String(sum.launches)],
    ["Best score", sum.bestPoints.toLocaleString()],
    ["Highest", `${sum.bestAltitude} km`],
    ["Accuracy", sum.questions ? pct(sum.accuracy) : "–"],
    ["Avg answer", sum.questions ? `${sum.avgSeconds.toFixed(1)}s` : "–"],
    ["Fastest right", sum.fastest !== null ? `${sum.fastest.toFixed(1)}s` : "–"],
    ["Best combo", `x${sum.bestCombo}`],
    ["Retries cleared", `${sum.retriesCleared}/${sum.retries}`],
  ];

  return (
    <main className="overlay">
      <article className="pixel-frame card pop wide-card">
        <div className="pixel-inner">
          <p className="kicker">Pilot record</p>
          <h2>Best attempts</h2>
          <div className="chip-row" role="tablist" aria-label="Filter launches">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                className={`chip${filter === f.id ? " on" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="explain">No finished launches here yet. Fly one and it shows up on this board.</p>
          ) : (
            <>
              <div className="stat-grid">
                {tiles.map(([label, value]) => (
                  <div key={label} className="stat-tile">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <p className="board-total">
                {sum.totalPoints.toLocaleString()} points across {sum.questions} questions
              </p>

              <h3 className="board-h">Top launches</h3>
              <ol className="board-list">
                {best.map((r, i) => (
                  <li key={r.id} className={r.id === highlight ? "me" : undefined}>
                    <span className={`rank r${i + 1}`}>{i + 1}</span>
                    <span className="board-main">
                      <strong>{r.points.toLocaleString()} pts</strong>
                      <small>
                        {r.label} · {when(r.at)}
                      </small>
                    </span>
                    <span className="board-side">
                      <span>{r.altitude} km</span>
                      <small>
                        {r.correct}/{r.total} · {r.avgSeconds.toFixed(1)}s
                      </small>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {sets.length > 0 && (filter === "all" || filter === "notes") ? (
            <>
              <h3 className="board-h">Notes mastery</h3>
              <ul className="mastery-list">
                {sets.map((set) => {
                  const c = setCounts(set);
                  return (
                    <li key={set.id}>
                      <span className="mastery-name">{set.title}</span>
                      <span className="set-bar" aria-hidden>
                        <span className="mastered" style={{ flexGrow: c.mastered }} />
                        <span className="retry" style={{ flexGrow: c.retry }} />
                        <span className="fresh" style={{ flexGrow: c.asked ? 0 : 1 }} />
                      </span>
                      <small>
                        {c.mastered} mastered · {c.retry} to retry
                      </small>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          <button type="button" className="btn-launch" onClick={onBack}>
            Back
          </button>
        </div>
      </article>
    </main>
  );
}
