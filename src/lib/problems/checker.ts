/**
 * Answer checker for ACE.
 *
 * Expressions: evaluate student vs correct at several random x values.
 * Antiderivatives: accept answers that differ by a constant.
 * Numbers: accept exact match or decimals rounded to 3 places.
 */

import { evaluate, parse } from "mathjs";
import type { GradedAnswer, Problem } from "@/types";

const TOLERANCE = 1e-6;
const SAMPLE_COUNT = 8;
const SAMPLE_MIN = -4;
const SAMPLE_MAX = 4;

export interface CheckOptions {
  /** In timed mode we still accept missing +C, but we won't nag as loudly. */
  timed?: boolean;
}

function safeEval(expr: string, scope: Record<string, number>): number | null {
  try {
    const cleaned = normalizeExpr(expr);
    const value = evaluate(cleaned, scope);
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return value;
  } catch {
    return null;
  }
}

/** Convert common student / LaTeX-ish input into math.js syntax. */
export function normalizeExpr(raw: string): string {
  let s = raw.trim();

  // Strip trailing + C / +C / + c
  s = s.replace(/\+\s*[Cc]\s*$/g, "").trim();

  // Common latex → math.js
  s = s
    .replace(/\\left|\\right/g, "")
    .replace(/\\,/g, "")
    .replace(/\\cdot/g, "*")
    .replace(/\\times/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))")
    .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\\ln/g, "log")
    .replace(/\\log/g, "log")
    .replace(/\\sin/g, "sin")
    .replace(/\\cos/g, "cos")
    .replace(/\\tan/g, "tan")
    .replace(/\\sec/g, "sec")
    .replace(/\\csc/g, "csc")
    .replace(/\\cot/g, "cot")
    .replace(/\\arcsin/g, "asin")
    .replace(/\\arccos/g, "acos")
    .replace(/\\arctan/g, "atan")
    .replace(/\\abs\{([^{}]+)\}/g, "abs($1)")
    .replace(/\|([^|]+)\|/g, "abs($1)")
    .replace(/\\e\^\{([^{}]+)\}/g, "exp($1)")
    .replace(/e\^\{([^{}]+)\}/g, "exp($1)")
    .replace(/\\e\^(\w)/g, "exp($1)")
    .replace(/\be\^(\w)/g, "exp($1)")
    .replace(/\\e\b/g, "e")
    .replace(/\^\{([^{}]+)\}/g, "^($1)")
    .replace(/\{|\}/g, "")
    .replace(/π/g, "pi")
    .replace(/\\pi/g, "pi")
    .replace(/√/g, "sqrt");

  // Sign cleanup: -- → +, +- → -, -+ → -
  s = s.replace(/--/g, "+");
  s = s.replace(/\+-/g, "-");
  s = s.replace(/-\+/g, "-");
  s = s.replace(/\+\+/g, "+");

  // Implicit multiplication: 2x → 2*x, )( → )*(
  s = s.replace(/(\d)([a-zA-Z(])/g, "$1*$2");
  s = s.replace(/(\))(\()/g, "$1*$2");
  s = s.replace(/(\))([a-zA-Z])/g, "$1*$2");

  return s;
}

function samplePoints(): number[] {
  const pts: number[] = [];
  // Avoid x=0 for ln|x| / 1/x style problems by skipping near-zero when needed.
  while (pts.length < SAMPLE_COUNT) {
    const x =
      SAMPLE_MIN + Math.random() * (SAMPLE_MAX - SAMPLE_MIN);
    if (Math.abs(x) < 0.3) continue;
    pts.push(x);
  }
  return pts;
}

function nearlyEqual(a: number, b: number, tol = TOLERANCE): boolean {
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Check two expressions agree on sample points. */
export function expressionsMatch(
  student: string,
  correct: string,
): boolean {
  const pts = samplePoints();
  for (const x of pts) {
    const a = safeEval(student, { x, t: x, e: Math.E, pi: Math.PI });
    const b = safeEval(correct, { x, t: x, e: Math.E, pi: Math.PI });
    if (a === null || b === null) return false;
    if (!nearlyEqual(a, b)) return false;
  }
  return true;
}

/**
 * Antiderivative check: student − correct should be (nearly) constant.
 * We compare differences across sample points.
 */
export function antiderivativesMatch(
  student: string,
  correct: string,
): boolean {
  const pts = samplePoints();
  const diffs: number[] = [];
  for (const x of pts) {
    const a = safeEval(student, { x, t: x, e: Math.E, pi: Math.PI });
    const b = safeEval(correct, { x, t: x, e: Math.E, pi: Math.PI });
    if (a === null || b === null) return false;
    diffs.push(a - b);
  }
  const first = diffs[0]!;
  return diffs.every((d) => nearlyEqual(d, first, 1e-4));
}

export function hadPlusC(raw: string): boolean {
  return /\+\s*[Cc]\s*$/.test(raw.trim());
}

export function numbersMatch(student: string, correct: string): boolean {
  if (student == null || correct == null) return false;
  if (!String(student).trim()) return false; // blank is always wrong
  const s = normalizeExpr(String(student));
  const c = normalizeExpr(String(correct));
  if (!s || !c) return false;

  // Exact string after normalize
  if (s === c) return true;

  const studentNum = safeEval(s, { e: Math.E, pi: Math.PI });
  const correctNum = safeEval(c, { e: Math.E, pi: Math.PI });
  if (studentNum === null || correctNum === null) return false;

  // Round both to 3 decimal places
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return r(studentNum) === r(correctNum);
}

export function checkAnswer(
  problem: Problem,
  studentRaw: string,
  options: CheckOptions = {},
): GradedAnswer {
  const base: GradedAnswer = {
    problemId: problem.id,
    correct: false,
    studentAnswer: studentRaw,
    correctAnswerLatex: problem.correctAnswerLatex,
    solutionLatex: problem.solutionLatex,
  };

  if (!studentRaw.trim()) {
    return {
      ...base,
      feedback: explainWrong({
        studentAnswer: "",
        correctAnswerMath: problem.correctAnswerMath,
        correctAnswerLatex: problem.correctAnswerLatex,
        solutionLatex: problem.solutionLatex,
        answerType: problem.answerType,
        choices: problem.choices,
      }),
    };
  }

  if (!problem.correctAnswerMath) {
    return { ...base, feedback: "Missing answer key." };
  }

  if (problem.answerType === "multiple-choice" || problem.answerType === "choice-text") {
    const chosen = problem.choices?.find((c) => c.id === studentRaw || c.value === studentRaw);
    const ok =
      chosen?.value === problem.correctAnswerMath ||
      studentRaw === problem.correctAnswerMath;
    if (ok) return { ...base, correct: true };
    return {
      ...base,
      correct: false,
      feedback: explainWrong({
        studentAnswer: studentRaw,
        correctAnswerMath: problem.correctAnswerMath,
        correctAnswerLatex: problem.correctAnswerLatex,
        solutionLatex: problem.solutionLatex,
        answerType: problem.answerType,
        choices: problem.choices,
      }),
    };
  }

  if (problem.answerType === "number") {
    const ok = numbersMatch(studentRaw, problem.correctAnswerMath);
    if (ok) return { ...base, correct: true };
    return {
      ...base,
      correct: false,
      feedback: explainWrong({
        studentAnswer: studentRaw,
        correctAnswerMath: problem.correctAnswerMath,
        correctAnswerLatex: problem.correctAnswerLatex,
        solutionLatex: problem.solutionLatex,
        answerType: problem.answerType,
      }),
    };
  }

  // expression / interval (interval strings compared via expression eval when possible)
  if (problem.isAntiderivative) {
    const ok = antiderivativesMatch(studentRaw, problem.correctAnswerMath);
    const missingPlusC = ok && !hadPlusC(studentRaw);
    return {
      ...base,
      correct: ok,
      missingPlusC,
      feedback: ok
        ? missingPlusC && !options.timed
          ? "Correct — remember to write + C for indefinite integrals."
          : undefined
        : explainWrong({
            studentAnswer: studentRaw,
            correctAnswerMath: problem.correctAnswerMath,
            correctAnswerLatex: problem.correctAnswerLatex,
            solutionLatex: problem.solutionLatex,
            answerType: problem.answerType,
            isAntiderivative: true,
          }),
    };
  }

  // Try parsing to catch garbage early
  try {
    parse(normalizeExpr(studentRaw));
  } catch {
    return {
      ...base,
      feedback: explainWrong({
        studentAnswer: studentRaw,
        correctAnswerMath: problem.correctAnswerMath,
        correctAnswerLatex: problem.correctAnswerLatex,
        solutionLatex: problem.solutionLatex,
        answerType: problem.answerType,
      }),
    };
  }

  const ok = expressionsMatch(studentRaw, problem.correctAnswerMath);
  if (ok) return { ...base, correct: true };
  return {
    ...base,
    correct: false,
    feedback: explainWrong({
      studentAnswer: studentRaw,
      correctAnswerMath: problem.correctAnswerMath,
      correctAnswerLatex: problem.correctAnswerLatex,
      solutionLatex: problem.solutionLatex,
      answerType: problem.answerType,
    }),
  };
}

export function scoreTimed(correctCount: number, wrongCount: number, penalty = 0.5): number {
  return Math.max(0, correctCount - penalty * wrongCount);
}

/** Short plain-English reason a graded answer was wrong (for the review screen). */
export function explainWrong(opts: {
  studentAnswer: string;
  correctAnswerMath: string;
  correctAnswerLatex: string;
  solutionLatex?: string;
  answerType: string;
  isAntiderivative?: boolean;
  choices?: { id: string; value: string; latex?: string }[];
}): string {
  const raw = (opts.studentAnswer ?? "").trim();
  const right = latexToPlainSafe(opts.correctAnswerLatex) || opts.correctAnswerLatex;
  const idea = opts.solutionLatex
    ? latexToPlainSafe(opts.solutionLatex)
    : "";

  if (!raw) {
    return idea
      ? `You left this blank. Correct answer: ${right}. ${idea}`
      : `You left this blank — no answer was submitted. Correct answer: ${right}.`;
  }

  if (opts.answerType === "multiple-choice" || opts.answerType === "choice-text") {
    const chosen = opts.choices?.find(
      (c) => c.id === raw || c.value === raw,
    );
    const correct = opts.choices?.find(
      (c) => c.value === opts.correctAnswerMath,
    );
    const picked = latexToPlainSafe(chosen?.latex || chosen?.value || raw);
    const rightChoice = latexToPlainSafe(
      correct?.latex || opts.correctAnswerLatex,
    );
    const base = `You picked “${picked}”, but the correct choice is “${rightChoice}”.`;
    return idea ? `${base} ${idea}` : base;
  }

  if (opts.answerType === "number") {
    const studentNum = safeEval(normalizeExpr(raw), {
      e: Math.E,
      pi: Math.PI,
    });
    let base: string;
    if (studentNum === null) {
      base = `Couldn't read “${raw}” as a number. Correct value: ${right}.`;
    } else if (Math.abs(studentNum) === Math.abs(Number(opts.correctAnswerMath)) &&
      studentNum !== Number(opts.correctAnswerMath) &&
      Number.isFinite(Number(opts.correctAnswerMath))) {
      base = `Sign error — you had ${raw}, but the correct value is ${right}.`;
    } else {
      base = `Your value (${raw}) isn't equal to ${right}. Recheck the equation setup and algebra.`;
    }
    return idea ? `${base} ${idea}` : base;
  }

  try {
    parse(normalizeExpr(raw));
  } catch {
    return `Couldn't parse “${raw}” as an expression (check parentheses / notation). Correct answer: ${right}.${idea ? ` ${idea}` : ""}`;
  }

  if (opts.isAntiderivative) {
    const base = `That antiderivative isn't equivalent to ${right} (up to a constant). Differentiating your answer should recover the integrand.`;
    return idea ? `${base} ${idea}` : base;
  }

  const base = `Your expression “${raw}” isn't equivalent to ${right}.`;
  return idea ? `${base} ${idea}` : `${base} See the solution below.`;
}

function latexToPlainSafe(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\\dfrac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\\ln\b/g, "ln")
    .replace(/\\log\b/g, "log")
    .replace(/\\pi\b/g, "π")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\left|\\right/g, "")
    .replace(/\\Rightarrow/g, "⇒")
    .replace(/\\Rightarrow/g, "⇒")
    .replace(/\\quad\s*/g, " ")
    .replace(/\\\\/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

