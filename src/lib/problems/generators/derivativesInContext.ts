/**
 * Derivatives in Context (4.1–4.3).
 * Interpret f′ as a rate of change in a word problem.
 */

import type { Difficulty, Problem } from "@/types";
import { pick, problemId, randInt } from "../random";

type Template = (difficulty: Difficulty) => Problem;

function shuffleMc(
  correctLatex: string,
  correctMath: string,
  wrongs: { latex: string; math: string }[],
): Problem["choices"] {
  const unique = wrongs.filter((w) => w.math !== correctMath);
  while (unique.length < 3) {
    unique.push({ latex: `\\text{fallback ${unique.length}}`, math: `fallback${unique.length}` });
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

/** “f′(a)=b means…” interpretation MC */
const interpretRate: Template = (difficulty) => {
  const t = randInt(2, 8);
  const rate = difficulty === 1 ? randInt(1, 5) : randInt(2, 9);
  const contexts = [
    {
      setup: `h(t)\\text{ is the height (in feet) of a balloon }t\\text{ seconds after launch.}`,
      correct: `\\text{The balloon is rising at }${rate}\\text{ ft/s at }t=${t}.`,
      correctMath: "rising",
      wrongs: [
        {
          latex: `\\text{The balloon's height is }${rate}\\text{ ft at }t=${t}.`,
          math: "height",
        },
        {
          latex: `\\text{The balloon rose }${rate}\\text{ ft in the first }${t}\\text{ seconds.}`,
          math: "total",
        },
        {
          latex: `\\text{The balloon is falling at }${rate}\\text{ ft/s at }t=${t}.`,
          math: "falling",
        },
      ],
      promptVal: `h'(${t})=${rate}`,
      solution: `\\(h'(${t})=${rate}\\) means the instantaneous rate of change of height is \\(${rate}\\) ft/s (rising) at \\(t=${t}\\).`,
    },
    {
      setup: `C(x)\\text{ is the cost (in dollars) of producing }x\\text{ items.}`,
      correct: `\\text{Producing one more item near }x=${t}\\text{ costs about }\\$${rate}.`,
      correctMath: "marginal",
      wrongs: [
        {
          latex: `\\text{The total cost of }${t}\\text{ items is }\\$${rate}.`,
          math: "total",
        },
        {
          latex: `\\text{Each of the }${t}\\text{ items costs }\\$${rate}.`,
          math: "avg",
        },
        {
          latex: `\\text{Profit is }\\$${rate}\\text{ when }x=${t}.`,
          math: "profit",
        },
      ],
      promptVal: `C'(${t})=${rate}`,
      solution: `\\(C'(${t})=${rate}\\) is the marginal cost near \\(x=${t}\\): about \\$${rate} per additional item.`,
    },
    {
      setup: `P(t)\\text{ is a city's population (in thousands) }t\\text{ years after 2010.}`,
      correct: `\\text{Population is growing by about }${rate}\\text{ thousand people/year in year }${t}.`,
      correctMath: "growing",
      wrongs: [
        {
          latex: `\\text{Population is }${rate}\\text{ thousand in year }${t}.`,
          math: "level",
        },
        {
          latex: `\\text{Population grew by }${rate}\\text{ thousand over }${t}\\text{ years.}`,
          math: "net",
        },
        {
          latex: `\\text{Population is shrinking by }${rate}\\text{ thousand/year.}`,
          math: "shrink",
        },
      ],
      promptVal: `P'(${t})=${rate}`,
      solution: `\\(P'(${t})=${rate}\\) is the instantaneous growth rate (thousands per year) at year \\(${t}\\).`,
    },
  ] as const;

  const ctx = pick(contexts);
  void difficulty;
  return {
    id: problemId("dic-interp"),
    skillId: "derivatives-in-context",
    promptLatex: `${ctx.setup}\\\\ ${ctx.promptVal}\\text{ means:}`,
    answerType: "multiple-choice",
    correctAnswerLatex: ctx.correct,
    correctAnswerMath: ctx.correctMath,
    choices: shuffleMc(ctx.correct, ctx.correctMath, [...ctx.wrongs]),
    solutionLatex: ctx.solution,
    difficulty,
  };
};

/** Given a short context, ask for the numerical rate (units implied) */
const readRateNumber: Template = (difficulty) => {
  const a = randInt(1, 6);
  const rate = difficulty >= 2 ? randInt(2, 8) : randInt(1, 5);
  const scenarios = [
    {
      prompt: `V'(${a})=${rate}.\\\\ \\text{V is volume in cm}^3\\text{ at time t seconds.}\\\\ \\text{What is }\\dfrac{dV}{dt}\\text{ at }t=${a}?`,
      answer: rate,
      solution: `\\dfrac{dV}{dt} at t=${a} is V'(${a})=${rate}.`,
    },
    {
      prompt: `s(t)\\text{ is position (m) at time t (s).}\\\\ s'(${a})=${rate}.\\\\ \\text{What is the velocity at }t=${a}?`,
      answer: rate,
      solution: `Velocity is s'(t), so at t=${a} the velocity is ${rate} m/s.`,
    },
    {
      prompt: `T(x)\\text{ is temperature (°C) x km from a city.}\\\\ T'(${a})=-${rate}.\\\\ \\text{Enter the signed rate of change per km at }x=${a}.`,
      answer: -rate,
      solution: `T'(${a})=-${rate} °C/km.`,
    },
  ] as const;

  const s = pick(scenarios);
  return {
    id: problemId("dic-num"),
    skillId: "derivatives-in-context",
    promptLatex: s.prompt,
    answerType: "number",
    correctAnswerLatex: String(s.answer),
    correctAnswerMath: String(s.answer),
    solutionLatex: s.solution,
    difficulty,
  };
};

/** Units of the derivative */
const unitsMc: Template = (difficulty) => {
  const cases = [
    {
      prompt: `A(t)\\text{ = area in m}^2,\\; t\\text{ in seconds. Units of }A'(t)?`,
      correct: "\\text{m}^2/\\text{s}",
      correctMath: "m2_s",
      wrongs: [
        { latex: "\\text{m}^2", math: "m2" },
        { latex: "\\text{m}/\\text{s}", math: "m_s" },
        { latex: "\\text{m}^2\\cdot\\text{s}", math: "m2s" },
      ],
    },
    {
      prompt: `C(x)\\text{ = cost in dollars, }x\\text{ = items. Units of }C'(x)?`,
      correct: "\\text{dollars/item}",
      correctMath: "dollars_item",
      wrongs: [
        { latex: "\\text{dollars}", math: "dollars" },
        { latex: "\\text{items}", math: "items" },
        { latex: "\\text{items/dollar}", math: "items_dollar" },
      ],
    },
    {
      prompt: `v(t)\\text{ = velocity in m/s, }t\\text{ in seconds. Units of }v'(t)?`,
      correct: "\\text{m}/\\text{s}^2",
      correctMath: "m_s2",
      wrongs: [
        { latex: "\\text{m}/\\text{s}", math: "m_s" },
        { latex: "\\text{m}", math: "m" },
        { latex: "\\text{s}/\\text{m}", math: "s_m" },
      ],
    },
  ] as const;

  const c = pick(cases);
  void difficulty;
  return {
    id: problemId("dic-units"),
    skillId: "derivatives-in-context",
    promptLatex: c.prompt,
    answerType: "multiple-choice",
    correctAnswerLatex: c.correct,
    correctAnswerMath: c.correctMath,
    choices: shuffleMc(c.correct, c.correctMath, [...c.wrongs]),
    solutionLatex: `The derivative has units of (output units)/(input units): \\(${c.correct}\\).`,
    difficulty,
  };
};

const TEMPLATES_BY_DIFFICULTY: Record<Difficulty, Template[]> = {
  1: [interpretRate, unitsMc],
  2: [interpretRate, readRateNumber, unitsMc],
  3: [interpretRate, readRateNumber],
};

export function generateDerivativesInContext(difficulty: Difficulty = 1): Problem {
  return pick(TEMPLATES_BY_DIFFICULTY[difficulty])(difficulty);
}

export function generateDerivativesInContextSet(
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
    problems.push(generateDerivativesInContext(difficulty));
  }
  return problems;
}
