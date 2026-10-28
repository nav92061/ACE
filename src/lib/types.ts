export type Unit =
  | "Limits"
  | "Derivatives"
  | "Applications"
  | "Analytical"
  | "Integrals"
  | "Differential equations"
  | "Accumulation"
  | "Particle motion";

/** A small plotted diagram. Coordinates are math units, not pixels. */
export interface GraphSpec {
  xLabel: string;
  yLabel: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  points: { x: number; y: number }[];
  shadeFrom?: number;
  shadeTo?: number;
  xTicks?: number[];
}

export type Difficulty = "easy" | "medium" | "hard" | "rare";

export type AnswerType = "mc" | "numeric" | "expression";

export interface Choice {
  id: string;
  latex: string;
}

export interface Problem {
  id: string;
  /** A Calc AB unit for bank problems, or the notes set title for generated ones. */
  unit: Unit | (string & {});
  topic: string;
  prompt: { kind: "text" | "math"; value: string }[];
  type: AnswerType;
  choices?: Choice[];
  /** Choice id, numeric string, or mathjs/LaTeX expression. */
  answer: string;
  explanation: string;
  hint: string;
  difficulty: Difficulty;
  /** Kilometers before the time bonus. */
  base: number;
  /** Teacher estimate until enough players have tried it. 0–1. */
  solveRate: number;
  graph?: GraphSpec;
  /** Generated from study notes: prompt and choices are plain text with $inline math$. */
  rich?: boolean;
}

export interface AnswerRecord {
  problemId: string;
  correct: boolean;
  seconds: number;
  altitude: number;
  raw: string;
  /** Accuracy plus speed points. Missing on flights saved before points existed. */
  points?: number;
  /** This was a retry of a question missed on an earlier launch. */
  retry?: boolean;
}

export type FlightMode = "daily" | "unlimited" | "practice" | "notes";

export interface FlightRecord {
  date: string;
  setNumber: number;
  mode: FlightMode;
  unit?: string;
  answers: AnswerRecord[];
  altitude: number;
  finished: boolean;
}

export interface StreakState {
  count: number;
  lastDate: string | null;
  /** ISO week id in which the one allowed miss was used. */
  graceWeek: string | null;
}

export interface ProblemStats {
  attempts: number;
  correct: number;
}
