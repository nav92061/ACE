/**
 * Second Derivative Test (5.6–5.7).
 * Concavity, inflection, or classify extrema with f″.
 * Adapted from concavity patterns; skillId = second-derivative-test.
 */

import type { Difficulty, Problem } from "@/types";
import { pick, problemId } from "../random";

type Template = (difficulty: Difficulty) => Problem;

function shuffleTextChoices(
  correctLatex: string,
  correctMath: string,
  wrongs: { latex: string; math: string }[],
): Problem["choices"] {
  const unique = wrongs.filter((w) => w.math !== correctMath);
  while (unique.length < 3) {
    unique.push({ latex: `(-\\infty,${unique.length})`, math: `fallback${unique.length}` });
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

/** Classify critical point using f″(c) */
const secondDerivClassify: Template = (difficulty) => {
  const c = pick([-2, -1, 0, 1, 2, 3]);
  const kind = pick(["max", "min", "inconclusive"] as const);

  let prompt: string;
  let correctLatex: string;
  let correctMath: string;
  let solution: string;
  let wrongs: { latex: string; math: string }[];

  if (kind === "max") {
    const val = pick([-6, -4, -2, -1]);
    prompt = `f'(${c})=0\\text{ and }f''(${c})=${val}.\\text{ By the second derivative test, }x=${c}\\text{ is a:}`;
    correctLatex = "\\text{relative maximum}";
    correctMath = "relmax";
    solution = `\\(f''(${c})<0\\) ⇒ concave down ⇒ relative max.`;
    wrongs = [
      { latex: "\\text{relative minimum}", math: "relmin" },
      { latex: "\\text{inconclusive}", math: "inconc" },
      { latex: "\\text{inflection point}", math: "inf" },
    ];
  } else if (kind === "min") {
    const val = pick([1, 2, 3, 4, 6]);
    prompt = `f'(${c})=0\\text{ and }f''(${c})=${val}.\\text{ By the second derivative test, }x=${c}\\text{ is a:}`;
    correctLatex = "\\text{relative minimum}";
    correctMath = "relmin";
    solution = `\\(f''(${c})>0\\) ⇒ concave up ⇒ relative min.`;
    wrongs = [
      { latex: "\\text{relative maximum}", math: "relmax" },
      { latex: "\\text{inconclusive}", math: "inconc" },
      { latex: "\\text{inflection point}", math: "inf" },
    ];
  } else {
    prompt = `f'(${c})=0\\text{ and }f''(${c})=0.\\text{ The second derivative test is:}`;
    correctLatex = "\\text{inconclusive}";
    correctMath = "inconc";
    solution = `When \\(f''=0\\), the second derivative test gives no information.`;
    wrongs = [
      { latex: "\\text{relative maximum}", math: "relmax" },
      { latex: "\\text{relative minimum}", math: "relmin" },
      { latex: "\\text{neither max nor min}", math: "neither" },
    ];
  }

  void difficulty;
  return {
    id: problemId("sdt-class"),
    skillId: "second-derivative-test",
    promptLatex: prompt,
    answerType: "multiple-choice",
    correctAnswerLatex: correctLatex,
    correctAnswerMath: correctMath,
    choices: shuffleTextChoices(correctLatex, correctMath, wrongs),
    solutionLatex: solution,
    difficulty,
  };
};

/** f''(x)=x-r — concave up/down or inflection */
const singleRoot: Template = (difficulty) => {
  const r = pick([-2, -1, 0, 1, 2, 3]);
  const ask = pick(["up", "down", "inflect"] as const);

  let correctLatex: string;
  let correctMath: string;
  let wrongs: { latex: string; math: string }[];
  let prompt: string;
  let solution: string;

  if (ask === "up") {
    correctLatex = `(${r},\\infty)`;
    correctMath = `up_${r}`;
    wrongs = [
      { latex: `(-\\infty,${r})`, math: `down_${r}` },
      { latex: `(-\\infty,\\infty)`, math: "all" },
      { latex: String(r), math: `pt_${r}` },
    ];
    prompt = `f''(x)=x-${r}.\\\\ \\text{Where is }f\\text{ concave up?}`;
    solution = `\\(f''>0\\) when \\(x>${r}\\).`;
  } else if (ask === "down") {
    correctLatex = `(-\\infty,${r})`;
    correctMath = `down_${r}`;
    wrongs = [
      { latex: `(${r},\\infty)`, math: `up_${r}` },
      { latex: `(-\\infty,\\infty)`, math: "all" },
      { latex: String(r), math: `pt_${r}` },
    ];
    prompt = `f''(x)=x-${r}.\\\\ \\text{Where is }f\\text{ concave down?}`;
    solution = `\\(f''<0\\) when \\(x<${r}\\).`;
  } else {
    correctLatex = String(r);
    correctMath = String(r);
    wrongs = [
      { latex: String(r + 1), math: String(r + 1) },
      { latex: String(r - 1), math: String(r - 1) },
      { latex: "\\text{none}", math: "none" },
    ];
    prompt = `f''(x)=x-${r}.\\\\ \\text{Inflection point at }x=?`;
    solution = `\\(f''\\) changes sign at \\(x=${r}\\).`;
  }

  void difficulty;
  return {
    id: problemId("sdt-1"),
    skillId: "second-derivative-test",
    promptLatex: prompt,
    answerType: "choice-text",
    correctAnswerLatex: correctLatex,
    correctAnswerMath: correctMath,
    choices: shuffleTextChoices(correctLatex, correctMath, wrongs),
    solutionLatex: solution,
    difficulty,
  };
};

/** f''(x)=(x-a)(x-b) */
const twoRoots: Template = (difficulty) => {
  const pair = pick([
    [-2, 1],
    [-1, 2],
    [0, 2],
    [-3, 1],
    [1, 3],
  ] as const);
  const [r1, r2] = pair[0]! <= pair[1]! ? pair : [pair[1]!, pair[0]!];
  const ask = pick(["up", "down", "inflect"] as const);

  let correctLatex: string;
  let correctMath: string;
  let wrongs: { latex: string; math: string }[];
  let prompt: string;
  let solution: string;

  if (ask === "up") {
    correctLatex = `(-\\infty,${r1})\\cup(${r2},\\infty)`;
    correctMath = `up_out_${r1}_${r2}`;
    wrongs = [
      { latex: `(${r1},${r2})`, math: `up_in_${r1}_${r2}` },
      { latex: `(${r1},\\infty)`, math: `up_right_${r1}` },
      { latex: `(-\\infty,${r2})`, math: `up_left_${r2}` },
    ];
    prompt = `f''(x)=(x-${r1})(x-${r2}).\\\\ \\text{Where is }f\\text{ concave up?}`;
    solution = `\\(f''>0\\) outside the roots.`;
  } else if (ask === "down") {
    correctLatex = `(${r1},${r2})`;
    correctMath = `down_in_${r1}_${r2}`;
    wrongs = [
      { latex: `(-\\infty,${r1})\\cup(${r2},\\infty)`, math: `down_out_${r1}_${r2}` },
      { latex: `(-\\infty,${r1})`, math: `down_left_${r1}` },
      { latex: `(${r2},\\infty)`, math: `down_right_${r2}` },
    ];
    prompt = `f''(x)=(x-${r1})(x-${r2}).\\\\ \\text{Where is }f\\text{ concave down?}`;
    solution = `\\(f''<0\\) between \\(${r1}\\) and \\(${r2}\\).`;
  } else {
    correctLatex = `x=${r1}\\text{ and }x=${r2}`;
    correctMath = `inf_${r1}_${r2}`;
    wrongs = [
      { latex: `x=${r1}\\text{ only}`, math: `inf_only_${r1}` },
      { latex: `x=${r2}\\text{ only}`, math: `inf_only_${r2}` },
      { latex: "\\text{none}", math: "none" },
    ];
    prompt = `f''(x)=(x-${r1})(x-${r2}).\\\\ \\text{Inflection point(s) at:}`;
    solution = `\\(f''\\) changes sign at both \\(x=${r1}\\) and \\(x=${r2}\\).`;
  }

  void difficulty;
  return {
    id: problemId("sdt-2"),
    skillId: "second-derivative-test",
    promptLatex: prompt,
    answerType: "choice-text",
    correctAnswerLatex: correctLatex,
    correctAnswerMath: correctMath,
    choices: shuffleTextChoices(correctLatex, correctMath, wrongs),
    solutionLatex: solution,
    difficulty,
  };
};

const TEMPLATES_BY_DIFFICULTY: Record<Difficulty, Template[]> = {
  1: [secondDerivClassify, singleRoot],
  2: [secondDerivClassify, singleRoot, twoRoots],
  3: [secondDerivClassify, twoRoots],
};

export function generateSecondDerivativeTest(difficulty: Difficulty = 1): Problem {
  return pick(TEMPLATES_BY_DIFFICULTY[difficulty])(difficulty);
}

export function generateSecondDerivativeTestSet(
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
    problems.push(generateSecondDerivativeTest(difficulty));
  }
  return problems;
}
