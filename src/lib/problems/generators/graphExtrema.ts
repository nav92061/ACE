/**
 * Extrema from a Graph (5.8–5.9).
 * SVG coordinate-plane graphs with clear extrema; MC answers.
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
    unique.push({ latex: String(unique.length), math: `fb${unique.length}` });
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

/** Map math (x,y) to SVG pixel coords on viewBox 0 0 320 240; origin at (160,120), scale 20 */
function toSvg(x: number, y: number): { sx: number; sy: number } {
  return { sx: 160 + x * 20, sy: 120 - y * 20 };
}

function axisSvg(): string {
  return `
    <line x1="20" y1="120" x2="300" y2="120" stroke="#334" stroke-width="1.5"/>
    <line x1="160" y1="20" x2="160" y2="220" stroke="#334" stroke-width="1.5"/>
    <polygon points="300,120 292,116 292,124" fill="#334"/>
    <polygon points="160,20 156,28 164,28" fill="#334"/>
    <text x="292" y="138" font-size="12" fill="#334">x</text>
    <text x="168" y="28" font-size="12" fill="#334">y</text>
  `;
}

function pointDot(x: number, y: number, label: string): string {
  const { sx, sy } = toSvg(x, y);
  const labelY = sy < 50 ? sy + 16 : sy - 8;
  return `
    <circle cx="${sx}" cy="${sy}" r="4" fill="#c45"/>
    <text x="${sx + 6}" y="${labelY}" font-size="11" fill="#222">${label}</text>
  `;
}

function wrapSvg(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240" style="background:#fafafa;border-radius:4px">${axisSvg()}${inner}</svg>`;
}

/** Shape A: V-like with local min, higher endpoints — absolute max at one end */
const valleyGraph: Template = (difficulty) => {
  const minY = pick([-3, -2, -1]);
  const leftY = pick([1, 2, 3]);
  const rightY = pick([2, 3, 4].filter((v) => v !== leftY));
  const minX = pick([-1, 0, 1]);
  const leftX = minX - 3;
  const rightX = minX + 3;

  const pL = toSvg(leftX, leftY);
  const pM = toSvg(minX, minY);
  const pR = toSvg(rightX, rightY);
  const path = `M ${pL.sx} ${pL.sy} Q ${toSvg(minX - 1.2, (leftY + minY) / 2).sx} ${toSvg(minX - 1.2, (leftY + minY) / 2).sy} ${pM.sx} ${pM.sy} Q ${toSvg(minX + 1.2, (rightY + minY) / 2).sx} ${toSvg(minX + 1.2, (rightY + minY) / 2).sy} ${pR.sx} ${pR.sy}`;

  const graphSvg = wrapSvg(`
    <path d="${path}" fill="none" stroke="#2563eb" stroke-width="2.5"/>
    ${pointDot(leftX, leftY, `(${leftX},${leftY})`)}
    ${pointDot(minX, minY, `(${minX},${minY})`)}
    ${pointDot(rightX, rightY, `(${rightX},${rightY})`)}
  `);

  const absMax = Math.max(leftY, rightY);
  const absMaxX = leftY >= rightY ? leftX : rightX;
  const ask = pick(["abs_min_val", "abs_max_val", "local_min_x", "abs_max_x"] as const);

  let correctLatex: string;
  let correctMath: string;
  let prompt: string;
  let wrongs: { latex: string; math: string }[];
  let solution: string;

  if (ask === "abs_min_val") {
    correctLatex = String(minY);
    correctMath = String(minY);
    prompt = `\\text{From the graph of }f\\text{ on }[${leftX},${rightX}],\\text{ the absolute minimum value is:}`;
    wrongs = [
      { latex: String(leftY), math: String(leftY) },
      { latex: String(rightY), math: String(rightY) },
      { latex: String(minX), math: `x_${minX}` },
    ];
    solution = `Lowest point is \\((${minX},${minY})\\); absolute min value is \\(${minY}\\).`;
  } else if (ask === "abs_max_val") {
    correctLatex = String(absMax);
    correctMath = String(absMax);
    prompt = `\\text{From the graph of }f\\text{ on }[${leftX},${rightX}],\\text{ the absolute maximum value is:}`;
    wrongs = [
      { latex: String(minY), math: String(minY) },
      { latex: String(Math.min(leftY, rightY)), math: String(Math.min(leftY, rightY)) },
      { latex: String(absMaxX), math: `x_${absMaxX}` },
    ];
    solution = `Highest labeled endpoint is \\(${absMax}\\).`;
  } else if (ask === "local_min_x") {
    correctLatex = String(minX);
    correctMath = String(minX);
    prompt = `\\text{A local minimum occurs at }x=?`;
    wrongs = [
      { latex: String(leftX), math: String(leftX) },
      { latex: String(rightX), math: String(rightX) },
      { latex: String(minY), math: `y_${minY}` },
    ];
    solution = `Local (and absolute) min at \\(x=${minX}\\).`;
  } else {
    correctLatex = String(absMaxX);
    correctMath = String(absMaxX);
    prompt = `\\text{The absolute maximum on the closed interval occurs at }x=?`;
    wrongs = [
      { latex: String(minX), math: String(minX) },
      { latex: String(absMaxX === leftX ? rightX : leftX), math: String(absMaxX === leftX ? rightX : leftX) },
      { latex: String(absMax), math: `y_${absMax}` },
    ];
    solution = `Absolute max at endpoint \\(x=${absMaxX}\\).`;
  }

  void difficulty;
  return {
    id: problemId("ge-valley"),
    skillId: "graph-extrema",
    promptLatex: prompt,
    graphSvg,
    answerType: "multiple-choice",
    correctAnswerLatex: correctLatex,
    correctAnswerMath: correctMath,
    choices: shuffleMc(correctLatex, correctMath, wrongs),
    solutionLatex: solution,
    difficulty,
  };
};

/** Shape B: hill — local max in middle */
const hillGraph: Template = (difficulty) => {
  const maxY = pick([2, 3, 4]);
  const leftY = pick([-2, -1, 0]);
  const rightY = pick([-2, -1, 0, 1].filter((v) => v !== leftY));
  const maxX = pick([-1, 0, 1]);
  const leftX = maxX - 3;
  const rightX = maxX + 3;

  const pL = toSvg(leftX, leftY);
  const pM = toSvg(maxX, maxY);
  const pR = toSvg(rightX, rightY);
  const path = `M ${pL.sx} ${pL.sy} Q ${toSvg(maxX - 1, (leftY + maxY) / 2).sx} ${toSvg(maxX - 1, (leftY + maxY) / 2).sy} ${pM.sx} ${pM.sy} Q ${toSvg(maxX + 1, (rightY + maxY) / 2).sx} ${toSvg(maxX + 1, (rightY + maxY) / 2).sy} ${pR.sx} ${pR.sy}`;

  const graphSvg = wrapSvg(`
    <path d="${path}" fill="none" stroke="#2563eb" stroke-width="2.5"/>
    ${pointDot(leftX, leftY, `(${leftX},${leftY})`)}
    ${pointDot(maxX, maxY, `(${maxX},${maxY})`)}
    ${pointDot(rightX, rightY, `(${rightX},${rightY})`)}
  `);

  const absMin = Math.min(leftY, rightY);
  const absMinX = leftY <= rightY ? leftX : rightX;
  const ask = pick(["abs_max_val", "local_max_x", "abs_min_val"] as const);

  let correctLatex: string;
  let correctMath: string;
  let prompt: string;
  let wrongs: { latex: string; math: string }[];
  let solution: string;

  if (ask === "abs_max_val") {
    correctLatex = String(maxY);
    correctMath = String(maxY);
    prompt = `\\text{Absolute maximum value of }f\\text{ on }[${leftX},${rightX}]:`;
    wrongs = [
      { latex: String(leftY), math: String(leftY) },
      { latex: String(rightY), math: String(rightY) },
      { latex: String(maxX), math: `x_${maxX}` },
    ];
    solution = `Peak at \\((${maxX},${maxY})\\); absolute max value \\(${maxY}\\).`;
  } else if (ask === "local_max_x") {
    correctLatex = String(maxX);
    correctMath = String(maxX);
    prompt = `\\text{A local maximum occurs at }x=?`;
    wrongs = [
      { latex: String(leftX), math: String(leftX) },
      { latex: String(rightX), math: String(rightX) },
      { latex: String(maxY), math: `y_${maxY}` },
    ];
    solution = `Local max at \\(x=${maxX}\\).`;
  } else {
    correctLatex = String(absMin);
    correctMath = String(absMin);
    prompt = `\\text{Absolute minimum value on }[${leftX},${rightX}]:`;
    wrongs = [
      { latex: String(maxY), math: String(maxY) },
      { latex: String(Math.max(leftY, rightY)), math: String(Math.max(leftY, rightY)) },
      { latex: String(absMinX), math: `x_${absMinX}` },
    ];
    solution = `Lowest endpoint value is \\(${absMin}\\) at \\(x=${absMinX}\\).`;
  }

  void difficulty;
  return {
    id: problemId("ge-hill"),
    skillId: "graph-extrema",
    promptLatex: prompt,
    graphSvg,
    answerType: "multiple-choice",
    correctAnswerLatex: correctLatex,
    correctAnswerMath: correctMath,
    choices: shuffleMc(correctLatex, correctMath, wrongs),
    solutionLatex: solution,
    difficulty,
  };
};

/** Shape C: piecewise polyline with two turns (local max and local min) */
const zigzagGraph: Template = (difficulty) => {
  const y0 = pick([-1, 0, 1]);
  const y1 = y0 + pick([2, 3]); // local max
  const y2 = y1 - pick([3, 4]); // local min
  const y3 = y2 + pick([2, 3]);
  const xs = [-3, -1, 1, 3];
  const ys = [y0, y1, y2, y3];

  const pts = xs.map((x, i) => toSvg(x, ys[i]!));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.sx} ${p.sy}`).join(" ");

  const graphSvg = wrapSvg(`
    <path d="${path}" fill="none" stroke="#2563eb" stroke-width="2.5"/>
    ${xs.map((x, i) => pointDot(x, ys[i]!, `(${x},${ys[i]})`)).join("")}
  `);

  const localMaxY = y1;
  const localMinY = y2;
  const absMax = Math.max(...ys);
  const absMin = Math.min(...ys);
  const ask = pick(["local_max_val", "local_min_val", "abs_max_val", "abs_min_x"] as const);

  let correctLatex: string;
  let correctMath: string;
  let prompt: string;
  let wrongs: { latex: string; math: string }[];
  let solution: string;

  if (ask === "local_max_val") {
    correctLatex = String(localMaxY);
    correctMath = String(localMaxY);
    prompt = `\\text{The local maximum value is:}`;
    wrongs = [
      { latex: String(localMinY), math: String(localMinY) },
      { latex: String(y0), math: String(y0) },
      { latex: String(xs[1]), math: `x_${xs[1]}` },
    ];
    solution = `Local max at \\((${xs[1]},${y1})\\); value \\(${y1}\\).`;
  } else if (ask === "local_min_val") {
    correctLatex = String(localMinY);
    correctMath = String(localMinY);
    prompt = `\\text{The local minimum value is:}`;
    wrongs = [
      { latex: String(localMaxY), math: String(localMaxY) },
      { latex: String(y3), math: String(y3) },
      { latex: String(xs[2]), math: `x_${xs[2]}` },
    ];
    solution = `Local min at \\((${xs[2]},${y2})\\); value \\(${y2}\\).`;
  } else if (ask === "abs_max_val") {
    correctLatex = String(absMax);
    correctMath = String(absMax);
    prompt = `\\text{Absolute maximum value on }[-3,3]:`;
    wrongs = [
      { latex: String(absMin), math: String(absMin) },
      { latex: String(ys.find((y) => y !== absMax)!), math: "other" },
      { latex: String(xs[ys.indexOf(absMax)]!), math: "x_abs" },
    ];
    solution = `Highest y among labeled points is \\(${absMax}\\).`;
  } else {
    const absMinX = xs[ys.indexOf(absMin)]!;
    correctLatex = String(absMinX);
    correctMath = String(absMinX);
    prompt = `\\text{Absolute minimum occurs at }x=?`;
    wrongs = [
      { latex: String(xs[1]), math: String(xs[1]) },
      { latex: String(xs[0]), math: String(xs[0]) },
      { latex: String(absMin), math: `y_${absMin}` },
    ];
    solution = `Absolute min at \\(x=${absMinX}\\).`;
  }

  void difficulty;
  return {
    id: problemId("ge-zig"),
    skillId: "graph-extrema",
    promptLatex: prompt,
    graphSvg,
    answerType: "multiple-choice",
    correctAnswerLatex: correctLatex,
    correctAnswerMath: correctMath,
    choices: shuffleMc(correctLatex, correctMath, wrongs),
    solutionLatex: solution,
    difficulty,
  };
};

/** Shape D: smooth cubic-like S with inflection and one local max / one local min */
const cubicLikeGraph: Template = (difficulty) => {
  const maxX = -2;
  const minX = 2;
  const maxY = randInt(2, 4);
  const minY = -randInt(2, 4);
  const leftX = -4;
  const rightX = 4;
  const leftY = 0;
  const rightY = 0;

  // Approximate cubic with polyline through key points
  const keyXs = [leftX, maxX, 0, minX, rightX];
  const keyYs = [leftY, maxY, 0, minY, rightY];
  const pts = keyXs.map((x, i) => toSvg(x, keyYs[i]!));
  // Smooth-ish with quadratic midpoints
  let d = `M ${pts[0]!.sx} ${pts[0]!.sy}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]!;
    const cur = pts[i]!;
    const cx = (prev.sx + cur.sx) / 2;
    const cy = (prev.sy + cur.sy) / 2;
    d += ` Q ${cx} ${prev.sy} ${cur.sx} ${cur.sy}`;
  }

  const graphSvg = wrapSvg(`
    <path d="${d}" fill="none" stroke="#2563eb" stroke-width="2.5"/>
    ${pointDot(maxX, maxY, `(${maxX},${maxY})`)}
    ${pointDot(minX, minY, `(${minX},${minY})`)}
  `);

  const ask = pick(["local_max_val", "local_min_val", "local_max_x", "local_min_x"] as const);
  let correctLatex: string;
  let correctMath: string;
  let prompt: string;
  let wrongs: { latex: string; math: string }[];
  let solution: string;

  if (ask === "local_max_val") {
    correctLatex = String(maxY);
    correctMath = String(maxY);
    prompt = `\\text{Local maximum value:}`;
    wrongs = [
      { latex: String(minY), math: String(minY) },
      { latex: String(maxX), math: String(maxX) },
      { latex: "0", math: "0" },
    ];
    solution = `Local max at \\((${maxX},${maxY})\\).`;
  } else if (ask === "local_min_val") {
    correctLatex = String(minY);
    correctMath = String(minY);
    prompt = `\\text{Local minimum value:}`;
    wrongs = [
      { latex: String(maxY), math: String(maxY) },
      { latex: String(minX), math: String(minX) },
      { latex: "0", math: "0" },
    ];
    solution = `Local min at \\((${minX},${minY})\\).`;
  } else if (ask === "local_max_x") {
    correctLatex = String(maxX);
    correctMath = String(maxX);
    prompt = `\\text{Local maximum at }x=?`;
    wrongs = [
      { latex: String(minX), math: String(minX) },
      { latex: "0", math: "0" },
      { latex: String(maxY), math: `y_${maxY}` },
    ];
    solution = `Local max at \\(x=${maxX}\\).`;
  } else {
    correctLatex = String(minX);
    correctMath = String(minX);
    prompt = `\\text{Local minimum at }x=?`;
    wrongs = [
      { latex: String(maxX), math: String(maxX) },
      { latex: "0", math: "0" },
      { latex: String(minY), math: `y_${minY}` },
    ];
    solution = `Local min at \\(x=${minX}\\).`;
  }

  void difficulty;
  return {
    id: problemId("ge-cubic"),
    skillId: "graph-extrema",
    promptLatex: prompt,
    graphSvg,
    answerType: "multiple-choice",
    correctAnswerLatex: correctLatex,
    correctAnswerMath: correctMath,
    choices: shuffleMc(correctLatex, correctMath, wrongs),
    solutionLatex: solution,
    difficulty,
  };
};

const TEMPLATES_BY_DIFFICULTY: Record<Difficulty, Template[]> = {
  1: [valleyGraph, hillGraph],
  2: [valleyGraph, hillGraph, zigzagGraph],
  3: [zigzagGraph, cubicLikeGraph, hillGraph],
};

export function generateGraphExtrema(difficulty: Difficulty = 1): Problem {
  return pick(TEMPLATES_BY_DIFFICULTY[difficulty])(difficulty);
}

export function generateGraphExtremaSet(
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
    problems.push(generateGraphExtrema(difficulty));
  }
  return problems;
}
