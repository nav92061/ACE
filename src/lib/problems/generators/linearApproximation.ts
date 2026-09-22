/**
 * Skill 12 — Linear approximation.
 * L(x)=f(a)+f'(a)(x-a); approximate f(nearby).
 */

import type { Difficulty, Problem } from "@/types";
import { fracLatex, pick, problemId } from "../random";

type Template = (difficulty: Difficulty) => Problem;

/** √ nearby integer — e.g. √26 ≈ 5 + 1/(2·5) */
const sqrtApprox: Template = (difficulty) => {
  const perfect = pick([4, 9, 16, 25, 36]);
  const root = Math.sqrt(perfect);
  const delta = difficulty === 1 ? pick([1, -1]) : pick([1, -1, 2, -2]);
  const x = perfect + delta;
  // L = root + (1/(2*root)) * delta
  const num = 2 * root * root + delta; // root + delta/(2 root) = (2 root² + delta)/(2 root)
  const den = 2 * root;
  const correctAnswerLatex = fracLatex(num, den);
  const correctAnswerMath = String(num / den);

  return {
    id: problemId("la-sqrt"),
    skillId: "linear-approximation",
    promptLatex: `\\text{Use the linear approximation of }\\sqrt{x}\\text{ at }a=${perfect}\\text{ to approximate }\\sqrt{${x}}.`,
    answerType: "number",
    correctAnswerLatex,
    correctAnswerMath,
    solutionLatex: `\\(f'(x)=\\frac{1}{2\\sqrt{x}}\\), so \\(L(x)=${root}+\\frac{1}{2\\cdot ${root}}(x-${perfect})\\). \\(L(${x})=${correctAnswerLatex}\\).`,
    difficulty,
  };
};

/** e^x near 0: e^{0.1} ≈ 1.1 */
const expNearZero: Template = (difficulty) => {
  const h = difficulty === 1 ? pick([1, 2]) / 10 : pick([1, 2, 3]) / 10;
  // Use tenths as integers: 0.1 → display 0.1, answer 1.1
  const correct = 1 + h;
  const hLatex = h.toString();
  return {
    id: problemId("la-exp"),
    skillId: "linear-approximation",
    promptLatex: `\\text{Use the linear approximation of }e^{x}\\text{ at }a=0\\text{ to approximate }e^{${hLatex}}.`,
    answerType: "number",
    correctAnswerLatex: String(correct),
    correctAnswerMath: String(correct),
    solutionLatex: `\\(f'(x)=e^{x}\\), \\(L(x)=1+x\\). \\(L(${hLatex})=${correct}\\).`,
    difficulty,
  };
};

/** ln(x) near 1: ln(1.2) ≈ 0.2 */
const lnNearOne: Template = (difficulty) => {
  const h = difficulty === 1 ? pick([1, 2]) / 10 : pick([1, 2, 3, -1]) / 10;
  const x = 1 + h;
  const correct = h; // L(x)=0+1*(x-1)=x-1
  return {
    id: problemId("la-ln"),
    skillId: "linear-approximation",
    promptLatex: `\\text{Use the linear approximation of }\\ln x\\text{ at }a=1\\text{ to approximate }\\ln(${x}).`,
    answerType: "number",
    correctAnswerLatex: String(correct),
    correctAnswerMath: String(correct),
    solutionLatex: `\\(f'(x)=1/x\\), \\(L(x)=0+1\\cdot(x-1)=x-1\\). \\(L(${x})=${correct}\\).`,
    difficulty,
  };
};

/** Polynomial: f(x)=x² or x³ at nice a */
const polyApprox: Template = (difficulty) => {
  const n = difficulty >= 3 ? 3 : 2;
  const a = pick([1, 2, 3]);
  const delta = pick([1, -1, 2]);
  const x = a + delta;
  // f(a)=a^n, f'(a)=n a^{n-1}, L= a^n + n a^{n-1} delta
  const fa = a ** n;
  const fpa = n * a ** (n - 1);
  const approx = fa + fpa * delta;

  return {
    id: problemId("la-poly"),
    skillId: "linear-approximation",
    promptLatex: `\\text{Use the linear approximation of }f(x)=x^{${n}}\\text{ at }a=${a}\\text{ to approximate }f(${x}).`,
    answerType: "number",
    correctAnswerLatex: String(approx),
    correctAnswerMath: String(approx),
    solutionLatex: `\\(f'(x)=${n}x^{${n - 1}}\\), \\(L(x)=${fa}+${fpa}(x-${a})\\). \\(L(${x})=${approx}\\).`,
    difficulty,
  };
};

/** 1/x near a nice point */
const reciprocalApprox: Template = (difficulty) => {
  const a = pick([2, 4, 5]);
  const delta = difficulty === 1 ? pick([1, -1]) : pick([1, -1, 2]);
  const x = a + delta;
  // f=1/x, f'=-1/x², L=1/a + (-1/a²)(x-a)
  // = (a - delta)/a²
  const num = a - delta;
  const den = a * a;
  const correctAnswerLatex = fracLatex(num, den);
  const correctAnswerMath = String(num / den);

  return {
    id: problemId("la-rec"),
    skillId: "linear-approximation",
    promptLatex: `\\text{Use the linear approximation of }\\dfrac{1}{x}\\text{ at }a=${a}\\text{ to approximate }\\dfrac{1}{${x}}.`,
    answerType: "number",
    correctAnswerLatex,
    correctAnswerMath,
    solutionLatex: `\\(f'(x)=-1/x^{2}\\), \\(L(x)=\\frac{1}{${a}}-\\frac{1}{${a}^{2}}(x-${a})\\). \\(L(${x})=${correctAnswerLatex}\\).`,
    difficulty,
  };
};

const TEMPLATES_BY_DIFFICULTY: Record<Difficulty, Template[]> = {
  1: [sqrtApprox, expNearZero, polyApprox],
  2: [sqrtApprox, expNearZero, lnNearOne, polyApprox],
  3: [sqrtApprox, lnNearOne, reciprocalApprox, polyApprox],
};

export function generateLinearApproximation(difficulty: Difficulty = 1): Problem {
  return pick(TEMPLATES_BY_DIFFICULTY[difficulty])(difficulty);
}

export function generateLinearApproximationSet(
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
    problems.push(generateLinearApproximation(difficulty));
  }
  return problems;
}
