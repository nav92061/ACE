/**
 * Related Rates — structured prompts only.
 */

import type { Difficulty, Problem } from "@/types";
import { pick, problemId, randInt } from "../random";
import { math, text, row, prompt, solution } from "../prompt";

type Template = (difficulty: Difficulty) => Problem;

const circleArea: Template = (difficulty) => {
  const r = difficulty === 1 ? pick([2, 3, 4, 5]) : pick([2, 3, 4, 5, 6]);
  const drdt = pick([1, 2, 3]);
  const answer = 2 * r * drdt;
  const p = prompt(
    row(math(`A=\\pi r^{2}`)),
    row(text("When"), math(`r=${r},\\;\\dfrac{dr}{dt}=${drdt}.`)),
    row(text("Find"), math(`\\dfrac{1}{\\pi}\\dfrac{dA}{dt}.`)),
  );
  const s = solution(
    row(
      math(
        `\\dfrac{dA}{dt}=2\\pi r\\dfrac{dr}{dt}\\Rightarrow\\dfrac{1}{\\pi}\\dfrac{dA}{dt}=2(${r})(${drdt})=${answer}.`,
      ),
    ),
  );
  return {
    id: problemId("rr-circle"),
    skillId: "related-rates",
    ...p,
    answerType: "number",
    correctAnswerLatex: String(answer),
    correctAnswerMath: String(answer),
    ...s,
    difficulty,
  };
};

const sphereVolume: Template = (difficulty) => {
  const r = pick([1, 2, 3]);
  const drdt = difficulty === 1 ? 1 : pick([1, 2]);
  const answer = 4 * r * r * drdt;
  const p = prompt(
    row(math(`V=\\dfrac{4}{3}\\pi r^{3}`)),
    row(text("When"), math(`r=${r},\\;\\dfrac{dr}{dt}=${drdt}.`)),
    row(text("Find"), math(`\\dfrac{1}{\\pi}\\dfrac{dV}{dt}.`)),
  );
  const s = solution(
    row(
      math(
        `\\dfrac{dV}{dt}=4\\pi r^{2}\\dfrac{dr}{dt}\\Rightarrow\\dfrac{1}{\\pi}\\dfrac{dV}{dt}=4(${r})^{2}(${drdt})=${answer}.`,
      ),
    ),
  );
  return {
    id: problemId("rr-sphere"),
    skillId: "related-rates",
    ...p,
    answerType: "number",
    correctAnswerLatex: String(answer),
    correctAnswerMath: String(answer),
    ...s,
    difficulty,
  };
};

const ladder: Template = (difficulty) => {
  const configs = [
    { x: 3, y: 4, dxdt: 4, dydt: -3 },
    { x: 6, y: 8, dxdt: 4, dydt: -3 },
    { x: 8, y: 6, dxdt: 3, dydt: -4 },
    { x: 4, y: 3, dxdt: 3, dydt: -4 },
  ];
  const c = pick(difficulty === 1 ? configs.slice(0, 2) : configs);
  const p = prompt(
    row(math(`x^{2}+y^{2}=L^{2}`)),
    row(
      text("When"),
      math(`x=${c.x},\\;y=${c.y},\\;\\dfrac{dx}{dt}=${c.dxdt}.`),
    ),
    row(text("Find"), math(`\\dfrac{dy}{dt}.`)),
  );
  const s = solution(
    row(
      math(
        `x\\dfrac{dx}{dt}+y\\dfrac{dy}{dt}=0\\Rightarrow\\dfrac{dy}{dt}=-\\dfrac{${c.x}}{${c.y}}(${c.dxdt})=${c.dydt}.`,
      ),
    ),
  );
  return {
    id: problemId("rr-ladder"),
    skillId: "related-rates",
    ...p,
    answerType: "number",
    correctAnswerLatex: String(c.dydt),
    correctAnswerMath: String(c.dydt),
    ...s,
    difficulty,
  };
};

const squareArea: Template = (difficulty) => {
  const side = randInt(2, 6);
  const dsdt = difficulty === 1 ? pick([1, 2]) : pick([1, 2, 3]);
  const answer = 2 * side * dsdt;
  const p = prompt(
    row(math(`A=s^{2}`)),
    row(text("Square. When"), math(`s=${side},\\;\\dfrac{ds}{dt}=${dsdt}.`)),
    row(text("Find"), math(`\\dfrac{dA}{dt}.`)),
  );
  const s = solution(
    row(math(`\\dfrac{dA}{dt}=2s\\dfrac{ds}{dt}=2(${side})(${dsdt})=${answer}.`)),
  );
  return {
    id: problemId("rr-square"),
    skillId: "related-rates",
    ...p,
    answerType: "number",
    correctAnswerLatex: String(answer),
    correctAnswerMath: String(answer),
    ...s,
    difficulty,
  };
};

const TEMPLATES_BY_DIFFICULTY: Record<Difficulty, Template[]> = {
  1: [circleArea, squareArea],
  2: [circleArea, squareArea, ladder],
  3: [circleArea, sphereVolume, ladder],
};

export function generateRelatedRates(difficulty: Difficulty = 1): Problem {
  return pick(TEMPLATES_BY_DIFFICULTY[difficulty])(difficulty);
}

export function generateRelatedRatesSet(
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
    problems.push(generateRelatedRates(difficulty));
  }
  return problems;
}
