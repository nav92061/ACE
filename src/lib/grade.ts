import { evaluate } from "mathjs";
import type { Problem } from "./types";

/** Turn student LaTeX or plain typing into something math.js can evaluate. */
export function normalizeExpr(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\\placeholder\{[^{}]*\}/g, "");
  s = s.replace(/\\placeholder/g, "");
  s = s.replace(/\\exponentialE/g, "e");
  s = s.replace(/\\imaginaryI/g, "i");
  s = s.replace(/\\differentialD/g, "d");
  s = s.replace(/\\left|\\right/g, "");
  s = s.replace(/\\,/g, "");
  s = s.replace(/\\cdot/g, "*");
  s = s.replace(/\\times/g, "*");
  s = s.replace(/\\div/g, "/");
  s = s.replace(/\\dfrac/g, "\\frac");
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))");
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)");
  s = s.replace(/\^\{([^{}]+)\}/g, "^($1)");
  s = s.replace(/[{}]/g, "");
  s = s.replace(/π/g, "pi");
  s = s.replace(/\\pi/g, "pi");
  s = s.replace(/--/g, "+");
  s = s.replace(/\+-/g, "-");
  s = s.replace(/-\+/g, "-");
  s = s.replace(/(\d)([a-zA-Z(])/g, "$1*$2");
  s = s.replace(/([0-9a-zA-Z)])\(/g, "$1*(");
  s = s.replace(/\b(sin|cos|tan|log|ln|sqrt|exp|abs|asin|acos|atan)\*\(/g, "$1(");
  s = s.replace(/\)\(/g, ")*(");
  return s;
}

function safeEval(expr: string, scope: Record<string, number>): number | null {
  try {
    const value = evaluate(normalizeExpr(expr), scope);
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return value;
  } catch {
    return null;
  }
}

const SCOPE = { e: Math.E, pi: Math.PI };

export function answersMatch(problem: Problem, raw: string): boolean {
  const student = raw.trim();
  if (!student) return false;

  if (problem.type === "mc") return student === problem.answer;

  if (problem.type === "numeric") {
    const got = safeEval(student, SCOPE);
    const want = safeEval(problem.answer, SCOPE);
    if (got === null || want === null) return false;
    return Math.abs(got - want) <= 0.001;
  }

  const xs = [-2, -1, -0.5, 0.5, 1, 1.5, 2, 3];
  let compared = 0;
  for (const x of xs) {
    const got = safeEval(student, { ...SCOPE, x });
    const want = safeEval(problem.answer, { ...SCOPE, x });
    if (got === null || want === null) continue;
    compared += 1;
    const tol = Math.max(0.001, 1e-3 * Math.abs(want));
    if (Math.abs(got - want) > tol) return false;
  }
  return compared >= 4;
}

export function correctLatex(problem: Problem): string {
  if (problem.type === "mc") {
    return problem.choices?.find((c) => c.id === problem.answer)?.latex ?? problem.answer;
  }
  return problem.answer;
}
