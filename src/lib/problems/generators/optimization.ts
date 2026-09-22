/**
 * Optimization (5.10).
 * Very short one-variable max/min; number answers.
 */

import type { Difficulty, Problem } from "@/types";
import { pick, problemId, randInt } from "../random";

type Template = (difficulty: Difficulty) => Problem;

/** Max product with fixed sum: x+y=S, maximize xy → x=y=S/2, product=(S/2)² */
const maxProductFixedSum: Template = (difficulty) => {
  const S = difficulty === 1 ? pick([10, 12, 16, 20]) : pick([10, 12, 14, 18, 24]);
  // Prefer even S for integer
  const half = S / 2;
  const ask = pick(["product", "each"] as const);

  if (ask === "each" && Number.isInteger(half)) {
    return {
      id: problemId("opt-prod"),
      skillId: "optimization",
      promptLatex: `\\text{Two numbers sum to }${S}.\\text{ What value should each be to maximize their product?}`,
      answerType: "number",
      correctAnswerLatex: String(half),
      correctAnswerMath: String(half),
      solutionLatex: `Let \\(y=${S}-x\\), \\(P=x(${S}-x)\\). \\(P'=0\\Rightarrow x=${half}\\).`,
      difficulty,
    };
  }

  const product = half * half;
  return {
    id: problemId("opt-prod"),
    skillId: "optimization",
    promptLatex: `\\text{Two numbers sum to }${S}.\\text{ What is their maximum product?}`,
    answerType: "number",
    correctAnswerLatex: String(product),
    correctAnswerMath: String(product),
    solutionLatex: `Maximum when each is \\(${half}\\); product \\(${product}\\).`,
    difficulty,
  };
};

/** Open box from square sheet of side L: cut x×x corners; V=x(L-2x)²; critical at x=L/6 */
const openBox: Template = (difficulty) => {
  const fixed = [
    { L: 12, x: 2, V: 128 },
    { L: 18, x: 3, V: 432 },
    { L: 6, x: 1, V: 16 },
    { L: 24, x: 4, V: 1024 },
  ];
  const c = pick(difficulty === 1 ? fixed.slice(0, 2) : fixed);
  const askX = Math.random() < 0.5;

  if (askX) {
    return {
      id: problemId("opt-box"),
      skillId: "optimization",
      promptLatex: `\\text{An open box is made from a }${c.L}\\times${c.L}\\text{ sheet by cutting equal squares of side }x\\text{ from each corner. What }x\\text{ maximizes volume?}`,
      answerType: "number",
      correctAnswerLatex: String(c.x),
      correctAnswerMath: String(c.x),
      solutionLatex: `V=x(${c.L}-2x)^{2}.\\; V'=0\\Rightarrow x=${c.x}\\text{ (in }(0,${c.L}/2)\\text{)}.`,
      difficulty,
    };
  }

  return {
    id: problemId("opt-box"),
    skillId: "optimization",
    promptLatex: `\\text{Open box from a }${c.L}\\times${c.L}\\text{ square sheet (cut equal squares from corners). Maximum volume?}`,
    answerType: "number",
    correctAnswerLatex: String(c.V),
    correctAnswerMath: String(c.V),
    solutionLatex: `Optimal cut \\(x=${c.x}\\); \\(V=${c.x}(${c.L - 2 * c.x})^{2}=${c.V}\\).`,
    difficulty,
  };
};

/** Max area rectangle under y = k - x (or under y=b on [0,a] with perimeter) — under line y=b-x on first quadrant */
const rectUnderLine: Template = (difficulty) => {
  // Rectangle with base on x-axis from 0 to x, height = b-x (line from (0,b) to (b,0))
  // A = x(b-x), max at x=b/2, A=(b/2)²
  const b = difficulty === 1 ? pick([4, 6, 8, 10]) : pick([4, 6, 8, 10, 12]);
  const half = b / 2;
  const ask = pick(["area", "x"] as const);

  if (ask === "x") {
    return {
      id: problemId("opt-rect"),
      skillId: "optimization",
      promptLatex: `\\text{A rectangle has base on the }x\\text{-axis and top vertex on }y=${b}-x\\text{ (first quadrant). What }x\\text{ maximizes area?}`,
      answerType: "number",
      correctAnswerLatex: String(half),
      correctAnswerMath: String(half),
      solutionLatex: `A=x(${b}-x).\\; A'=0\\Rightarrow x=${half}.`,
      difficulty,
    };
  }

  const area = half * half;
  return {
    id: problemId("opt-rect"),
    skillId: "optimization",
    promptLatex: `\\text{Rectangle under }y=${b}-x\\text{ in the first quadrant (base on }x\\text{-axis). Maximum area?}`,
    answerType: "number",
    correctAnswerLatex: String(area),
    correctAnswerMath: String(area),
    solutionLatex: `Max at \\(x=${half}\\); \\(A=${area}\\).`,
    difficulty,
  };
};

/** Fence: three sides of rectangle against a wall; fixed perimeter P → max area */
const fenceAgainstWall: Template = (difficulty) => {
  // 2x + y = P, A = x y = x(P-2x), A'=P-4x=0 → x=P/4, y=P/2, A=P²/8
  const P = difficulty === 1 ? pick([20, 24, 40]) : pick([20, 24, 32, 40]);
  const x = P / 4;
  const A = (P * P) / 8;
  const ask = pick(["area", "depth"] as const);

  if (ask === "depth" && Number.isInteger(x)) {
    return {
      id: problemId("opt-fence"),
      skillId: "optimization",
      promptLatex: `\\text{A rectangular pen uses }${P}\\text{ ft of fencing for three sides (fourth is a wall). Depth (perpendicular to wall) that maximizes area?}`,
      answerType: "number",
      correctAnswerLatex: String(x),
      correctAnswerMath: String(x),
      solutionLatex: `2x+y=${P},\\;A=x(${P}-2x).\\;A'=0\\Rightarrow x=${x}.`,
      difficulty,
    };
  }

  return {
    id: problemId("opt-fence"),
    skillId: "optimization",
    promptLatex: `\\text{Three-sided rectangular pen with }${P}\\text{ ft of fence (one side is a wall). Maximum area?}`,
    answerType: "number",
    correctAnswerLatex: String(A),
    correctAnswerMath: String(A),
    solutionLatex: `Max area is \\(P^{2}/8=${A}\\).`,
    difficulty,
  };
};

/** Simple: maximize A=x(10-x) style stated directly */
const directQuadratic: Template = (difficulty) => {
  const S = randInt(6, 12);
  const maxA = (S / 2) * (S / 2);
  void difficulty;
  return {
    id: problemId("opt-direct"),
    skillId: "optimization",
    promptLatex: `\\text{Maximize }A=x(${S}-x)\\text{ for }0<x<${S}.\\text{ What is the maximum value of }A?`,
    answerType: "number",
    correctAnswerLatex: String(maxA),
    correctAnswerMath: String(maxA),
    solutionLatex: `A'=${S}-2x=0\\Rightarrow x=${S / 2};\\;A=${maxA}.`,
    difficulty,
  };
};

const TEMPLATES_BY_DIFFICULTY: Record<Difficulty, Template[]> = {
  1: [maxProductFixedSum, directQuadratic],
  2: [maxProductFixedSum, rectUnderLine, fenceAgainstWall],
  3: [openBox, rectUnderLine, fenceAgainstWall],
};

export function generateOptimization(difficulty: Difficulty = 1): Problem {
  return pick(TEMPLATES_BY_DIFFICULTY[difficulty])(difficulty);
}

export function generateOptimizationSet(
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
    problems.push(generateOptimization(difficulty));
  }
  return problems;
}
