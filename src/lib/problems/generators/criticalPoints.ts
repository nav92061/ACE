/**
 * Critical Points (5.2–5.3).
 * Find x where f′=0 or f′ undefined.
 */

import type { Difficulty, Problem } from "@/types";
import { pick, problemId } from "../random";

type Template = (difficulty: Difficulty) => Problem;

function shuffleMc(
  correctLatex: string,
  correctMath: string,
  wrongs: { latex: string; math: string }[],
): Problem["choices"] {
  const unique = wrongs.filter((w) => w.math !== correctMath);
  while (unique.length < 3) {
    unique.push({ latex: String(unique.length), math: `fb${unique.length}` });
  }
  const options = [
    { id: "A", latex: correctLatex, value: correctMath },
    { id: "B", latex: unique[0]!.latex, value: unique[0]!.math },
    { id: "C", latex: unique[1]!.latex, value: unique[1]!.math },
    { id: "D", latex: unique[2]!.latex, value: unique[2]!.math },
  ];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j]!, options[i]!];
  }
  return options.map((o, i) => ({ ...o, id: ["A", "B", "C", "D"][i]! }));
}

/** Given f'(x)=(x-a)(x-b), critical points are a and b */
const fromFactoredFp: Template = (difficulty) => {
  const pair = pick([
    [-2, 1],
    [-1, 2],
    [0, 3],
    [1, 4],
    [-3, 0],
  ] as const);
  const [r1, r2] = pair[0]! <= pair[1]! ? pair : [pair[1]!, pair[0]!];
  const correctLatex = `x=${r1}\\text{ and }x=${r2}`;
  const correctMath = `cp_${r1}_${r2}`;
  const wrongs = [
    { latex: `x=${r1}\\text{ only}`, math: `only_${r1}` },
    { latex: `x=${r2}\\text{ only}`, math: `only_${r2}` },
    { latex: `x=${(r1 + r2) / 2}`, math: `mid_${r1}_${r2}` },
  ];

  void difficulty;
  return {
    id: problemId("cp-fp"),
    skillId: "critical-points",
    promptLatex: `f'(x)=(x-${r1})(x-${r2}).\\\\ \\text{Critical point(s) at:}`,
    answerType: "choice-text",
    correctAnswerLatex: correctLatex,
    correctAnswerMath: correctMath,
    choices: shuffleMc(correctLatex, correctMath, wrongs),
    solutionLatex: `Critical points where \\(f'=0\\): \\(x=${r1}\\) and \\(x=${r2}\\).`,
    difficulty,
  };
};

/** Given f(x)=x³ - ax, find critical x */
const fromPolynomial: Template = (difficulty) => {
  // f(x)=x³/3 - a x → f'=x²-a; or f=x³-3x → f'=3x²-3=3(x²-1), crit ±1
  const configs = [
    { f: "x^{3}-3x", crit: "x=-1\\text{ and }x=1", math: "pm1", sol: "f'=3x^{2}-3=0\\Rightarrow x=\\pm 1" },
    { f: "x^{3}-12x", crit: "x=-2\\text{ and }x=2", math: "pm2", sol: "f'=3x^{2}-12=0\\Rightarrow x=\\pm 2" },
    { f: "x^{2}-4x", crit: "x=2", math: "x2", sol: "f'=2x-4=0\\Rightarrow x=2" },
    { f: "x^{2}+6x", crit: "x=-3", math: "xm3", sol: "f'=2x+6=0\\Rightarrow x=-3" },
  ];
  const cfg = pick(difficulty === 1 ? configs.slice(2) : configs);
  const wrongs =
    cfg.math === "pm1" || cfg.math === "pm2"
      ? [
          { latex: "x=0", math: "x0" },
          { latex: cfg.math === "pm1" ? "x=1\\text{ only}" : "x=2\\text{ only}", math: "only_pos" },
          { latex: "\\text{none}", math: "none" },
        ]
      : [
          { latex: "x=0", math: "x0" },
          { latex: "x=1", math: "x1" },
          { latex: "\\text{none}", math: "none" },
        ];

  return {
    id: problemId("cp-poly"),
    skillId: "critical-points",
    promptLatex: `f(x)=${cfg.f}.\\\\ \\text{Critical point(s) at:}`,
    answerType: "choice-text",
    correctAnswerLatex: cfg.crit,
    correctAnswerMath: cfg.math,
    choices: shuffleMc(cfg.crit, cfg.math, wrongs),
    solutionLatex: cfg.sol,
    difficulty,
  };
};

/** f' undefined: f(x)=|x-a| or cube root style — MC */
const undefinedFp: Template = (difficulty) => {
  const a = pick([-1, 0, 1, 2, 3]);
  const correctLatex = String(a);
  const correctMath = String(a);
  const wrongs = [
    { latex: String(a + 1), math: String(a + 1) },
    { latex: String(a - 1), math: String(a - 1) },
    { latex: "\\text{none}", math: "none" },
  ];
  void difficulty;
  return {
    id: problemId("cp-undef"),
    skillId: "critical-points",
    promptLatex: `f(x)=|x-${a}|.\\\\ \\text{Where is }f'\\text{ undefined (a critical point)?}`,
    answerType: "choice-text",
    correctAnswerLatex: correctLatex,
    correctAnswerMath: correctMath,
    choices: shuffleMc(correctLatex, correctMath, wrongs),
    solutionLatex: `The corner at \\(x=${a}\\) makes \\(f'\\) undefined.`,
    difficulty,
  };
};

/** Single root of f' */
const singleCrit: Template = (difficulty) => {
  const r = pick([-3, -2, -1, 1, 2, 3, 4]);
  void difficulty;
  return {
    id: problemId("cp-single"),
    skillId: "critical-points",
    promptLatex: `f'(x)=x-${r}.\\\\ \\text{The critical point is at }x=?`,
    answerType: "number",
    correctAnswerLatex: String(r),
    correctAnswerMath: String(r),
    solutionLatex: `\\(f'(x)=0\\Rightarrow x=${r}\\).`,
    difficulty,
  };
};

const TEMPLATES_BY_DIFFICULTY: Record<Difficulty, Template[]> = {
  1: [singleCrit, fromFactoredFp],
  2: [fromFactoredFp, fromPolynomial, undefinedFp],
  3: [fromPolynomial, undefinedFp, fromFactoredFp],
};

export function generateCriticalPoints(difficulty: Difficulty = 1): Problem {
  return pick(TEMPLATES_BY_DIFFICULTY[difficulty])(difficulty);
}

export function generateCriticalPointsSet(
  count: number,
  options?: { rampDifficulty?: boolean },
): Problem[] {
  const problems: Problem[] = [];
  for (let i = 0; i < count; i++) {
    let difficulty: Difficulty = 1;
    if (options?.rampDifficulty) {
      if (i >= 7) difficulty = 3;
      else if (i >= 4) difficulty = 2;
    }
    problems.push(generateCriticalPoints(difficulty));
  }
  return problems;
}
