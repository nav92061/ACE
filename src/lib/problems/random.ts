/** Tiny helpers shared by problem generators. Keep numbers AP-friendly. */

const NONZERO = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
const POSITIVE = [1, 2, 3, 4, 5, 6, 7, 8];
const SMALL_EXP = [-4, -3, -2, 2, 3, 4, 5]; // avoid n = -1 for power rule templates
const BASES = [2, 3, 4, 5, 10];

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function nonzero(): number {
  return pick(NONZERO);
}

export function positive(): number {
  return pick(POSITIVE);
}

export function smallExp(): number {
  return pick(SMALL_EXP);
}

export function niceBase(): number {
  return pick(BASES);
}

/** Unique-ish id for a generated problem (not a secret). */
export function problemId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Format ax^n as KaTeX, omitting 1 coefficients when natural. */
export function termLatex(coef: number, variable = "x", exp?: number): string {
  if (exp === undefined) {
    if (coef === 1) return variable;
    if (coef === -1) return `-${variable}`;
    return `${coef}${variable}`;
  }
  if (exp === 0) return String(coef);
  if (exp === 1) return termLatex(coef, variable);

  const expStr = `{${exp}}`;
  if (coef === 1) return `${variable}^${expStr}`;
  if (coef === -1) return `-${variable}^${expStr}`;
  return `${coef}${variable}^${expStr}`;
}

/** Format fraction a/b in lowest terms as KaTeX. */
export function fracLatex(num: number, den: number): string {
  if (den === 0) throw new Error("Division by zero");
  const g = gcd(Math.abs(num), Math.abs(den));
  let n = num / g;
  let d = den / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  if (d === 1) return String(n);
  if (n < 0) return `-\\frac{${-n}}{${d}}`;
  return `\\frac{${n}}{${d}}`;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** math.js-friendly power: x^n → x^n */
export function termMath(coef: number, variable = "x", exp?: number): string {
  if (exp === undefined) {
    if (coef === 1) return variable;
    if (coef === -1) return `(-1)*${variable}`;
    return `${coef}*${variable}`;
  }
  if (exp === 0) return String(coef);
  if (exp === 1) return termMath(coef, variable);
  if (coef === 1) return `${variable}^${exp}`;
  if (coef === -1) return `(-1)*${variable}^${exp}`;
  return `${coef}*${variable}^${exp}`;
}
