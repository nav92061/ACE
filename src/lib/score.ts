import { problemById } from "./problems";
import type { AnswerRecord, Problem } from "./types";

/** Wrong answers earn 0. A full-speed correct answer adds at most 20%. */
export function altitudeFor(problem: Problem, correct: boolean, seconds: number): number {
  if (!correct) return 0;
  const used = Math.min(60, Math.max(0, seconds));
  const bonus = 0.2 * ((60 - used) / 60);
  return Math.round(problem.base * (1 + bonus));
}

export type TierName =
  | "Launch Pad"
  | "Low Orbit"
  | "High Orbit"
  | "Moon"
  | "Deep Space"
  | "Ace";

export function tierFor(altitude: number, allCorrect: boolean): { name: TierName; blurb: string } {
  if (allCorrect) return { name: "Ace", blurb: "All six. Clean flight." };
  if (altitude <= 0) {
    return { name: "Launch Pad", blurb: "Still on the pad. Tomorrow is another launch." };
  }
  if (altitude < 50) return { name: "Low Orbit", blurb: "Off the pad and climbing." };
  if (altitude < 120) return { name: "High Orbit", blurb: "Above the clouds." };
  if (altitude < 200) return { name: "Moon", blurb: "A long way from the pad." };
  return { name: "Deep Space", blurb: "Almost nobody flies this far." };
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
  return `Ace Set #${opts.setNumber} - ${opts.tier} (${opts.altitude} km)\n${grid}\nacesets.com/daily`;
}
