/**
 * Structured prompts — math and English never share a KaTeX string.
 */
import type { PromptLine, PromptPart, Problem } from "@/types";

export function math(value: string): PromptPart {
  return { kind: "math", value };
}

export function text(value: string): PromptPart {
  return { kind: "text", value };
}

/** One visual row. */
export function row(...parts: PromptPart[]): PromptLine {
  return parts.filter((p) => p.value.trim().length > 0);
}

/** Build promptLines and a legacy promptLatex string. */
export function prompt(...lines: PromptLine[]): {
  promptLines: PromptLine[];
  promptLatex: string;
} {
  const promptLines = lines.filter((l) => l.length > 0);
  const promptLatex = promptLines
    .map((line) =>
      line
        .map((p) => (p.kind === "text" ? `\\text{${p.value}}` : p.value))
        .join(" "),
    )
    .join("\\\\ ");
  return { promptLines, promptLatex };
}

export function solution(
  ...lines: PromptLine[]
): { solutionLines: PromptLine[]; solutionLatex: string } {
  const solutionLines = lines.filter((l) => l.length > 0);
  const solutionLatex = solutionLines
    .map((line) =>
      line
        .map((p) => (p.kind === "text" ? `\\text{${p.value}}` : p.value))
        .join(" "),
    )
    .join("\\\\ ");
  return { solutionLines, solutionLatex };
}

/** Strip leftover delimiters from a math-only fragment. */
function stripMathDelims(s: string): string {
  return s
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .trim();
}

/**
 * Parse one segment into alternating text/math parts.
 * Handles \(...\), \[...\], $...$, and \text{...}.
 */
function segmentToParts(raw: string): PromptPart[] {
  const parts: PromptPart[] = [];
  // Match math delimiters OR \text{...} OR remaining runs
  const re =
    /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\$([^$]+)\$|\\text\{([^{}]*)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    if (m.index > last) {
      pushPlain(parts, raw.slice(last, m.index));
    }
    if (m[1] != null || m[2] != null || m[3] != null || m[4] != null) {
      const mathBit = stripMathDelims(m[1] ?? m[2] ?? m[3] ?? m[4] ?? "");
      if (mathBit) parts.push(math(mathBit));
    } else if (m[5] != null) {
      const t = m[5].replace(/\s+/g, " ").trim();
      if (t) parts.push(text(t));
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) {
    pushPlain(parts, raw.slice(last));
  }
  return parts.filter((p) => p.value.trim().length > 0);
}

/**
 * Leftover text with no delimiters may still contain latex commands (f', frac, etc.).
 * Heuristic: if it looks like pure math, treat as math; else as English text,
 * extracting obvious latex commands as math islands.
 */
function pushPlain(parts: PromptPart[], chunk: string) {
  let s = chunk
    .replace(/\\quad\s*/g, " ")
    .replace(/\\qquad\s*/g, " ")
    .replace(/\\;/g, " ")
    .replace(/\\,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return;

  // Pure math fragment (no letters that look like English words)
  if (looksLikeMathOnly(s)) {
    parts.push(math(stripMathDelims(s)));
    return;
  }

  // Split English from inline latex commands like f'(x)=0 or \frac{...}
  const mathIsland =
    /(\\dfrac\{[^{}]+\}\{[^{}]+\}|\\frac\{[^{}]+\}\{[^{}]+\}|\\sqrt\{[^{}]+\}|[a-zA-Z]'*\([^)]*\)|[a-zA-Z]'+(?:\([^)]*\))?|=|\\[a-zA-Z]+(?:\{[^{}]*\})*)+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let found = false;
  while ((m = mathIsland.exec(s))) {
    // Only treat as math island if it has a backslash or prime/paren pattern
    const bit = m[0];
    if (!/[\\'=()]/.test(bit) && !/\\/.test(bit)) continue;
    found = true;
    if (m.index > last) {
      const t = s.slice(last, m.index).replace(/\s+/g, " ").trim();
      if (t) parts.push(text(t));
    }
    const mathBit = stripMathDelims(bit).trim();
    if (mathBit) parts.push(math(mathBit));
    last = m.index + bit.length;
  }
  if (!found) {
    parts.push(text(s));
    return;
  }
  if (last < s.length) {
    const t = s.slice(last).replace(/\s+/g, " ").trim();
    if (t) parts.push(text(t));
  }
}

function looksLikeMathOnly(s: string): boolean {
  // Has latex commands or is mostly symbols / short identifiers
  if (/\\[a-zA-Z]+/.test(s)) return true;
  if (/\\text\{/.test(s)) return false;
  const words = s.match(/[A-Za-z]{4,}/g) ?? [];
  const english = words.filter(
    (w) =>
      !/^(frac|dfrac|sqrt|cdot|times|left|right|infty|leq|geq|sin|cos|tan|ln|log|max|min)$/i.test(
        w,
      ),
  );
  return english.length === 0 && /[=+\-*/^_{}\\()]/.test(s);
}

/**
 * Convert legacy latex prompts/solutions into structured lines.
 * Preserves \(math\) vs English so KaTeX never sees prose.
 */
export function latexToLines(raw: string): PromptLine[] {
  if (!raw?.trim()) return [[{ kind: "text", value: "" }]];

  let s = raw
    .replace(/\\quad\s*/g, "\\\\ ")
    .replace(/\\qquad\s*/g, "\\\\ ");

  // Force line breaks before common question stems glued after math
  s = s.replace(
    /([.!?])\s*\\text\{/g,
    "$1\\\\ \\text{",
  );
  s = s.replace(
    /\\text\{([^{}]*?)\.\s+(When|Find|Where|At|By|What|How|Enter|Relative|On which|The|Use|If|Maximize|Critical|Square|Ladder|Two|Open|An |A )\b([^{}]*)\}/gi,
    (_m, a: string, b: string, c: string) =>
      `\\text{${a.trim()}.}\\\\ \\text{${b}${c}}`,
  );
  s = s.replace(/(?:\\\\\s*){2,}/g, "\\\\ ");

  const rows: PromptLine[] = [];
  for (const line of s.split(/\\\\/).map((l) => l.trim()).filter(Boolean)) {
    const parts = segmentToParts(line);
    if (parts.length) rows.push(parts);
  }

  if (!rows.length) {
    rows.push([{ kind: "text", value: latexToPlain(raw) || "(empty)" }]);
  }
  return rows;
}

/** Ensure every problem has structured prompt/solution lines. */
export function finalizeProblem(p: Problem): Problem {
  return {
    ...p,
    promptLines: p.promptLines?.length ? p.promptLines : latexToLines(p.promptLatex),
    solutionLines: p.solutionLines?.length
      ? p.solutionLines
      : latexToLines(p.solutionLatex),
  };
}

/** Plain-text fallback if KaTeX errors. */
export function latexToPlain(raw: string): string {
  return raw
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\quad\s*/g, " ")
    .replace(/\\qquad\s*/g, " ")
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
    .replace(/\\;/g, " ")
    .replace(/\\,/g, " ")
    .replace(/\\\\/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
