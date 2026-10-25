import type { StreakState } from "./types";

/** First public set. Set numbers count UTC midnights from this date. */
export const LAUNCH_EPOCH_MS = Date.UTC(2026, 0, 1);

export function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function setNumberFor(d = new Date()): number {
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const days = Math.floor((midnight - LAUNCH_EPOCH_MS) / 86_400_000);
  return days + 1;
}

export function msUntilNextSet(now = Date.now()): number {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return Math.max(0, next - now);
}

export function formatCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function isoWeekId(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  const target = new Date(d);
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(target.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((target.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function daysBetween(earlier: string, later: string): number {
  const a = Date.parse(`${earlier}T00:00:00Z`);
  const b = Date.parse(`${later}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** One missed day per ISO week still continues the streak. */
export function applyStreak(prev: StreakState, date: string): StreakState {
  if (prev.lastDate === date) return prev;
  if (!prev.lastDate) return { count: 1, lastDate: date, graceWeek: null };
  const gap = daysBetween(prev.lastDate, date);
  if (gap <= 0) return { count: 1, lastDate: date, graceWeek: prev.graceWeek };
  if (gap === 1) {
    return { count: prev.count + 1, lastDate: date, graceWeek: prev.graceWeek };
  }
  if (gap === 2) {
    const week = isoWeekId(date);
    if (prev.graceWeek !== week) {
      return { count: prev.count + 1, lastDate: date, graceWeek: week };
    }
  }
  return { count: 1, lastDate: date, graceWeek: prev.graceWeek };
}
