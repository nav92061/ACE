/** Small helpers for drawing pixel art into offscreen canvases. */

export type RGB = [number, number, number];

export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

export function bayer(x: number, y: number) {
  return BAYER4[y & 3]![x & 3]!;
}

export function hex(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Packs a colour for a little-endian Uint32 ImageData view. */
export function pack([r, g, b]: RGB, a = 255) {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in 0..1. */
export function noise(x: number, y: number, seed = 1) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, seed = 1, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += noise(x * f, y * f, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

/**
 * Paint a sprite pixel by pixel. `fn` returns a hex colour or null for empty.
 * An outline colour wraps every filled pixel.
 */
export function paint(
  w: number,
  h: number,
  fn: (x: number, y: number) => string | null,
  outline?: string,
): HTMLCanvasElement {
  const pad = outline ? 1 : 0;
  const cw = w + pad * 2;
  const ch = h + pad * 2;
  const grid: (string | null)[] = new Array(cw * ch).fill(null);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) grid[(y + pad) * cw + x + pad] = fn(x, y);
  }
  if (outline) {
    const filled = grid.map((c) => c !== null);
    for (let y = 0; y < ch; y += 1) {
      for (let x = 0; x < cw; x += 1) {
        if (filled[y * cw + x]) continue;
        const near =
          (x > 0 && filled[y * cw + x - 1]) ||
          (x < cw - 1 && filled[y * cw + x + 1]) ||
          (y > 0 && filled[(y - 1) * cw + x]) ||
          (y < ch - 1 && filled[(y + 1) * cw + x]);
        if (near) grid[y * cw + x] = outline;
      }
    }
  }
  const c = makeCanvas(cw, ch);
  const g = c.getContext("2d")!;
  const img = g.createImageData(cw, ch);
  const data = new Uint32Array(img.data.buffer);
  const cache = new Map<string, number>();
  for (let i = 0; i < grid.length; i += 1) {
    const col = grid[i];
    if (!col) continue;
    let v = cache.get(col);
    if (v === undefined) {
      v = pack(hex(col));
      cache.set(col, v);
    }
    data[i] = v;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Pick from a dark-to-light palette with ordered dithering. */
export function ditherPick(palette: string[], v: number, x: number, y: number) {
  const n = palette.length;
  const scaled = Math.max(0, Math.min(0.9999, v)) * (n - 1);
  const i = Math.floor(scaled);
  const frac = scaled - i;
  return palette[Math.min(n - 1, frac > bayer(x, y) ? i + 1 : i)]!;
}

/**
 * A lit sphere. `tone` lets callers add surface detail: return an offset to the
 * light value, or a hex colour to override the pixel.
 */
export function sphere(
  r: number,
  palette: string[],
  opts: {
    light?: [number, number, number];
    tone?: (nx: number, ny: number, x: number, y: number) => number | string;
    outline?: string;
  } = {},
) {
  const [lx, ly, lz] = opts.light ?? [-0.55, -0.5, 0.67];
  const size = r * 2 + 1;
  return paint(
    size,
    size,
    (x, y) => {
      const nx = (x - r) / (r + 0.5);
      const ny = (y - r) / (r + 0.5);
      const d = nx * nx + ny * ny;
      if (d > 1) return null;
      const nz = Math.sqrt(1 - d);
      let v = Math.max(0, nx * lx + ny * ly + nz * lz);
      v = v * 0.85 + 0.08;
      const t = opts.tone?.(nx, ny, x, y) ?? 0;
      if (typeof t === "string") return t;
      v += t;
      return ditherPick(palette, v, x, y);
    },
    opts.outline,
  );
}
