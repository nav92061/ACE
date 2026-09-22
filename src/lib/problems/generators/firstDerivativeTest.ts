/**
 * First Derivative Test (5.4).
 * Classify relative max/min from f′ sign change.
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
    unique.push({ latex: `\\text{fallback}`, math: `fb${unique.length}` });
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

const CLASS_CHOICES = {
  max: { latex: "\\text{relative maximum}", math: "relmax" },
  min: { latex: "\\text{relative minimum}", math: "relmin" },
  neither: { latex: "\\text{neither}", math: "neither" },
} as const;

/** Sign chart: + to − → max; − to + → min */
const signChartClassify: Template = (difficulty) => {
  const c = pick([-2, -1, 0, 1, 2, 3]);
  const kind = pick(["max", "min", "neither"] as const);

  let prompt: string;
  let correct = CLASS_CHOICES[kind];
  let solution: string;

  if (kind === "max") {
    prompt = `f'\\text{ changes from }+\\text{ to }-\\text{ at }x=${c}.\\\\ \\text{At }x=${c},\\;f\\text{ has a:}`;
    solution = `+ to - means a relative maximum.`;
  } else if (kind === "min") {
    prompt = `f'\\text{ changes from }-\\text{ to }+\\text{ at }x=${c}.\\\\ \\text{At }x=${c},\\;f\\text{ has a:}`;
    solution = `- to + means a relative minimum.`;
  } else {
    // no sign change
    const side = pick(["pos", "neg"] as const);
    if (side === "pos") {
      prompt = `f'>0\\text{ on both sides of }x=${c}\\text{ (and }f'(${c})=0).\\\\ \\text{At }x=${c},\\;f\\text{ has a:}`;
      solution = `No sign change ⇒ neither relative max nor min.`;
    } else {
      prompt = `f'<0\\text{ on both sides of }x=${c}\\text{ (and }f'(${c})=0).\\\\ \\text{At }x=${c},\\;f\\text{ has a:}`;
      solution = `No sign change ⇒ neither relative max nor min.`;
    }
  }

  const wrongs: { latex: string; math: string }[] = (["max", "min", "neither"] as const)
    .filter((k) => k !== kind)
    .map((k) => CLASS_CHOICES[k]);
  // need 3 wrongs — add a distractor
  wrongs.push({ latex: "\\text{inflection point}", math: "inflect" });

  void difficulty;
  return {
    id: problemId("fdt-sign"),
    skillId: "first-derivative-test",
    promptLatex: prompt,
    answerType: "multiple-choice",
    correctAnswerLatex: correct.latex,
    correctAnswerMath: correct.math,
    choices: shuffleMc(correct.latex, correct.math, wrongs),
    solutionLatex: solution,
    difficulty,
  };
};

/** Factored f' = (x-a)(x-b): classify at a given root */
const factoredClassify: Template = (difficulty) => {
  const pair = pick([
    [-2, 1],
    [-1, 2],
    [0, 3],
    [1, 4],
  ] as const);
  const [r1, r2] = pair[0]! <= pair[1]! ? pair : [pair[1]!, pair[0]!];
  // f'=(x-r1)(x-r2): + outside, − between → max at r1, min at r2
  const at = pick(["r1", "r2"] as const);
  const x = at === "r1" ? r1 : r2;
  const kind = at === "r1" ? "max" : "min";
  const correct = CLASS_CHOICES[kind];
  const wrongs = [
    CLASS_CHOICES[kind === "max" ? "min" : "max"],
    CLASS_CHOICES.neither,
    { latex: "\\text{absolute maximum}", math: "absmax" },
  ];

  void difficulty;
  return {
    id: problemId("fdt-fact"),
    skillId: "first-derivative-test",
    promptLatex: `f'(x)=(x-${r1})(x-${r2}).\\\\ \\text{At }x=${x},\\;f\\text{ has a:}`,
    answerType: "multiple-choice",
    correctAnswerLatex: correct.latex,
    correctAnswerMath: correct.math,
    choices: shuffleMc(correct.latex, correct.math, wrongs),
    solutionLatex:
      kind === "max"
        ? `\\(f'\\) goes \\(+\\) to \\(-\\) at \\(x=${r1}\\) ⇒ relative max.`
        : `\\(f'\\) goes \\(-\\) to \\(+\\) at \\(x=${r2}\\) ⇒ relative min.`,
    difficulty,
  };
};

/** f'(x)=x(x-a)² style — neither at double root */
const doubleRootNeither: Template = (difficulty) => {
  const a = pick([1, 2, 3, -1]);
  // f'(x)=(x-a)²: always ≥0, no sign change at a → neither
  // Or f'(x)=x²(x-a): sign change only at 0? Keep simple: (x-a)²
  const askNeither = Math.random() < 0.5;
  if (askNeither) {
    const correct = CLASS_CHOICES.neither;
    const wrongs = [CLASS_CHOICES.max, CLASS_CHOICES.min, { latex: "\\text{inflection}", math: "inf" }];
    void difficulty;
    return {
      id: problemId("fdt-double"),
      skillId: "first-derivative-test",
      promptLatex: `f'(x)=(x-${a})^{2}.\\\\ \\text{At }x=${a},\\;f\\text{ has a:}`,
      answerType: "multiple-choice",
      correctAnswerLatex: correct.latex,
      correctAnswerMath: correct.math,
      choices: shuffleMc(correct.latex, correct.math, wrongs),
      solutionLatex: `\\((x-${a})^{2}\\) does not change sign ⇒ neither max nor min.`,
      difficulty,
    };
  }
  // f'(x)=-(x-a): + left? Wait f'=a-x: positive for x<a, negative for x>a → max at a
  const correct = CLASS_CHOICES.max;
  const wrongs = [CLASS_CHOICES.min, CLASS_CHOICES.neither, { latex: "\\text{inflection}", math: "inf" }];
  return {
    id: problemId("fdt-linear"),
    skillId: "first-derivative-test",
    promptLatex: `f'(x)=${a}-x.\\\\ \\text{At }x=${a},\\;f\\text{ has a:}`,
    answerType: "multiple-choice",
    correctAnswerLatex: correct.latex,
    correctAnswerMath: correct.math,
    choices: shuffleMc(correct.latex, correct.math, wrongs),
    solutionLatex: `\\(f'\\) changes \\(+\\) to \\(-\\) at \\(x=${a}\\) ⇒ relative max.`,
    difficulty,
  };
};

const TEMPLATES_BY_DIFFICULTY: Record<Difficulty, Template[]> = {
  1: [signChartClassify],
  2: [signChartClassify, factoredClassify],
  3: [signChartClassify, factoredClassify, doubleRootNeither],
};

export function generateFirstDerivativeTest(difficulty: Difficulty = 1): Problem {
  return pick(TEMPLATES_BY_DIFFICULTY[difficulty])(difficulty);
}

export function generateFirstDerivativeTestSet(
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
    problems.push(generateFirstDerivativeTest(difficulty));
  }
  return problems;
}
