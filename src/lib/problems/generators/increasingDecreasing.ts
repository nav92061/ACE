/**
 * Skill 8 — Increasing / decreasing from f'(x).
 * Factored f' or simple sign info; ask intervals or relative extrema.
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

/** f'(x) = (x-a)(x-b) — ask where increasing */
const twoLinearFactors: Template = (difficulty) => {
  const roots = pick([
    [-2, 1],
    [-1, 2],
    [0, 3],
    [-3, 0],
    [1, 4],
    [-2, 2],
  ] as const);
  const [r1, r2] = roots[0]! <= roots[1]! ? roots : [roots[1]!, roots[0]!];
  // f' = (x-r1)(x-r2): positive outside, negative between (opens up)
  const ask = pick(["inc", "dec", "relmax", "relmin"] as const);

  let correctLatex: string;
  let correctMath: string;
  let wrongs: { latex: string; math: string }[];
  let solution: string;

  if (ask === "inc") {
    correctLatex = `(-\\infty,${r1})\\cup(${r2},\\infty)`;
    correctMath = `inc_out_${r1}_${r2}`;
    wrongs = [
      { latex: `(${r1},${r2})`, math: `inc_in_${r1}_${r2}` },
      { latex: `(-\\infty,${r2})`, math: `inc_left_${r2}` },
      { latex: `(${r1},\\infty)`, math: `inc_right_${r1}` },
    ];
    solution = `\\(f'(x)=(x-${r1})(x-${r2})\\) is positive for \\(x<${r1}\\) and \\(x>${r2}\\).`;
  } else if (ask === "dec") {
    correctLatex = `(${r1},${r2})`;
    correctMath = `dec_in_${r1}_${r2}`;
    wrongs = [
      { latex: `(-\\infty,${r1})\\cup(${r2},\\infty)`, math: `dec_out_${r1}_${r2}` },
      { latex: `(-\\infty,${r1})`, math: `dec_left_${r1}` },
      { latex: `(${r2},\\infty)`, math: `dec_right_${r2}` },
    ];
    solution = `\\(f'\\) is negative between the roots \\(${r1}\\) and \\(${r2}\\).`;
  } else if (ask === "relmax") {
    // changes + to − at r1
    correctLatex = String(r1);
    correctMath = String(r1);
    wrongs = [
      { latex: String(r2), math: String(r2) },
      { latex: String((r1 + r2) / 2), math: String((r1 + r2) / 2) },
      { latex: "\\text{none}", math: "none" },
    ];
    solution = `\\(f'\\) changes from \\(+\\) to \\(-\\) at \\(x=${r1}\\) (relative max).`;
  } else {
    correctLatex = String(r2);
    correctMath = String(r2);
    wrongs = [
      { latex: String(r1), math: String(r1) },
      { latex: String(r1 + r2), math: String(r1 + r2) },
      { latex: "\\text{none}", math: "none" },
    ];
    solution = `\\(f'\\) changes from \\(-\\) to \\(+\\) at \\(x=${r2}\\) (relative min).`;
  }

  const promptAsk =
    ask === "inc"
      ? "\\text{On which interval(s) is }f\\text{ increasing?}"
      : ask === "dec"
        ? "\\text{On which interval(s) is }f\\text{ decreasing?}"
        : ask === "relmax"
          ? "\\text{Where does }f\\text{ have a relative maximum?}"
          : "\\text{Where does }f\\text{ have a relative minimum?}";

  void difficulty;
  return {
    id: problemId("id-2f"),
    skillId: "increasing-decreasing",
    promptLatex: `f'(x)=(x-${r1})(x-${r2}).\\\\ ${promptAsk}`,
    answerType: "choice-text",
    correctAnswerLatex: correctLatex,
    correctAnswerMath: correctMath,
    choices: shuffleTextChoices(correctLatex, correctMath, wrongs),
    solutionLatex: solution,
    difficulty,
  };
};

/** f'(x) = x(x-a)(x-b) or simpler: f'(x)=x-a */
const singleRoot: Template = (difficulty) => {
  const r = pick([-3, -2, -1, 1, 2, 3]);
  const askInc = Math.random() < 0.5;
  // f'(x)=x-r: increasing on (r,∞), decreasing on (-∞,r)
  const correctLatex = askInc ? `(${r},\\infty)` : `(-\\infty,${r})`;
  const correctMath = askInc ? `inc_${r}` : `dec_${r}`;
  const wrongs = [
    { latex: askInc ? `(-\\infty,${r})` : `(${r},\\infty)`, math: askInc ? `dec_${r}` : `inc_${r}` },
    { latex: `(-\\infty,${r})\\cup(${r},\\infty)`, math: `all_but_${r}` },
    { latex: String(r), math: `pt_${r}` },
  ];

  void difficulty;
  return {
    id: problemId("id-1f"),
    skillId: "increasing-decreasing",
    promptLatex: `f'(x)=x-${r}.\\\\ \\text{On which interval is }f\\text{ ${askInc ? "increasing" : "decreasing"}?}`,
    answerType: "choice-text",
    correctAnswerLatex: correctLatex,
    correctAnswerMath: correctMath,
    choices: shuffleTextChoices(correctLatex, correctMath, wrongs),
    solutionLatex: askInc
      ? `\\(f'(x)>0\\) when \\(x>${r}\\).`
      : `\\(f'(x)<0\\) when \\(x<${r}\\).`,
    difficulty,
  };
};

/** Sign chart description: f' positive on (-∞,2), negative on (2,∞) */
const signChart: Template = (difficulty) => {
  const c = pick([-1, 0, 1, 2, 3]);
  const ask = pick(["inc", "relmax", "relmin"] as const);
  // Assume f' > 0 left of c, f' < 0 right → rel max at c, increasing on (-∞,c)
  let correctLatex: string;
  let correctMath: string;
  let wrongs: { latex: string; math: string }[];
  let prompt: string;
  let solution: string;

  if (ask === "inc") {
    correctLatex = `(-\\infty,${c})`;
    correctMath = `inc_${c}`;
    wrongs = [
      { latex: `(${c},\\infty)`, math: `dec_${c}` },
      { latex: `(-\\infty,\\infty)`, math: "all" },
      { latex: String(c), math: `pt_${c}` },
    ];
    prompt = `f'(x)>0\\text{ on }(-\\infty,${c})\\text{ and }f'(x)<0\\text{ on }(${c},\\infty).\\text{ Where is }f\\text{ increasing?}`;
    solution = `Increasing where \\(f'>0\\): \\((-\\infty,${c})\\).`;
  } else if (ask === "relmax") {
    correctLatex = String(c);
    correctMath = String(c);
    wrongs = [
      { latex: "\\text{none}", math: "none" },
      { latex: String(c + 1), math: String(c + 1) },
      { latex: String(c - 1), math: String(c - 1) },
    ];
    prompt = `f'(x)>0\\text{ on }(-\\infty,${c})\\text{ and }f'(x)<0\\text{ on }(${c},\\infty).\\text{ Relative maximum at }x=?`;
    solution = `\\(f'\\) changes \\(+\\) to \\(-\\) at \\(x=${c}\\).`;
  } else {
    // flip signs for rel min scenario
    correctLatex = String(c);
    correctMath = String(c);
    wrongs = [
      { latex: "\\text{none}", math: "none" },
      { latex: String(c + 1), math: String(c + 1) },
      { latex: String(c - 1), math: String(c - 1) },
    ];
    prompt = `f'(x)<0\\text{ on }(-\\infty,${c})\\text{ and }f'(x)>0\\text{ on }(${c},\\infty).\\text{ Relative minimum at }x=?`;
    solution = `\\(f'\\) changes \\(-\\) to \\(+\\) at \\(x=${c}\\).`;
  }

  void difficulty;
  return {
    id: problemId("id-sign"),
    skillId: "increasing-decreasing",
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
  1: [singleRoot, signChart],
  2: [singleRoot, twoLinearFactors, signChart],
  3: [twoLinearFactors, signChart],
};

export function generateIncreasingDecreasing(difficulty: Difficulty = 1): Problem {
  return pick(TEMPLATES_BY_DIFFICULTY[difficulty])(difficulty);
}

export function generateIncreasingDecreasingSet(
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
    problems.push(generateIncreasingDecreasing(difficulty));
  }
  return problems;
}
