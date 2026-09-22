/**
 * Mean Value Theorem (5.1) — find c on (a,b) with f'(c) = (f(b)-f(a))/(b-a).
 */

import type { Difficulty, Problem } from "@/types";
import { pick, problemId, randInt } from "../random";

type Template = (difficulty: Difficulty) => Problem;

/** f(x)=x^2 on [a,b] → c = (a+b)/2 */
const quadratic: Template = (difficulty) => {
  const a = difficulty === 1 ? pick([0, 1, 2]) : pick([-2, -1, 0, 1]);
  const b = a + pick([2, 3, 4]);
  const c = (a + b) / 2;
  return {
    id: problemId("mvt-quad"),
    skillId: "mean-value-theorem",
    promptLatex: `f(x)=x^{2}\\text{ on }[${a},${b}].\\text{ Find }c\\text{ guaranteed by the MVT.}`,
    answerType: "number",
    correctAnswerLatex: String(c),
    correctAnswerMath: String(c),
    solutionLatex: `\\(f'(x)=2x\\). Average rate \\(\\frac{f(${b})-f(${a})}{${b}-${a}}=${a + b}\\). So \\(2c=${a + b}\\Rightarrow c=${c}.\\)`,
    difficulty,
  };
};

/** f(x)=x^3 on [0,b] → 3c^2 = b^2 → c = b/√3 — keep nicer: f(x)=x^3 on [-1,2] etc. Use f(x)=x^3/3 so f'=x^2. */
const cubicNice: Template = (difficulty) => {
  const a = 0;
  const b = pick([3, 4, 6]);
  // f(x)=x^3, f'=3x^2, (f(b)-f(a))/(b-a)=b^2, so 3c^2=b^2 → c=b/√3 — messy.
  // Use f(x)=x^2+k instead already covered. Try f(x)=2x^3+1 on [0,1]: avg=2, f'=6x^2 → c=√(1/3).
  // Stick to linear f' cases: f(x)=x^3 - 3x on suitable interval.
  // f(x)=x^3-3x, f'=3x^2-3. On [0,2]: avg=(2-0)/2=1. 3c^2-3=1 → 3c^2=4 → c=√(4/3). messy.
  // Simple: f(x)=x^3 on [1,4]... skip
  // f(x) = x^2 + x on [a,b]: f'=2x+1, avg = (b+a+1), set 2c+1 = a+b+1 → c=(a+b)/2
  const aa = difficulty >= 2 ? pick([-1, 0, 1]) : 1;
  const bb = aa + pick([2, 4]);
  const c = (aa + bb) / 2;
  return {
    id: problemId("mvt-lin"),
    skillId: "mean-value-theorem",
    promptLatex: `f(x)=x^{2}+x\\text{ on }[${aa},${bb}].\\text{ Find the }c\\text{ from the MVT.}`,
    answerType: "number",
    correctAnswerLatex: String(c),
    correctAnswerMath: String(c),
    solutionLatex: `\\(f'(x)=2x+1\\). Average rate equals \\(a+b+1=${aa + bb + 1}\\). Solve \\(2c+1=${aa + bb + 1}\\Rightarrow c=${c}.\\)`,
    difficulty,
  };
};

/** Ask for the MVT average rate value instead of c */
const avgRate: Template = (difficulty) => {
  const a = randInt(0, 3);
  const b = a + pick([2, 3, 4]);
  const avg = a + b; // for f(x)=x^2
  return {
    id: problemId("mvt-avg"),
    skillId: "mean-value-theorem",
    promptLatex: `f(x)=x^{2}\\text{ on }[${a},${b}].\\text{ What value does }f'(c)\\text{ equal by the MVT?}`,
    answerType: "number",
    correctAnswerLatex: String(avg),
    correctAnswerMath: String(avg),
    solutionLatex: `\\(\\dfrac{f(${b})-f(${a})}{${b}-${a}}=\\dfrac{${b * b}-${a * a}}{${b - a}}=${avg}.\\)`,
    difficulty,
  };
};

const TEMPLATES_BY_DIFFICULTY: Record<Difficulty, Template[]> = {
  1: [quadratic, avgRate],
  2: [quadratic, cubicNice, avgRate],
  3: [cubicNice, avgRate, quadratic],
};

export function generateMeanValueTheorem(difficulty: Difficulty = 1): Problem {
  return pick(TEMPLATES_BY_DIFFICULTY[difficulty])(difficulty);
}

export function generateMeanValueTheoremSet(
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
    problems.push(generateMeanValueTheorem(difficulty));
  }
  return problems;
}
