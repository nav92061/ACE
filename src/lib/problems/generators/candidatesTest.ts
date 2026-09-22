/**
 * Candidates Test (5.5).
 * Absolute max/min on closed interval for simple polynomials.
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
    unique.push({ latex: String(10 + unique.length), math: `fb${unique.length}` });
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

function evalQuad(a: number, b: number, c: number, x: number): number {
  return a * x * x + b * x + c;
}

/** f(x)=x² on [a,b] — vertex at 0 */
const xSquared: Template = (difficulty) => {
  const intervals = [
    { a: -1, b: 2 }, // vals: 1, 0, 4 → abs max 4 at 2, abs min 0 at 0
    { a: 1, b: 3 }, // 1,9 → max 9 min 1
    { a: -2, b: 1 }, // 4,0,1 → max 4 min 0
    { a: 0, b: 3 }, // 0,9 → max 9 min 0
  ];
  const iv = pick(intervals);
  const crit = 0;
  const candidates = [iv.a, iv.b];
  if (crit > iv.a && crit < iv.b) candidates.push(crit);
  const vals = candidates.map((x) => ({ x, y: x * x }));
  const maxV = vals.reduce((m, v) => (v.y > m.y ? v : m));
  const minV = vals.reduce((m, v) => (v.y < m.y ? v : m));

  const ask = pick(["absmax_val", "absmin_val", "absmax_x", "absmin_x"] as const);
  let correct: number;
  let promptAsk: string;
  let solution: string;

  if (ask === "absmax_val") {
    correct = maxV.y;
    promptAsk = "absolute maximum value";
    solution = `Candidates: ${candidates.join(", ")}. Max of values is \\(${maxV.y}\\).`;
  } else if (ask === "absmin_val") {
    correct = minV.y;
    promptAsk = "absolute minimum value";
    solution = `Candidates: ${candidates.join(", ")}. Min of values is \\(${minV.y}\\).`;
  } else if (ask === "absmax_x") {
    correct = maxV.x;
    promptAsk = "x\\text{-value where the absolute maximum occurs}";
    solution = `Absolute max \\(${maxV.y}\\) at \\(x=${maxV.x}\\).`;
  } else {
    correct = minV.x;
    promptAsk = "x\\text{-value where the absolute minimum occurs}";
    solution = `Absolute min \\(${minV.y}\\) at \\(x=${minV.x}\\).`;
  }

  void difficulty;
  return {
    id: problemId("cand-x2"),
    skillId: "candidates-test",
    promptLatex: `f(x)=x^{2}\\text{ on }[${iv.a},${iv.b}].\\text{ Find the }${promptAsk}.`,
    answerType: "number",
    correctAnswerLatex: String(correct),
    correctAnswerMath: String(correct),
    solutionLatex: solution,
    difficulty,
  };
};

/** f(x)=-x²+k style or simple cubic-like: f(x)=x³-3x on [-2,2] worksheet style */
const classicCubic: Template = (difficulty) => {
  // f(x)=x³-3x, f'=3x²-3=0 at ±1
  // On [-2,2]: f(-2)=-2, f(-1)=2, f(1)=-2, f(2)=2 → abs max 2, abs min -2
  const interval = pick([
    { a: -2, b: 2, crits: [-1, 1] as number[] },
    { a: -1, b: 2, crits: [-1, 1] as number[] },
    { a: 0, b: 2, crits: [1] as number[] },
  ]);
  const f = (x: number) => x * x * x - 3 * x;
  const candidates = [interval.a, interval.b, ...interval.crits.filter((c) => c > interval.a && c < interval.b)];
  const unique = [...new Set(candidates)];
  const vals = unique.map((x) => ({ x, y: f(x) }));
  const maxV = vals.reduce((m, v) => (v.y > m.y ? v : m));
  const minV = vals.reduce((m, v) => (v.y < m.y ? v : m));

  const ask = pick(["absmax_val", "absmin_val"] as const);
  const correct = ask === "absmax_val" ? maxV.y : minV.y;
  const promptAsk = ask === "absmax_val" ? "absolute maximum value" : "absolute minimum value";

  void difficulty;
  return {
    id: problemId("cand-cubic"),
    skillId: "candidates-test",
    promptLatex: `f(x)=x^{3}-3x\\text{ on }[${interval.a},${interval.b}].\\text{ Find the }${promptAsk}.`,
    answerType: "number",
    correctAnswerLatex: String(correct),
    correctAnswerMath: String(correct),
    solutionLatex: `Critical points where \\(f'=0\\): \\(x=\\pm 1\\). Evaluate endpoints and critical points; ${ask === "absmax_val" ? "max" : "min"} is \\(${correct}\\).`,
    difficulty,
  };
};

/** Linear on interval — max/min at endpoints only */
const linear: Template = (difficulty) => {
  const m = pick([2, 3, -2, -3]);
  const a = pick([0, 1, -1]);
  const b = a + pick([2, 3, 4]);
  const fa = m * a;
  const fb = m * b;
  const absMax = Math.max(fa, fb);
  const absMin = Math.min(fa, fb);
  const askMax = Math.random() < 0.5;
  const correct = askMax ? absMax : absMin;

  void difficulty;
  return {
    id: problemId("cand-lin"),
    skillId: "candidates-test",
    promptLatex: `f(x)=${m}x\\text{ on }[${a},${b}].\\text{ Find the absolute ${askMax ? "maximum" : "minimum"} value.}`,
    answerType: "number",
    correctAnswerLatex: String(correct),
    correctAnswerMath: String(correct),
    solutionLatex: `No critical points in the open interval. Compare \\(f(${a})=${fa}\\) and \\(f(${b})=${fb}\\).`,
    difficulty,
  };
};

/** Quadratic ax²+bx+c with vertex in interval — MC for value */
const quadraticMc: Template = (difficulty) => {
  // f(x)=x²-4x+3 = (x-1)(x-3), vertex at x=2, f(2)=-1
  // on [0,4]: f(0)=3, f(2)=-1, f(4)=3 → abs max 3, abs min -1
  const problems = [
    {
      fLatex: "x^{2}-4x+3",
      a: 0,
      b: 4,
      crit: 2,
      f: (x: number) => evalQuad(1, -4, 3, x),
    },
    {
      fLatex: "x^{2}-2x",
      a: 0,
      b: 3,
      crit: 1,
      f: (x: number) => evalQuad(1, -2, 0, x),
    },
    {
      fLatex: "-x^{2}+4x",
      a: 0,
      b: 3,
      crit: 2,
      f: (x: number) => evalQuad(-1, 4, 0, x),
    },
  ];
  const p = pick(problems);
  const candidates = [p.a, p.b, p.crit].filter((x, i, arr) => arr.indexOf(x) === i && x >= p.a && x <= p.b);
  const vals = candidates.map((x) => ({ x, y: p.f(x) }));
  const maxV = vals.reduce((m, v) => (v.y > m.y ? v : m));
  const minV = vals.reduce((m, v) => (v.y < m.y ? v : m));
  const askMax = Math.random() < 0.5;
  const correct = askMax ? maxV.y : minV.y;
  const wrongVals = vals.map((v) => v.y).filter((y) => y !== correct);
  while (wrongVals.length < 3) wrongVals.push(correct + wrongVals.length + 1);
  const wrongs = wrongVals.slice(0, 3).map((y) => ({ latex: String(y), math: String(y) }));

  void difficulty;
  return {
    id: problemId("cand-quad"),
    skillId: "candidates-test",
    promptLatex: `f(x)=${p.fLatex}\\text{ on }[${p.a},${p.b}].\\text{ Absolute ${askMax ? "maximum" : "minimum"} value:}`,
    answerType: "multiple-choice",
    correctAnswerLatex: String(correct),
    correctAnswerMath: String(correct),
    choices: shuffleMc(String(correct), String(correct), wrongs),
    solutionLatex: `Evaluate at endpoints and critical point \\(x=${p.crit}\\). ${askMax ? "Max" : "Min"} is \\(${correct}\\).`,
    difficulty,
  };
};

const TEMPLATES_BY_DIFFICULTY: Record<Difficulty, Template[]> = {
  1: [linear, xSquared],
  2: [xSquared, quadraticMc],
  3: [quadraticMc, classicCubic, xSquared],
};

export function generateCandidatesTest(difficulty: Difficulty = 1): Problem {
  return pick(TEMPLATES_BY_DIFFICULTY[difficulty])(difficulty);
}

export function generateCandidatesTestSet(
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
    problems.push(generateCandidatesTest(difficulty));
  }
  return problems;
}
