import { setNumberFor } from "./daily";
import { RUN_LENGTH } from "./limits";
import type { Difficulty, GraphSpec, Problem, Unit } from "./types";

export const BASE_KM: Record<Difficulty, number> = {
  easy: 10,
  medium: 30,
  hard: 60,
  rare: 100,
};

const RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2, rare: 3 };

function prob(
  p: Omit<Problem, "base"> & { difficulty: Difficulty },
): Problem {
  return { ...p, base: BASE_KM[p.difficulty] };
}

const line = (graph: Omit<GraphSpec, "points"> & { points: GraphSpec["points"] }): GraphSpec =>
  graph;

/**
 * Calc AB bank. Today's six are chosen from this list, same set for every student.
 * solveRate is a teacher estimate until real attempt counts exist.
 */
export const PROBLEMS: Problem[] = [
  prob({
    id: "lim-factor",
    unit: "Limits",
    topic: "Removable discontinuity",
    prompt: [
      { kind: "text", value: "Evaluate" },
      { kind: "math", value: "\\lim_{x \\to 2} \\dfrac{x^{2}-4}{x-2}" },
    ],
    type: "mc",
    choices: [
      { id: "a", latex: "0" },
      { id: "b", latex: "2" },
      { id: "c", latex: "4" },
      { id: "d", latex: "\\text{does not exist}" },
    ],
    answer: "c",
    explanation: "Factor x² − 4 as (x − 2)(x + 2), cancel, and the limit is 4.",
    hint: "Factor the numerator as a difference of squares before you plug in.",
    difficulty: "easy",
    solveRate: 0.78,
  }),
  prob({
    id: "lim-infinity",
    unit: "Limits",
    topic: "End behavior",
    prompt: [
      { kind: "text", value: "Evaluate" },
      { kind: "math", value: "\\lim_{x \\to \\infty} \\dfrac{3x^{2}+1}{x^{2}}" },
    ],
    type: "numeric",
    answer: "3",
    explanation: "Divide every term by x². The limit of the ratio of leading coefficients is 3.",
    hint: "For a rational function, compare the degrees and the leading coefficients.",
    difficulty: "easy",
    solveRate: 0.7,
  }),
  prob({
    id: "lim-hole",
    unit: "Limits",
    topic: "Algebraic limit",
    prompt: [
      { kind: "text", value: "Evaluate" },
      { kind: "math", value: "\\lim_{x \\to 3} \\dfrac{x-3}{x^{2}-9}" },
    ],
    type: "numeric",
    answer: "1/6",
    explanation: "Factor x² − 9 as (x − 3)(x + 3), cancel, and the limit is 1/6.",
    hint: "The denominator is a difference of squares. Cancel the common factor.",
    difficulty: "medium",
    solveRate: 0.44,
  }),
  prob({
    id: "deriv-power",
    unit: "Derivatives",
    topic: "Power rule",
    prompt: [
      { kind: "text", value: "Find f′(x) if" },
      { kind: "math", value: "f(x)=x^{3}-4x" },
    ],
    type: "expression",
    answer: "3x^{2}-4",
    explanation: "The power rule gives 3x² from x³, and the derivative of −4x is −4.",
    hint: "Bring each exponent down in front, then subtract 1 from that exponent.",
    difficulty: "easy",
    solveRate: 0.74,
  }),
  prob({
    id: "deriv-higher",
    unit: "Derivatives",
    topic: "Power rule",
    prompt: [
      { kind: "text", value: "Find f′(x) if" },
      { kind: "math", value: "f(x)=5x^{4}-2x" },
    ],
    type: "expression",
    answer: "20x^{3}-2",
    explanation: "The derivative of 5x⁴ is 20x³, and the derivative of −2x is −2.",
    hint: "Multiply by the old exponent, then reduce the exponent by 1.",
    difficulty: "easy",
    solveRate: 0.66,
  }),
  prob({
    id: "deriv-chain",
    unit: "Derivatives",
    topic: "Chain rule",
    prompt: [
      { kind: "text", value: "Find f′(x) if" },
      { kind: "math", value: "f(x)=(x^{2}+1)^{3}" },
    ],
    type: "expression",
    answer: "6x(x^{2}+1)^{2}",
    explanation: "The outer derivative is 3(x² + 1)², times the inner derivative 2x, which is 6x(x² + 1)².",
    hint: "Differentiate the outside power, then multiply by the derivative of the inside.",
    difficulty: "medium",
    solveRate: 0.42,
  }),
  prob({
    id: "opt-rect",
    unit: "Applications",
    topic: "Optimization",
    prompt: [
      {
        kind: "text",
        value: "A rectangle has side lengths x and 10 − x. What value of x maximizes the area?",
      },
    ],
    type: "numeric",
    answer: "5",
    explanation: "A = x(10 − x). Then A′ = 10 − 2x = 0, so the maximum is at x = 5.",
    hint: "Write area as a function of x and set its derivative equal to 0.",
    difficulty: "medium",
    solveRate: 0.46,
  }),
  prob({
    id: "linear-sqrt",
    unit: "Applications",
    topic: "Linear approximation",
    prompt: [
      {
        kind: "text",
        value: "Use the tangent line to √x at x = 4 to approximate √4.1.",
      },
    ],
    type: "numeric",
    answer: "2.025",
    explanation: "f′(x) = 1/(2√x), so L(x) = 2 + (1/4)(x − 4) and L(4.1) = 2.025.",
    hint: "The approximation is f(a) + f′(a)(x − a). Here a = 4.",
    difficulty: "hard",
    solveRate: 0.28,
  }),
  prob({
    id: "related-balloon",
    unit: "Applications",
    topic: "Related rates",
    prompt: [
      {
        kind: "text",
        value: "A balloon’s radius is 3 cm and grows at 2 cm/s. How fast is the volume growing, in cm³/s? Give the coefficient of π.",
      },
    ],
    type: "numeric",
    answer: "72",
    explanation: "V = (4/3)πr³, so dV/dt = 4πr² dr/dt = 4π(9)(2) = 72π.",
    hint: "Differentiate V = (4/3)πr³ with respect to t, then plug in r and dr/dt.",
    difficulty: "hard",
    solveRate: 0.24,
  }),
  prob({
    id: "crit-count",
    unit: "Analytical",
    topic: "Critical points",
    prompt: [
      {
        kind: "text",
        value: "How many critical points does f(x) = x³ − 3x have?",
      },
    ],
    type: "numeric",
    answer: "2",
    explanation: "f′(x) = 3x² − 3 = 3(x − 1)(x + 1), so the critical points are x = −1 and x = 1.",
    hint: "Critical points are where f′ is zero or undefined.",
    difficulty: "easy",
    solveRate: 0.61,
  }),
  prob({
    id: "inc-intervals",
    unit: "Analytical",
    topic: "Increasing intervals",
    prompt: [
      { kind: "text", value: "f′(x) = (x − 1)(x − 4). On which set is f increasing?" },
    ],
    type: "mc",
    choices: [
      { id: "a", latex: "(-\\infty,1)\\cup(4,\\infty)" },
      { id: "b", latex: "(1,4)" },
      { id: "c", latex: "\\{1,4\\}" },
      { id: "d", latex: "(-\\infty,\\infty)" },
    ],
    answer: "a",
    explanation: "f′ is positive outside the roots, so f increases on (−∞, 1) and (4, ∞).",
    hint: "f increases where f′ is positive. Sketch the sign of the factored derivative.",
    difficulty: "medium",
    solveRate: 0.4,
  }),
  prob({
    id: "mvt-square",
    unit: "Analytical",
    topic: "Mean Value Theorem",
    prompt: [
      {
        kind: "text",
        value: "For f(x) = x² on [1, 3], find the c guaranteed by the Mean Value Theorem.",
      },
    ],
    type: "numeric",
    answer: "2",
    explanation: "The average rate is (9 − 1)/(3 − 1) = 4, and f′(c) = 2c = 4, so c = 2.",
    hint: "Set f′(c) equal to the slope between the endpoints.",
    difficulty: "medium",
    solveRate: 0.38,
  }),
  prob({
    id: "int-cubic",
    unit: "Integrals",
    topic: "Definite integral",
    prompt: [
      { kind: "text", value: "Evaluate" },
      { kind: "math", value: "\\int_{0}^{2} 3x^{2}\\,dx" },
    ],
    type: "numeric",
    answer: "8",
    explanation: "An antiderivative is x³, and 2³ − 0³ = 8.",
    hint: "Find an antiderivative, then subtract its value at the left endpoint.",
    difficulty: "medium",
    solveRate: 0.48,
    graph: line({
      xLabel: "x",
      yLabel: "y",
      xMin: 0,
      xMax: 2.5,
      yMin: 0,
      yMax: 14,
      points: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.75 },
        { x: 1, y: 3 },
        { x: 1.5, y: 6.75 },
        { x: 2, y: 12 },
      ],
      shadeFrom: 0,
      shadeTo: 2,
      xTicks: [0, 1, 2],
    }),
  }),
  prob({
    id: "int-linear",
    unit: "Integrals",
    topic: "Definite integral",
    prompt: [
      { kind: "text", value: "Evaluate" },
      { kind: "math", value: "\\int_{1}^{3} 2x\\,dx" },
    ],
    type: "numeric",
    answer: "8",
    explanation: "An antiderivative is x², and 3² − 1² = 8.",
    hint: "The antiderivative of 2x is x². Evaluate it at both bounds.",
    difficulty: "easy",
    solveRate: 0.72,
  }),
  prob({
    id: "int-area",
    unit: "Integrals",
    topic: "Area",
    prompt: [
      { kind: "text", value: "The graph shows y = x. What is the area under the line from x = 0 to x = 2?" },
    ],
    type: "numeric",
    answer: "2",
    explanation: "The region is a triangle with base 2 and height 2, so the area is 2. The integral of x from 0 to 2 is also 2.",
    hint: "Area under a line from the origin is a triangle: one half times base times height.",
    difficulty: "easy",
    solveRate: 0.69,
    graph: line({
      xLabel: "x",
      yLabel: "y",
      xMin: 0,
      xMax: 3,
      yMin: 0,
      yMax: 3,
      points: [
        { x: 0, y: 0 },
        { x: 3, y: 3 },
      ],
      shadeFrom: 0,
      shadeTo: 2,
      xTicks: [0, 2],
    }),
  }),
  prob({
    id: "int-poly",
    unit: "Integrals",
    topic: "Definite integral",
    prompt: [
      { kind: "text", value: "Evaluate" },
      { kind: "math", value: "\\int_{0}^{1} (3x^{2}+1)\\,dx" },
    ],
    type: "numeric",
    answer: "2",
    explanation: "An antiderivative is x³ + x, and (1 + 1) − 0 = 2.",
    hint: "Integrate term by term, then evaluate from 0 to 1.",
    difficulty: "medium",
    solveRate: 0.5,
  }),
  prob({
    id: "int-usub",
    unit: "Integrals",
    topic: "Substitution",
    prompt: [
      { kind: "text", value: "Evaluate" },
      { kind: "math", value: "\\int_{0}^{1} 2x(x^{2}+1)^{2}\\,dx" },
    ],
    type: "numeric",
    answer: "7/3",
    explanation: "Let u = x² + 1. Then the integral becomes ∫ from 1 to 2 of u² du, which is 7/3.",
    hint: "The factor 2x is the derivative of the inside, x² + 1.",
    difficulty: "hard",
    solveRate: 0.26,
  }),
  prob({
    id: "int-sine",
    unit: "Integrals",
    topic: "Trig integral",
    prompt: [
      { kind: "text", value: "Evaluate" },
      { kind: "math", value: "\\int_{0}^{\\pi} \\sin x\\,dx" },
    ],
    type: "numeric",
    answer: "2",
    explanation: "An antiderivative is −cos x, and −cos π − (−cos 0) = 1 + 1 = 2.",
    hint: "The antiderivative of sin x is −cos x. Watch the signs at the bounds.",
    difficulty: "medium",
    solveRate: 0.36,
  }),
  prob({
    id: "de-line",
    unit: "Differential equations",
    topic: "Initial value",
    prompt: [
      { kind: "text", value: "If dy/dx = 2 and y(1) = 5, what is y(x)?" },
    ],
    type: "expression",
    answer: "2x+3",
    explanation: "Integrate to get y = 2x + C. Then 2(1) + C = 5, so C = 3 and y = 2x + 3.",
    hint: "Integrate the slope, then use the given point to find the constant.",
    difficulty: "easy",
    solveRate: 0.58,
  }),
  prob({
    id: "de-parabola",
    unit: "Differential equations",
    topic: "Initial value",
    prompt: [
      { kind: "text", value: "If dy/dx = 4x and y(0) = 3, what is y(x)?" },
    ],
    type: "expression",
    answer: "2x^{2}+3",
    explanation: "Integrate to get y = 2x² + C. Then y(0) = 3 forces C = 3.",
    hint: "The antiderivative of 4x is 2x². The initial condition fixes the constant.",
    difficulty: "medium",
    solveRate: 0.41,
  }),
  prob({
    id: "de-value",
    unit: "Differential equations",
    topic: "Initial value",
    prompt: [
      {
        kind: "text",
        value: "If dy/dx = 6x² and y(1) = 2, what is y(2)?",
      },
    ],
    type: "numeric",
    answer: "16",
    explanation: "y = 2x³ + C and y(1) = 2 gives C = 0, so y(2) = 16.",
    hint: "Find the general solution, use y(1) = 2, then evaluate at x = 2.",
    difficulty: "hard",
    solveRate: 0.27,
  }),
  prob({
    id: "accum-rate",
    unit: "Accumulation",
    topic: "Net change",
    prompt: [
      {
        kind: "text",
        value: "Water enters a tank at r(t) = 4t liters per minute. How many liters enter from t = 1 to t = 3?",
      },
    ],
    type: "numeric",
    answer: "16",
    explanation: "∫ from 1 to 3 of 4t dt = 2t² from 1 to 3, which is 18 − 2 = 16.",
    hint: "Total change is the definite integral of the rate, not the rate itself.",
    difficulty: "hard",
    solveRate: 0.22,
    graph: line({
      xLabel: "t",
      yLabel: "r",
      xMin: 0,
      xMax: 4,
      yMin: 0,
      yMax: 16,
      points: [
        { x: 0, y: 0 },
        { x: 4, y: 16 },
      ],
      shadeFrom: 1,
      shadeTo: 3,
      xTicks: [1, 3],
    }),
  }),
  prob({
    id: "accum-ftc",
    unit: "Accumulation",
    topic: "Fundamental theorem",
    prompt: [
      { kind: "text", value: "Find the derivative of" },
      { kind: "math", value: "g(x)=\\int_{0}^{x} t^{2}\\,dt" },
    ],
    type: "expression",
    answer: "x^{2}",
    explanation: "By the Fundamental Theorem, the derivative of an integral from a constant to x is the integrand at x.",
    hint: "You do not need to integrate first. The upper limit is x.",
    difficulty: "medium",
    solveRate: 0.45,
  }),
  prob({
    id: "accum-average",
    unit: "Accumulation",
    topic: "Average value",
    prompt: [
      {
        kind: "text",
        value: "What is the average value of f(x) = x² on [0, 3]?",
      },
    ],
    type: "numeric",
    answer: "3",
    explanation: "The average value is (1/3) ∫ from 0 to 3 of x² dx = (1/3)(9) = 3.",
    hint: "Average value on [a, b] is 1/(b − a) times the definite integral.",
    difficulty: "hard",
    solveRate: 0.3,
  }),
  prob({
    id: "motion-rest",
    unit: "Particle motion",
    topic: "At rest",
    prompt: [
      {
        kind: "text",
        value: "A particle has velocity v(t) = 3t² − 6t. At what time in (0, 4) is it at rest?",
      },
    ],
    type: "numeric",
    answer: "2",
    explanation: "v(t) = 3t(t − 2) = 0 at t = 0 and t = 2. The time inside (0, 4) is t = 2.",
    hint: "At rest means velocity is zero. Factor v(t).",
    difficulty: "easy",
    solveRate: 0.63,
  }),
  prob({
    id: "motion-accel",
    unit: "Particle motion",
    topic: "Acceleration",
    prompt: [
      {
        kind: "text",
        value: "If v(t) = t² − 4t, what is the acceleration at t = 3?",
      },
    ],
    type: "numeric",
    answer: "2",
    explanation: "Acceleration is v′(t) = 2t − 4, so a(3) = 2.",
    hint: "Acceleration is the derivative of velocity.",
    difficulty: "easy",
    solveRate: 0.67,
  }),
  prob({
    id: "motion-distance",
    unit: "Particle motion",
    topic: "Total distance",
    prompt: [
      {
        kind: "text",
        value: "A particle has velocity v(t) = 6 − 2t on [0, 5]. What is the total distance traveled?",
      },
    ],
    type: "numeric",
    answer: "13",
    explanation: "Velocity changes sign at t = 3, so the distance is 9 + 4 = 13. Displacement would be only 5.",
    hint: "Distance uses |v(t)|. Split the integral where the velocity changes sign.",
    difficulty: "rare",
    solveRate: 0.08,
    graph: line({
      xLabel: "t",
      yLabel: "v",
      xMin: 0,
      xMax: 5,
      yMin: -6,
      yMax: 8,
      points: [
        { x: 0, y: 6 },
        { x: 5, y: -4 },
      ],
      shadeFrom: 0,
      shadeTo: 5,
      xTicks: [0, 3, 5],
    }),
  }),
];

export const UNITS: Unit[] = [
  "Limits",
  "Derivatives",
  "Applications",
  "Analytical",
  "Integrals",
  "Differential equations",
  "Accumulation",
  "Particle motion",
];

function pickFrom(pool: Problem[], index: number, used: Set<string>): Problem | undefined {
  if (!pool.length) return undefined;
  for (let step = 0; step < pool.length; step += 1) {
    const candidate = pool[(index + step) % pool.length];
    if (candidate && !used.has(candidate.id)) return candidate;
  }
  return undefined;
}

/** Same ten problems for every student on this UTC date. Always includes an integral. */
export function problemsForDate(d = new Date()): Problem[] {
  const n = setNumberFor(d);
  const used = new Set<string>();
  const integralPool = PROBLEMS.filter(
    (p) => p.unit === "Integrals" || p.unit === "Accumulation",
  );
  const first = integralPool[n % integralPool.length]!;
  used.add(first.id);
  const picked: Problem[] = [first];
  const spinning = UNITS.filter((unit) => unit !== first.unit);
  for (let i = 0; i < RUN_LENGTH - 1; i += 1) {
    const unit = spinning[(n + i) % spinning.length]!;
    const pool = PROBLEMS.filter((p) => p.unit === unit);
    const next = pickFrom(pool, n + i * 2, used) ?? pickFrom(PROBLEMS, n + i, used);
    if (!next) break;
    used.add(next.id);
    picked.push(next);
  }
  return picked.sort((a, b) => RANK[a.difficulty] - RANK[b.difficulty] || a.base - b.base);
}

/** A longer unscored flight made of problems that are not in today's scored set. */
export function unlimitedProblems(d = new Date()): Problem[] {
  const today = new Set(problemsForDate(d).map((p) => p.id));
  const rest = PROBLEMS.filter((p) => !today.has(p.id));
  const n = setNumberFor(d);
  const used = new Set<string>();
  const picked: Problem[] = [];
  for (let i = 0; i < RUN_LENGTH; i += 1) {
    const next = pickFrom(rest, n + i * 3, used);
    if (!next) break;
    used.add(next.id);
    picked.push(next);
  }
  return picked.sort((a, b) => RANK[a.difficulty] - RANK[b.difficulty] || a.base - b.base);
}

export function problemsForUnit(unit: string): Problem[] {
  return PROBLEMS.filter((p) => p.unit === unit);
}

export function problemById(id: string): Problem | undefined {
  return PROBLEMS.find((p) => p.id === id);
}
