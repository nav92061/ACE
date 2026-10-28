import { problemById } from "./problems";
import type { AnswerRecord, Problem } from "./types";
import { zoneFor, type Zone } from "./zones";

/** Wrong answers earn 0. A full-speed correct answer adds at most 20%. */
export function altitudeFor(problem: Problem, correct: boolean, seconds: number): number {
  if (!correct) return 0;
  const used = Math.min(60, Math.max(0, seconds));
  const bonus = 0.2 * ((60 - used) / 60);
  return Math.round(problem.base * (1 + bonus));
}

/** Points for getting it right, by difficulty. */
export const ACCURACY_POINTS: Record<Problem["difficulty"], number> = {
  easy: 100,
  medium: 200,
  hard: 300,
  rare: 500,
};

/**
 * Points mix accuracy and speed. A right answer earns its difficulty points,
 * plus up to the same again for speed: instant doubles it, 60 seconds adds nothing.
 * Wrong answers earn 0.
 */
export function pointsFor(problem: Problem, correct: boolean, seconds: number) {
  if (!correct) return { total: 0, accuracy: 0, speed: 0 };
  const accuracy = ACCURACY_POINTS[problem.difficulty];
  const left = (60 - Math.min(60, Math.max(0, seconds))) / 60;
  const speed = Math.round(accuracy * left);
  return { total: accuracy + speed, accuracy, speed };
}

export function runPoints(answers: AnswerRecord[]) {
  return answers.reduce((sum, a) => sum + (a.points ?? 0), 0);
}

export type TierName = Zone["name"] | "Ace";

/** The tier is the zone the flight ended in, unless every answer was right. */
export function tierFor(altitude: number, allCorrect: boolean): { name: TierName; blurb: string } {
  if (allCorrect) return { name: "Ace", blurb: "Every answer right. Clean flight." };
  const zone = zoneFor(Math.max(0, altitude));
  return { name: zone.name, blurb: zone.blurb };
}

export type Square = "green" | "red" | "yellow";

/** Yellow means correct, but with little time left. */
export function squareFor(answer: AnswerRecord): Square {
  if (!answer.correct) return "red";
  if (answer.seconds > 45) return "yellow";
  return "green";
}

export function weakestUnit(answers: AnswerRecord[]): string | null {
  const missed = answers.filter((a) => !a.correct);
  if (!missed.length) return null;
  let pick = missed[0]!;
  for (const m of missed) {
    const base = problemById(m.problemId)?.base ?? 0;
    const best = problemById(pick.problemId)?.base ?? 0;
    if (base > best) pick = m;
  }
  return problemById(pick.problemId)?.unit ?? null;
}

const SQUARE_EMOJI: Record<Square, string> = {
  green: "🟩",
  red: "🟥",
  yellow: "🟨",
};

export function shareText(opts: {
  setNumber: number;
  tier: string;
  altitude: number;
  answers: AnswerRecord[];
}): string {
  const grid = opts.answers.map((a) => SQUARE_EMOJI[squareFor(a)]).join("");
  const pts = runPoints(opts.answers);
  return `Ace Set #${opts.setNumber} - ${opts.tier} (${opts.altitude} km · ${pts} pts)\n${grid}\nacesets.com/daily`;
}
