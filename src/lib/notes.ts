import { sameQuestion } from "./dedupe";
import { MAX_RETRIES_PER_RUN, RUN_LENGTH } from "./limits";
import type { Problem } from "./types";

/**
 * A question's life in a notes set:
 * new -> shown on a launch -> mastered (right) or retry (wrong or abandoned).
 * Retry questions come back on later launches until they're answered right.
 * Nothing that was shown ever comes back as "new".
 */
export type PoolStatus = "new" | "retry" | "mastered";

export interface PoolItem {
  problem: Problem;
  status: PoolStatus;
  asked: number;
  wrong: number;
  lastAt: number;
}

export interface NotesSet {
  id: string;
  title: string;
  notes: string;
  createdAt: number;
  pool: PoolItem[];
  launches: number;
}

const KEY = "ace-notes-sets";

export function loadSets(): NotesSet[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as NotesSet[]) : [];
  } catch {
    return [];
  }
}

/** Throws when browser storage is full, so callers can tell the player. */
function saveSets(sets: NotesSet[]) {
  localStorage.setItem(KEY, JSON.stringify(sets));
}

export function getSet(id: string) {
  return loadSets().find((s) => s.id === id) ?? null;
}

function updateSet(id: string, fn: (set: NotesSet) => void) {
  const sets = loadSets();
  const set = sets.find((s) => s.id === id);
  if (!set) return null;
  fn(set);
  saveSets(sets);
  return set;
}

export function createSet(title: string, notes: string): NotesSet {
  const set: NotesSet = {
    id: `set-${Date.now().toString(36)}`,
    title: title.trim() || "My notes",
    notes,
    createdAt: Date.now(),
    pool: [],
    launches: 0,
  };
  saveSets([set, ...loadSets()]);
  return set;
}

export function deleteSet(id: string) {
  saveSets(loadSets().filter((s) => s.id !== id));
}

export function setCounts(set: NotesSet) {
  let asked = 0;
  let mastered = 0;
  let retry = 0;
  let fresh = 0;
  for (const item of set.pool) {
    if (item.status === "new") fresh += 1;
    else asked += 1;
    if (item.status === "mastered") mastered += 1;
    if (item.status === "retry") retry += 1;
  }
  return { asked, mastered, retry, fresh };
}

/** Every question this set has seen or holds, for the no-repeat list. */
export function knownQuestions(set: NotesSet) {
  return set.pool.map((p) => p.problem.prompt.map((part) => part.value).join(" "));
}

export function addToPool(id: string, problems: Problem[]) {
  let added = 0;
  updateSet(id, (set) => {
    const known = knownQuestions(set);
    for (const problem of problems) {
      const text = problem.prompt.map((p) => p.value).join(" ");
      if (set.pool.some((p) => p.problem.id === problem.id)) continue;
      if (known.some((k) => sameQuestion(k, text))) continue;
      set.pool.push({ problem, status: "new", asked: 0, wrong: 0, lastAt: 0 });
      known.push(text);
      added += 1;
    }
  });
  return added;
}

function shuffleChoices(problem: Problem): Problem {
  if (problem.type !== "mc" || !problem.choices) return problem;
  return { ...problem, choices: [...problem.choices].sort(() => Math.random() - 0.5) };
}

const RANK = { easy: 0, medium: 1, hard: 2, rare: 3 } as const;

/**
 * Pick a launch: missed questions first (oldest miss first, up to the cap),
 * then fresh ones. Returns how many fresh questions are still missing.
 */
export function planLaunch(set: NotesSet) {
  const retries = set.pool
    .filter((p) => p.status === "retry")
    .sort((a, b) => a.lastAt - b.lastAt)
    .slice(0, MAX_RETRIES_PER_RUN);
  const fresh = set.pool.filter((p) => p.status === "new").slice(0, RUN_LENGTH - retries.length);
  return { retries, fresh, missing: RUN_LENGTH - retries.length - fresh.length };
}

/**
 * Final question list once generation is done. If the notes ran dry,
 * extra missed questions fill the gaps beyond the usual cap.
 */
export function assembleLaunch(set: NotesSet) {
  const plan = planLaunch(set);
  let retries = plan.retries;
  if (plan.missing > 0) {
    retries = set.pool
      .filter((p) => p.status === "retry")
      .sort((a, b) => a.lastAt - b.lastAt)
      .slice(0, RUN_LENGTH - plan.fresh.length);
  }
  const items = [
    ...retries.map((p) => ({ problem: shuffleChoices(p.problem), retry: true })),
    ...plan.fresh.map((p) => ({ problem: p.problem, retry: false })),
  ].sort((a, b) => RANK[a.problem.difficulty] - RANK[b.problem.difficulty]);
  return {
    problems: items.map((i) => i.problem),
    retryIds: items.filter((i) => i.retry).map((i) => i.problem.id),
  };
}

export function markLaunched(id: string) {
  updateSet(id, (set) => {
    set.launches += 1;
  });
}

/** Called when a question appears. If the player leaves now, it counts as missed. */
export function markShown(id: string, problemId: string) {
  updateSet(id, (set) => {
    const item = set.pool.find((p) => p.problem.id === problemId);
    if (!item) return;
    if (item.status === "new") item.status = "retry";
    item.lastAt = Date.now();
  });
}

export function markAnswered(id: string, problemId: string, correct: boolean) {
  updateSet(id, (set) => {
    const item = set.pool.find((p) => p.problem.id === problemId);
    if (!item) return;
    item.asked += 1;
    item.lastAt = Date.now();
    if (correct) item.status = "mastered";
    else {
      item.status = "retry";
      item.wrong += 1;
    }
  });
}

export class GenerateError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Ask the server for new questions that avoid everything this set has seen. */
export async function generateFor(set: NotesSet, count: number): Promise<Problem[]> {
  let res: Response;
  try {
    res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: set.title,
        notes: set.notes,
        count,
        avoid: knownQuestions(set).slice(-600),
      }),
    });
  } catch {
    throw new GenerateError("network", "Couldn't reach the question generator. Is the dev server running?");
  }
  const data = (await res.json().catch(() => ({}))) as {
    questions?: Problem[];
    error?: string;
    message?: string;
  };
  if (!res.ok || !data.questions) {
    throw new GenerateError(data.error ?? "unknown", data.message ?? "Question generation failed.");
  }
  return data.questions;
}
