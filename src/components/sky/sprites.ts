import { bayer, ditherPick, fbm, makeCanvas, paint, rng } from "./pixel";

const INK = "#141a33";
const SPACE_INK = "#0b0f22";

export function rocketSprite() {
  const cx = 8;
  return paint(
    17,
    34,
    (x, y) => {
      const dx = x - cx;
      if (y <= 10) {
        const hw = Math.round(4 * Math.sqrt(y / 10));
        if (Math.abs(dx) > hw) return null;
        if (y === 0) return "#ff9b8c";
        if (dx <= -hw + 1 && hw > 1) return "#ff8f80";
        if (dx >= hw && hw > 1) return "#a92639";
        return "#e8414f";
      }
      if (y === 11) {
        if (Math.abs(dx) > 4) return null;
        return dx >= 3 ? "#6d7593" : "#a7b0cc";
      }
      if (dx === 0 && y >= 24 && y <= 31) return y >= 30 ? "#8f1f33" : "#c22f45";
      if (y <= 29 && Math.abs(dx) <= 4) {
        const pd = Math.hypot(dx, y - 16);
        if (pd <= 1.5) {
          if (dx < 0 && y < 16) return "#b9ecff";
          if (dx > 0 && y > 16) return "#244f9e";
          return "#3b7dd8";
        }
        if (pd <= 2.6) return dx > 0 ? "#5e6888" : "#8a93b3";
        if (y === 22 || y === 23) return dx >= 3 ? "#a92639" : dx <= -3 ? "#ff8f80" : "#e8414f";
        if (dx <= -4) return "#dfe4f2";
        if (dx <= -2) return "#ffffff";
        if (dx <= 1) return "#eef1f8";
        if (dx === 2) return "#d6dbea";
        if (dx === 3) return "#b9c0d8";
        return "#959dbb";
      }
      if (y >= 18 && y <= 31 && Math.abs(dx) > 4) {
        const e = Math.min(4, Math.floor((y - 17) / 2.6));
        if (Math.abs(dx) - 4 <= e) {
          if (y >= 30) return "#8f1f33";
          return dx < 0 ? "#ff5a5f" : "#b52a3e";
        }
        return null;
      }
      if (y >= 30) {
        const hw = y >= 32 ? 3 : 2;
        if (Math.abs(dx) > hw) return null;
        if (dx <= -hw + 1) return "#9aa1bd";
        if (dx >= hw) return "#363b52";
        return "#5c6380";
      }
      return null;
    },
    INK,
  );
}

export function gantrySprite() {
  return paint(
    9,
    54,
    (x, y) => {
      if (y <= 1) return y === 0 ? "#c9cfdf" : "#6d7593";
      if (x === 0 || x === 8) return Math.floor(y / 5) % 2 ? "#f2f2f2" : "#d6453d";
      const k = y % 8;
      if (k === x || k === 8 - x) return "#a8323a";
      if (y % 8 === 0) return "#a8323a";
      return null;
    },
    INK,
  );
}

export function padSprite() {
  return paint(
    45,
    7,
    (x, y) => {
      if (y === 0) return "#d5dae6";
      if (y <= 2) return x < 3 || x > 41 ? "#6d7593" : "#8a92ab";
      return (x + y) % 6 < 3 ? "#ffd15c" : "#2a2d3e";
    },
    INK,
  );
}

export function bunkerSprite() {
  return paint(
    24,
    14,
    (x, y) => {
      if (y <= 3) {
        if (x === 5 && y >= 1) return "#9aa3b8";
        if (y === 0 && x >= 3 && x <= 7) return "#c9cfdf";
        return null;
      }
      if (y === 4) return "#5c6380";
      if (y >= 7 && y <= 9 && x % 5 >= 1 && x % 5 <= 3 && x < 18) return y === 7 ? "#c7f6ff" : "#7fe3ff";
      if (x >= 19 && x <= 21 && y >= 8) return "#3b4058";
      return x > 20 ? "#7c859e" : "#a5adc2";
    },
    INK,
  );
}

export function tankSprite() {
  return paint(
    13,
    16,
    (x, y) => {
      const d = Math.hypot(x - 6, y - 6);
      if (d <= 6) {
        const v = 1 - (x - 6 + (y - 6)) / 12 - 0.15;
        return ditherPick(["#8a92ab", "#c3c9d9", "#eef1f8", "#ffffff"], v, x, y);
      }
      if (y > 10 && (x === 2 || x === 10)) return "#6d7593";
      return null;
    },
    INK,
  );
}

export function treeSprite(variant: number) {
  const h = 10 + variant * 2;
  return paint(
    9,
    h,
    (x, y) => {
      if (y >= h - 2) return x === 4 ? "#5a3d28" : null;
      const band = (y % 4) / 4;
      const hw = Math.floor(1 + (y / (h - 2)) * 3.6 - band * 1.4);
      if (Math.abs(x - 4) > hw) return null;
      return x - 4 < 0 ? "#3d9a55" : x - 4 === 0 ? "#2f7d45" : "#235f36";
    },
    "#14301f",
  );
}

export function cloudSprite(seed: number, w: number, h: number) {
  const r = rng(seed);
  const bumps: { x: number; y: number; r: number }[] = [];
  const n = 3 + Math.floor(r() * 4);
  for (let i = 0; i < n; i += 1) {
    const t = (i + 0.5) / n;
    const rr = h * (0.34 + r() * 0.36) * (1 - Math.abs(t - 0.5) * 0.7);
    bumps.push({ x: w * (0.12 + t * 0.76), y: h - rr * 0.75, r: rr });
  }
  const pal = ["#8fb2d8", "#bcd5ee", "#e2efff", "#ffffff"];
  return paint(w, h, (x, y) => {
    if (y > h - 2) return null;
    let inside = false;
    for (const b of bumps) if (Math.hypot(x - b.x, (y - b.y) * 1.15) <= b.r) inside = true;
    if (!inside) return null;
    const v = 1.08 - (y / h) * 1.05 + (fbm(x / 6, y / 6, seed) - 0.5) * 0.35;
    return ditherPick(pal, v, x, y);
  });
}

export function birdFrames() {
  const art = [
    ["X...X", ".X.X.", "..X.."],
    [".....", "XX.XX", "..X.."],
  ];
  return art.map((rows) =>
    paint(5, 3, (x, y) => (rows[y]![x] === "X" ? "#22314f" : null)),
  );
}

export function balloonSprite(a: string, b: string) {
  return paint(
    13,
    19,
    (x, y) => {
      if (y <= 12) {
        let inside: boolean;
        if (y <= 7) inside = Math.hypot((x - 6) / 6.4, (y - 6.5) / 6.6) <= 1;
        else inside = Math.abs(x - 6) <= 6.2 - (y - 7) * 1.05;
        if (!inside) return null;
        const band = Math.floor((x + 0.6) / 2.2) % 2;
        const shade = x >= 9 ? 1 : 0;
        if (shade) return band ? "#a8283b" : "#c79a2a";
        return band ? a : b;
      }
      if (y <= 15) return x === 4 || x === 8 ? "#5a4636" : null;
      if (x >= 4 && x <= 8) return x >= 7 ? "#6b4220" : "#9a6834";
      return null;
    },
    "#1a1630",
  );
}

export function planeSprite() {
  return paint(
    27,
    9,
    (x, y) => {
      if (y <= 3 && x >= 1 && x <= 5 && x - 1 >= 3 - y) return "#2f5fb3";
      if (y >= 3 && y <= 5) {
        if (x < 2) return null;
        if (x > 23 && Math.abs(y - 4) > 25 - x) return null;
        if (y === 3 && x >= 22 && x <= 23) return "#22314f";
        if (y === 4 && x >= 6 && x <= 20 && x % 2 === 0) return "#3b7dd8";
        return y === 5 ? "#c3cadb" : "#ffffff";
      }
      if (y === 6 && x >= 11 && x <= 17) return "#9aa3b8";
      if (y === 7 && x >= 13 && x <= 15) return "#6d7593";
      return null;
    },
    "#1a2240",
  );
}

export function weatherBalloonSprite() {
  return paint(
    9,
    17,
    (x, y) => {
      if (y <= 8) {
        const d = Math.hypot(x - 4, y - 4);
        if (d > 4.3) return null;
        return ditherPick(["#b9c0d8", "#e6eaf5", "#ffffff"], 1 - (x + y) / 12, x, y);
      }
      if (y <= 13) return x === 4 ? "#8a92ab" : null;
      return x >= 3 && x <= 5 ? "#e8414f" : null;
    },
    INK,
  );
}

export function satelliteSprite() {
  return paint(
    21,
    9,
    (x, y) => {
      if (x <= 6 || x >= 14) {
        if (y < 1 || y > 7) return null;
        return x % 3 === 0 || y % 3 === 1 ? "#1d3f80" : "#3b78d8";
      }
      if (x === 7 || x === 13) return y === 4 ? "#9aa3b8" : null;
      if (y === 0) return x === 10 ? "#c9cfdf" : null;
      if (y === 1) return x >= 9 && x <= 11 ? "#9aa3b8" : null;
      if (y >= 2 && y <= 7) return x >= 11 ? "#b98a2c" : (x + y) % 3 === 0 ? "#ffe08a" : "#e6b450";
      return null;
    },
    SPACE_INK,
  );
}

export function issSprite() {
  return paint(
    45,
    17,
    (x, y) => {
      if (y === 8) return "#aab3c7";
      const panel = (a: number) => x >= a && x <= a + 7;
      const inPanel = panel(2) || panel(11) || panel(26) || panel(35);
      if (inPanel && ((y >= 1 && y <= 6) || (y >= 10 && y <= 15))) {
        return x % 2 === 0 || y % 3 === 0 ? "#9c6f22" : "#e0ab47";
      }
      if (x >= 18 && x <= 26 && y >= 6 && y <= 10) {
        if (x === 22) return "#8a92ab";
        return y >= 9 ? "#b8c0d4" : "#eef1f8";
      }
      if (x >= 20 && x <= 24 && (y === 4 || y === 5 || y === 11 || y === 12)) return "#dfe4f2";
      return null;
    },
    SPACE_INK,
  );
}

/** Shaded sphere colour at a point, or null outside. */
function sphereAt(
  x: number,
  y: number,
  r: number,
  palette: string[],
  tone?: (nx: number, ny: number) => number | string,
) {
  const nx = (x - r) / (r + 0.5);
  const ny = (y - r) / (r + 0.5);
  const d = nx * nx + ny * ny;
  if (d > 1) return null;
  const nz = Math.sqrt(1 - d);
  let v = Math.max(0, nx * -0.55 + ny * -0.5 + nz * 0.67) * 0.9 + 0.06;
  const t = tone?.(nx, ny) ?? 0;
  if (typeof t === "string") return t;
  v += t;
  return ditherPick(palette, v, x, y);
}

export function moonSprite(r: number) {
  const rand = rng(77);
  const craters = Array.from({ length: 14 }, () => {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.85;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.06 + rand() * 0.16 };
  });
  const pal = ["#2c2f44", "#4f536b", "#7d8199", "#b0b3c5", "#dfe0ea", "#ffffff"];
  return paint(
    r * 2 + 1,
    r * 2 + 1,
    (x, y) =>
      sphereAt(x, y, r, pal, (nx, ny) => {
        let t = (fbm(nx * 3 + 4, ny * 3, 9) - 0.5) * 0.3;
        if (fbm(nx * 1.6, ny * 1.6, 31) < 0.42) t -= 0.12;
        for (const c of craters) {
          const d = Math.hypot(nx - c.x, ny - c.y);
          if (d < c.r * 0.75) t -= 0.14;
          else if (d < c.r) t += (nx - c.x) + (ny - c.y) < 0 ? 0.1 : -0.1;
        }
        return t;
      }),
    SPACE_INK,
  );
}

export function marsSprite(r: number) {
  const pal = ["#2a0f18", "#6b2430", "#b0422e", "#e07a45", "#f8b77e"];
  return paint(
    r * 2 + 1,
    r * 2 + 1,
    (x, y) =>
      sphereAt(x, y, r, pal, (nx, ny) => {
        if (ny < -0.82 && Math.abs(nx) < 0.5) return "#f3f6ff";
        return (fbm(nx * 3, ny * 3, 4) - 0.5) * 0.45;
      }),
    SPACE_INK,
  );
}

export function icePlanetSprite(r: number) {
  const pal = ["#0d2d3d", "#1f6f86", "#3fb0c9", "#9ee8f2", "#effffe"];
  return paint(
    r * 2 + 1,
    r * 2 + 1,
    (x, y) => sphereAt(x, y, r, pal, (nx, ny) => (fbm(nx * 4, ny * 4, 12) - 0.5) * 0.3),
    SPACE_INK,
  );
}

export function jupiterSprite(r: number) {
  const pal = ["#2e1b14", "#6e3f27", "#b97a4c", "#e3bc93", "#fbefdc"];
  return paint(
    r * 2 + 1,
    r * 2 + 1,
    (x, y) =>
      sphereAt(x, y, r, pal, (nx, ny) => {
        const spot = Math.hypot((nx - 0.32) / 0.22, (ny - 0.3) / 0.12);
        if (spot < 1) return spot < 0.55 ? "#e07b52" : "#b8452f";
        return Math.sin(ny * 17 + fbm(nx * 2, ny * 6, 3) * 3.5) * 0.14;
      }),
    SPACE_INK,
  );
}

export function ringedPlanetSprite(r: number) {
  const rx = Math.round(r * 2.15);
  const ry = Math.round(r * 0.62);
  const w = rx * 2 + 1;
  const h = Math.max(r * 2 + 1, ry * 2 + 1);
  const cx = rx;
  const cy = Math.floor(h / 2);
  const pal = ["#2f2117", "#6e4c2e", "#b8844c", "#e5bd7c", "#fbe7b5"];
  const ringPal = ["#5e4c3a", "#9d8664", "#d6c29a", "#f4e6c4"];
  return paint(
    w,
    h,
    (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      const e = (dx / rx) ** 2 + (dy / ry) ** 2;
      const inRing = e >= 0.42 && e <= 1 && !(e > 0.7 && e < 0.76);
      const ringCol = inRing
        ? ditherPick(ringPal, 0.25 + Math.sin(e * 30) * 0.2 + (dx < 0 ? 0.3 : 0), x, y)
        : null;
      const px = dx + r;
      const py = dy + r;
      const planet =
        Math.abs(dx) <= r && Math.abs(dy) <= r
          ? sphereAt(px, py, r, pal, (nx, ny) => Math.sin(ny * 12 + fbm(nx, ny * 4, 5) * 2) * 0.1)
          : null;
      if (planet && dy < 0) return planet;
      if (ringCol) return ringCol;
      return planet;
    },
    SPACE_INK,
  );
}

export function galaxySprite() {
  const w = 66;
  const h = 34;
  const pal = ["#2a1f4f", "#5b3f8f", "#a07be0", "#e6c8ff", "#ffffff"];
  return paint(w, h, (x, y) => {
    const u = (x - w / 2) / 30;
    const v = (y - h / 2) / 12;
    const rr = Math.hypot(u, v);
    const th = Math.atan2(v, u);
    const arm = Math.max(0, Math.cos(2 * (th - Math.log(rr + 0.05) * 2.6)));
    const val = Math.exp(-rr * 3.2) * 1.1 + arm * Math.exp(-rr * 1.9) * 0.55;
    if (val < 0.1 + bayer(x, y) * 0.14) return null;
    return ditherPick(pal, val, x, y);
  });
}

export function nebulaSprite(w: number, h: number, palette: string[], seed: number) {
  return paint(w, h, (x, y) => {
    const env = Math.sin((Math.PI * y) / h) * Math.min(1, Math.sin((Math.PI * x) / w) * 1.6);
    const n = fbm(x / 34, y / 22, seed, 5) * 0.9 + fbm(x / 9, y / 9, seed + 3, 2) * 0.25;
    const val = (n - 0.32) * env * 1.9;
    if (val < 0.15 + bayer(x, y) * 0.2) return null;
    return ditherPick(palette, val, x, y);
  });
}

export const NEBULA_PINK = ["#2b1450", "#5a1f78", "#9b2f8f", "#e0559b", "#ffb0d8"];
export const NEBULA_TEAL = ["#0c2f45", "#135c6e", "#1f9a9a", "#4fe0c0", "#d4fff3"];

/** The top of the Earth seen from orbit. `w` wide, curved limb and glow. */
export function earthCapSprite(w: number, capH: number) {
  const R = w * 0.75;
  const cx = w / 2;
  const ocean = ["#061c44", "#0d3a7c", "#1a62b6", "#4aa3e8", "#9ad6ff"];
  const land = ["#14361f", "#24622f", "#4b9a45", "#9fcd6a", "#e3f0a6"];
  const glow = ["#123a7a", "#2c7fd0", "#6fd3ff", "#c8f3ff"];
  return paint(w, capH, (x, y) => {
    const dx = x - cx;
    const dy = y + 6 - R;
    const d = Math.hypot(dx, dy);
    const top = R + 6;
    const fromEdge = d - (top - 6);
    if (fromEdge > 6) return null;
    if (fromEdge > 0) {
      const g = 1 - fromEdge / 6;
      if (g < bayer(x, y) * 0.9) return null;
      return ditherPick(glow, g, x, y);
    }
    if (fromEdge > -1.2) return "#c8f3ff";
    const lit = 0.75 - (dx / R) * 0.35 - Math.min(0.25, (-fromEdge / capH) * 0.25);
    const limb = Math.min(1, -fromEdge / 10);
    const cloud = fbm(x / 16 + 7, y / 6, 21);
    if (cloud > 0.6) return ditherPick(["#8fa9c8", "#d9e8f8", "#ffffff"], lit * limb + 0.1, x, y);
    const isLand = fbm(x / 30, y / 12, 8) > 0.56;
    return ditherPick(isLand ? land : ocean, lit * (0.55 + limb * 0.45), x, y);
  });
}

export function sunSprite() {
  return paint(27, 27, (x, y) => {
    const d = Math.hypot(x - 13, y - 13);
    if (d <= 6) return d <= 4 ? "#fffbe6" : "#fff0b8";
    if (d <= 8) return "#ffe08a";
    if (d <= 13) {
      const g = 1 - (d - 8) / 5;
      if (g * 0.75 < bayer(x, y)) return null;
      return "#ffe9a8";
    }
    return null;
  });
}

export function blankCanvas(w: number, h: number) {
  return makeCanvas(w, h);
}
