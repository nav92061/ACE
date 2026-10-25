import { applyStreak } from "./daily";
import type { FlightRecord, ProblemStats, StreakState } from "./types";

const DAILY = "ace-daily-flight";
const HISTORY = "ace-flight-history";
const STREAK = "ace-streak";
const SOUND = "ace-sound";
const STATS = "ace-problem-stats";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadDaily(): FlightRecord | null {
  return read<FlightRecord | null>(DAILY, null);
}

export function saveDaily(flight: FlightRecord) {
  write(DAILY, flight);
}

export function loadHistory(): FlightRecord[] {
  return read<FlightRecord[]>(HISTORY, []);
}

export function saveHistory(rows: FlightRecord[]) {
  write(HISTORY, rows.slice(0, 40));
}

export function loadStreak(): StreakState {
  return read<StreakState>(STREAK, { count: 0, lastDate: null, graceWeek: null });
}

export function finishDaily(flight: FlightRecord): StreakState {
  saveDaily(flight);
  const history = [flight, ...loadHistory().filter((h) => h.date !== flight.date)];
  saveHistory(history);
  const next = applyStreak(loadStreak(), flight.date);
  write(STREAK, next);
  return next;
}

export function loadSound(): boolean {
  return read<boolean>(SOUND, false);
}

export function saveSound(on: boolean) {
  write(SOUND, on);
}

export function loadStats(): Record<string, ProblemStats> {
  return read<Record<string, ProblemStats>>(STATS, {});
}

export function recordAttempt(problemId: string, correct: boolean) {
  const all = loadStats();
  const cur = all[problemId] ?? { attempts: 0, correct: 0 };
  cur.attempts += 1;
  if (correct) cur.correct += 1;
  all[problemId] = cur;
  write(STATS, all);
}
