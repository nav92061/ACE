import type { AnswerRecord, FlightMode } from "./types";

/** One finished launch, kept for the best attempts board. */
export interface LaunchRecord {
  id: string;
  at: number;
  mode: FlightMode;
  label: string;
  points: number;
  altitude: number;
  correct: number;
  total: number;
  avgSeconds: number;
  fastest: number | null;
  bestCombo: number;
  retries: number;
  retriesCleared: number;
}

const KEY = "ace-launches";

export function loadLaunches(): LaunchRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LaunchRecord[]) : [];
  } catch {
    return [];
  }
}

export function recordLaunch(opts: {
  mode: FlightMode;
  label: string;
  altitude: number;
  answers: AnswerRecord[];
}): LaunchRecord {
  const { answers } = opts;
  let combo = 0;
  let bestCombo = 0;
  for (const a of answers) {
    combo = a.correct ? combo + 1 : 0;
    bestCombo = Math.max(bestCombo, combo);
  }
  const right = answers.filter((a) => a.correct);
  const record: LaunchRecord = {
    id: `l-${Date.now().toString(36)}`,
    at: Date.now(),
    mode: opts.mode,
    label: opts.label,
    points: answers.reduce((s, a) => s + (a.points ?? 0), 0),
    altitude: opts.altitude,
    correct: right.length,
    total: answers.length,
    avgSeconds: answers.length ? answers.reduce((s, a) => s + a.seconds, 0) / answers.length : 0,
    fastest: right.length ? Math.min(...right.map((a) => a.seconds)) : null,
    bestCombo,
    retries: answers.filter((a) => a.retry).length,
    retriesCleared: answers.filter((a) => a.retry && a.correct).length,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify([record, ...loadLaunches()].slice(0, 500)));
  } catch {
    /* storage full: the board just won't include this launch */
  }
  return record;
}

export function boardSummary(rows: LaunchRecord[]) {
  const questions = rows.reduce((s, r) => s + r.total, 0);
  const correct = rows.reduce((s, r) => s + r.correct, 0);
  const seconds = rows.reduce((s, r) => s + r.avgSeconds * r.total, 0);
  const fastest = rows.map((r) => r.fastest).filter((f): f is number => f !== null);
  return {
    launches: rows.length,
    questions,
    accuracy: questions ? correct / questions : 0,
    avgSeconds: questions ? seconds / questions : 0,
    bestPoints: rows.reduce((m, r) => Math.max(m, r.points), 0),
    bestAltitude: rows.reduce((m, r) => Math.max(m, r.altitude), 0),
    bestCombo: rows.reduce((m, r) => Math.max(m, r.bestCombo), 0),
    fastest: fastest.length ? Math.min(...fastest) : null,
    retries: rows.reduce((s, r) => s + r.retries, 0),
    retriesCleared: rows.reduce((s, r) => s + r.retriesCleared, 0),
    totalPoints: rows.reduce((s, r) => s + r.points, 0),
  };
}

/** Is this the best score so far in its mode? */
export function isPersonalBest(record: LaunchRecord, rows: LaunchRecord[]) {
  return rows.every((r) => r.id === record.id || r.points < record.points);
}
