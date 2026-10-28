/** Word-overlap check so the same question never comes back reworded. */

const STOP = new Set(
  "a an the of to in on for and or is are was were be by with as at from that this which what who whom whose when where why how does do did can could would should will it its into than then there their they them these those not no yes".split(
    " ",
  ),
);

export function questionWords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/\$[^$]*\$/g, (m) => ` ${m.replace(/[^a-z0-9]/g, "")} `)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
  return new Set(words);
}

/** Crude stemming so "statements" and "statement" match. */
function stem(w: string) {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

/** Shared words over all words. */
export function similarity(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let both = 0;
  for (const w of a) if (b.has(w)) both += 1;
  return both / (a.size + b.size - both);
}

/**
 * True when two question stems are rewordings of each other. Questions that share
 * a template but ask about different things ("...mitosis?" vs "...meiosis?") stay distinct.
 */
export function sameQuestion(a: string, b: string) {
  const wa = questionWords(a);
  const wb = questionWords(b);
  if (wa.size === 0 || wb.size === 0) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return similarity(wa, wb) >= 0.8;
}

export function stableId(text: string) {
  let h = 2166136261;
  const s = text.trim().toLowerCase();
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `n-${(h >>> 0).toString(36)}`;
}
