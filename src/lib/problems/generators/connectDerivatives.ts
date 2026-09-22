/**
 * Connecting f, f′, f″ (5.8–5.9).
 * From a verbal or simple graph description of f, ask about f′ or f″ sign.
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

const SIGN = {
  pos: { latex: "f'>0", math: "fp_pos" },
  neg: { latex: "f'<0", math: "fp_neg" },
  zero: { latex: "f'=0", math: "fp_zero" },
} as const;

const SIGN2 = {
  pos: { latex: "f''>0", math: "fpp_pos" },
  neg: { latex: "f''<0", math: "fpp_neg" },
  zero: { latex: "f''=0", math: "fpp_zero" },
} as const;

/** Increasing/decreasing → f′ sign */
const verbalFp: Template = (difficulty) => {
  const c = pick([1, 2, 3, -1]);
  const cases = [
    {
      prompt: `\\text{On an interval, }f\\text{ is increasing. Which must be true?}`,
      correct: SIGN.pos,
      wrongs: [SIGN.neg, SIGN.zero, { latex: "f''>0", math: "fpp" }],
      solution: `Increasing ⇒ \\(f'>0\\) (typically).`,
    },
    {
      prompt: `\\text{On an interval, }f\\text{ is decreasing. Which must be true?}`,
      correct: SIGN.neg,
      wrongs: [SIGN.pos, SIGN.zero, { latex: "f''<0", math: "fpp" }],
      solution: `Decreasing ⇒ \\(f'<0\\).`,
    },
    {
      prompt: `f\\text{ has a horizontal tangent at }x=${c}.\\text{ Then:}`,
      correct: SIGN.zero,
      wrongs: [SIGN.pos, SIGN.neg, { latex: "f''>0", math: "fpp" }],
      solution: `Horizontal tangent ⇒ \\(f'(${c})=0\\).`,
    },
  ] as const;

  const cse = pick(cases);
  void difficulty;
  return {
    id: problemId("cd-fp"),
    skillId: "connect-derivatives",
    promptLatex: cse.prompt,
    answerType: "multiple-choice",
    correctAnswerLatex: cse.correct.latex,
    correctAnswerMath: cse.correct.math,
    choices: shuffleMc(cse.correct.latex, cse.correct.math, [...cse.wrongs]),
    solutionLatex: cse.solution,
    difficulty,
  };
};

/** Concavity → f″ sign */
const verbalFpp: Template = (difficulty) => {
  const cases = [
    {
      prompt: `\\text{On an interval, }f\\text{ is concave up. Then:}`,
      correct: SIGN2.pos,
      wrongs: [SIGN2.neg, SIGN2.zero, { latex: "f'>0", math: "fp" }],
      solution: `Concave up ⇒ \\(f''>0\\).`,
    },
    {
      prompt: `\\text{On an interval, }f\\text{ is concave down. Then:}`,
      correct: SIGN2.neg,
      wrongs: [SIGN2.pos, SIGN2.zero, { latex: "f'<0", math: "fp" }],
      solution: `Concave down ⇒ \\(f''<0\\).`,
    },
    {
      prompt: `\\text{At an inflection point, }f''\\text{ typically:}`,
      correct: { latex: "\\text{changes sign}", math: "changes" },
      wrongs: [
        { latex: "\\text{is always positive}", math: "always_pos" },
        { latex: "\\text{equals }f'", math: "eq_fp" },
        { latex: "\\text{does not exist}", math: "dne" },
      ],
      solution: `Inflection: \\(f''\\) changes sign.`,
    },
  ] as const;

  const cse = pick(cases);
  void difficulty;
  return {
    id: problemId("cd-fpp"),
    skillId: "connect-derivatives",
    promptLatex: cse.prompt,
    answerType: "multiple-choice",
    correctAnswerLatex: cse.correct.latex,
    correctAnswerMath: cse.correct.math,
    choices: shuffleMc(cse.correct.latex, cse.correct.math, [...cse.wrongs]),
    solutionLatex: cse.solution,
    difficulty,
  };
};

/** Graph description of f → ask f′ or f″ on an interval */
const graphDesc: Template = (difficulty) => {
  const scenarios = [
    {
      prompt: `\\text{The graph of }f\\text{ rises from left to right and bends like a cup (concave up). On that interval:}`,
      correct: { latex: "f'>0\\text{ and }f''>0", math: "pp" },
      wrongs: [
        { latex: "f'>0\\text{ and }f''<0", math: "pn" },
        { latex: "f'<0\\text{ and }f''>0", math: "np" },
        { latex: "f'<0\\text{ and }f''<0", math: "nn" },
      ],
      solution: `Rising ⇒ \\(f'>0\\); cup shape ⇒ \\(f''>0\\).`,
    },
    {
      prompt: `\\text{The graph of }f\\text{ falls from left to right and is concave down. On that interval:}`,
      correct: { latex: "f'<0\\text{ and }f''<0", math: "nn" },
      wrongs: [
        { latex: "f'>0\\text{ and }f''<0", math: "pn" },
        { latex: "f'<0\\text{ and }f''>0", math: "np" },
        { latex: "f'>0\\text{ and }f''>0", math: "pp" },
      ],
      solution: `Falling ⇒ \\(f'<0\\); concave down ⇒ \\(f''<0\\).`,
    },
    {
      prompt: `\\text{Near a local max, just to the left }f\\text{ is increasing and just to the right }f\\text{ is decreasing. Then }f'\\text{ changes:}`,
      correct: { latex: "+\\text{ to }-", math: "plus_minus" },
      wrongs: [
        { latex: "-\\text{ to }+", math: "minus_plus" },
        { latex: "\\text{stays positive}", math: "stay_pos" },
        { latex: "\\text{stays negative}", math: "stay_neg" },
      ],
      solution: `Relative max: \\(f'\\) changes from \\(+\\) to \\(-\\).`,
    },
  ] as const;

  const s = pick(scenarios);
  void difficulty;
  return {
    id: problemId("cd-graph"),
    skillId: "connect-derivatives",
    promptLatex: s.prompt,
    answerType: "multiple-choice",
    correctAnswerLatex: s.correct.latex,
    correctAnswerMath: s.correct.math,
    choices: shuffleMc(s.correct.latex, s.correct.math, [...s.wrongs]),
    solutionLatex: s.solution,
    difficulty,
  };
};

/** Match: if f′ is increasing then f″ … */
const fpIncreasing: Template = (difficulty) => {
  const ask = pick(["fp_inc", "fp_dec"] as const);
  if (ask === "fp_inc") {
    const correct = SIGN2.pos;
    const wrongs = [SIGN2.neg, SIGN2.zero, { latex: "f'=0", math: "fp0" }];
    void difficulty;
    return {
      id: problemId("cd-fpinc"),
      skillId: "connect-derivatives",
      promptLatex: `\\text{If }f'\\text{ is increasing on an interval, then:}`,
      answerType: "multiple-choice",
      correctAnswerLatex: correct.latex,
      correctAnswerMath: correct.math,
      choices: shuffleMc(correct.latex, correct.math, wrongs),
      solutionLatex: `\\(f'\\) increasing ⇒ \\((f')'=f''>0\\).`,
      difficulty,
    };
  }
  const correct = SIGN2.neg;
  const wrongs = [SIGN2.pos, SIGN2.zero, { latex: "f'>0", math: "fppos" }];
  return {
    id: problemId("cd-fpdec"),
    skillId: "connect-derivatives",
    promptLatex: `\\text{If }f'\\text{ is decreasing on an interval, then:}`,
    answerType: "multiple-choice",
    correctAnswerLatex: correct.latex,
    correctAnswerMath: correct.math,
    choices: shuffleMc(correct.latex, correct.math, wrongs),
    solutionLatex: `\\(f'\\) decreasing ⇒ \\(f''<0\\).`,
    difficulty,
  };
};

const TEMPLATES_BY_DIFFICULTY: Record<Difficulty, Template[]> = {
  1: [verbalFp, verbalFpp],
  2: [verbalFp, verbalFpp, graphDesc],
  3: [graphDesc, fpIncreasing, verbalFpp],
};

export function generateConnectDerivatives(difficulty: Difficulty = 1): Problem {
  return pick(TEMPLATES_BY_DIFFICULTY[difficulty])(difficulty);
}

export function generateConnectDerivativesSet(
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
    problems.push(generateConnectDerivatives(difficulty));
  }
  return problems;
}
