import { kmAt, worldY } from "@/lib/zones";
import { bayer, fbm, hex, makeCanvas, pack, rng } from "./pixel";
import * as S from "./sprites";

export type Stage = "pad" | "ignite" | "boost" | "cruise";

export interface SkyState {
  km: number;
  stage: Stage;
  side: boolean;
  reduced: boolean;
  celebrate: boolean;
}

/** Sky colour by altitude. Neighbouring stops are dithered together. */
const SKY: [number, number][] = (
  [
    [0, "#bdeeff"],
    [1, "#8fd8fb"],
    [4, "#62bdf2"],
    [8, "#459fe6"],
    [14, "#337fd6"],
    [22, "#2a62bf"],
    [32, "#22479c"],
    [42, "#1b3279"],
    [55, "#15215a"],
    [75, "#0e1540"],
    [95, "#0a0f30"],
    [130, "#080b26"],
    [170, "#0d0a28"],
    [210, "#160b30"],
    [245, "#1d0c38"],
    [280, "#120826"],
    [320, "#08040f"],
    [380, "#040208"],
    [450, "#020104"],
  ] as [number, string][]
).map(([km, c]) => [km, pack(hex(c))]);

const STAR_COLS = ["#ffffff", "#cfe6ff", "#fff1c4", "#ffd0e6", "#bff7ff"].map((c) => pack(hex(c)));
const AURORA = ["#c9ffe4", "#7dffb5", "#3ddc97", "#2fbfa8", "#3ee0ff", "#6b8bff", "#9a6bff"].map((c) =>
  pack(hex(c)),
);
const BH_PAL = ["#4a1006", "#a82f0d", "#f06a18", "#ffbf45", "#fff1c2", "#ffffff"];
const BH_PACKED = BH_PAL.map((c) => pack(hex(c)));
const SMOKE = ["#ffffff", "#eef2f8", "#cdd5e2", "#a3adc0", "#7d879c"];
const SOOT = ["#59607a", "#454b63", "#353a4f", "#272b3c"];
const SPARK = ["#fffbe0", "#ffe27a", "#ffb03c", "#ff6a4a", "#d43c6a"];
const CONFETTI = ["#ffffff", "#ffd15c", "#3ee0ff", "#ff5d8f", "#7dffb5", "#b99bff"];

interface Thing {
  img?: HTMLCanvasElement;
  frames?: HTMLCanvasElement[];
  km: number;
  wx: number;
  d: number;
  vx: number;
  bob: number;
  phase: number;
  front?: boolean;
  blink?: [number, number, string];
  trail?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  grow: number;
  pal: string[];
  kind: "puff" | "spark" | "star" | "line" | "ring" | "meteor";
  drag: number;
  grav: number;
  world: boolean;
}

interface Star {
  x: number;
  y: number;
  d: number;
  tw: number;
  ph: number;
  c: number;
  big: boolean;
  gate: number;
}

const GROUND = -8;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export class SkyEngine {
  private c: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private img: ImageData | null = null;
  private buf = new Uint32Array(0);
  private state: SkyState = { km: 0, stage: "pad", side: false, reduced: false, celebrate: false };
  private camWY = 0;
  private camV = 0;
  private anchorX = 0;
  private anchorY = 0;
  private t = 0;
  private last = 0;
  private raf = 0;
  private shake = 0;
  private flash = 0;
  private flashCol = "#ffffff";
  private stall = 0;
  private emitAcc = 0;
  private fireworkIn = 0;
  private meteorIn = 2;
  private flameSeed = 0;
  private flameTick = 0;
  private parts: Particle[] = [];
  private things: Thing[] = [];
  private stars: Star[] = [];
  private dirty = true;
  private placed = false;
  private sp = {
    rocket: S.rocketSprite(),
    gantry: S.gantrySprite(),
    pad: S.padSprite(),
    bunker: S.bunkerSprite(),
    tank: S.tankSprite(),
    trees: [0, 1, 2].map(S.treeSprite),
    sun: S.sunSprite(),
  };
  private earth: HTMLCanvasElement | null = null;
  private bh = makeCanvas(1, 1);
  private bhA = 40;
  private discs = new Map<string, HTMLCanvasElement>();
  private cssPerPx = 1;
  private padTopCss: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.c = canvas;
    this.g = canvas.getContext("2d")!;
    this.resize();
  }

  start() {
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
      this.last = now;
      if (this.state.reduced) {
        if (!this.dirty) return;
        this.dirty = false;
        this.settle();
        this.render();
        return;
      }
      this.step(dt);
      this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  setState(next: Partial<SkyState>) {
    const prev = this.state;
    this.state = { ...prev, ...next };
    if (prev.stage !== "ignite" && this.state.stage === "ignite") this.shake = Math.max(this.shake, 1.5);
    if (prev.stage !== "boost" && this.state.stage === "boost") this.shake = Math.max(this.shake, 3);
    this.dirty = true;
  }

  /** Where the landing page's buttons start (CSS px), so the rocket stands just above them. */
  setPadTop(cssY: number | null) {
    this.padTopCss = cssY;
    this.dirty = true;
  }

  pulse(kind: "ok" | "no") {
    if (this.state.reduced) return;
    const rx = this.anchorX;
    const ry = this.anchorY - 18;
    if (kind === "ok") {
      this.flash = 0.35;
      this.flashCol = "#fff7d6";
      this.shake = Math.max(this.shake, 2);
      this.parts.push({ x: rx, y: ry, vx: 0, vy: 0, life: 0, max: 0.55, size: 2, grow: 70, pal: ["#fff6c2", "#ffd15c", "#3ee0ff"], kind: "ring", drag: 0, grav: 0, world: true });
      for (let i = 0; i < 34; i += 1) {
        const a = (i / 34) * Math.PI * 2 + Math.random() * 0.3;
        const s = 50 + Math.random() * 90;
        this.parts.push({
          x: rx,
          y: ry,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0,
          max: 0.7 + Math.random() * 0.5,
          size: Math.random() < 0.4 ? 2 : 1,
          grow: 0,
          pal: [CONFETTI[i % CONFETTI.length]!, CONFETTI[(i + 2) % CONFETTI.length]!],
          kind: "star",
          drag: 2.6,
          grav: 20,
          world: true,
        });
      }
    } else {
      this.flash = 0.4;
      this.flashCol = "#ff3d6e";
      this.shake = Math.max(this.shake, 7);
      this.stall = 0.9;
      for (let i = 0; i < 12; i += 1) {
        this.parts.push({
          x: rx + (Math.random() - 0.5) * 8,
          y: this.anchorY + Math.random() * 4,
          vx: (Math.random() - 0.5) * 30,
          vy: -10 - Math.random() * 25,
          life: 0,
          max: 1.1 + Math.random() * 0.6,
          size: 2,
          grow: 3,
          pal: SOOT,
          kind: "puff",
          drag: 1.2,
          grav: -6,
          world: true,
        });
      }
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    // A hidden tab can report a zero-size window; draw at a minimum size until it's shown.
    const cssW = Math.max(64, window.innerWidth);
    const cssH = Math.max(64, window.innerHeight);
    const P = clamp(Math.round(Math.sqrt(cssW * cssH) / 250), 2, 5);
    const devP = Math.max(1, Math.round(P * dpr));
    const W = Math.ceil((cssW * dpr) / devP);
    const H = Math.ceil((cssH * dpr) / devP);
    this.W = W;
    this.H = H;
    this.c.width = W;
    this.c.height = H;
    this.cssPerPx = devP / dpr;
    this.c.style.width = `${(W * devP) / dpr}px`;
    this.c.style.height = `${(H * devP) / dpr}px`;
    this.g.imageSmoothingEnabled = false;
    this.img = this.g.createImageData(W, H);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.build();
    this.dirty = true;
  }

  private build() {
    const { W, H } = this;
    const r = rng(42);
    const things: Thing[] = [];
    const add = (t: Partial<Thing> & { km: number }) =>
      things.push({ wx: 0, d: 1, vx: 0, bob: 0, phase: r() * 6.28, ...t });
    const span = (a: number, b: number) => a + r() * (b - a);

    for (let i = 0; i < 6; i += 1) {
      add({ img: S.cloudSprite(100 + i, Math.round(span(30, 58)), Math.round(span(12, 20))), km: span(1.6, 5.5), wx: span(-W * 0.8, W * 0.8), d: span(0.5, 0.7), vx: span(1, 3.5) });
    }
    for (let i = 0; i < 18; i += 1) {
      add({ img: S.cloudSprite(200 + i, Math.round(span(34, 76)), Math.round(span(14, 26))), km: span(5.5, 15), wx: span(-W * 0.9, W * 0.9), d: span(0.78, 1), vx: span(1.5, 5) });
    }
    for (let i = 0; i < 5; i += 1) {
      add({ img: S.cloudSprite(300 + i, Math.round(span(70, 100)), Math.round(span(24, 34))), km: span(7, 14), wx: span(-W * 0.8, W * 0.8), d: 1.3, vx: span(3, 7), front: true });
    }
    const birds = S.birdFrames();
    for (let f = 0; f < 5; f += 1) {
      const km = span(0.25, 3.2);
      const wx = span(-W * 0.8, W * 0.8);
      const vx = span(9, 16) * (r() < 0.5 ? -1 : 1);
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i += 1) {
        add({ frames: birds, km: km + (Math.abs(i - n / 2) * 0.04), wx: wx + i * 6 * Math.sign(-vx), d: 1, vx, phase: r() * 6 });
      }
    }
    add({ img: S.balloonSprite("#ff5d5d", "#ffd15c"), km: 2.7, wx: W * 0.3, d: 0.95, vx: 1.2, bob: 2 });
    add({ img: S.balloonSprite("#3ee0ff", "#f4f4f8"), km: 4.4, wx: -W * 0.32, d: 0.9, vx: -0.8, bob: 2 });
    const plane = S.planeSprite();
    add({ img: plane, km: 9.5, wx: -W * 0.2, d: 1, vx: 20, trail: 1 });
    add({ img: flip(plane), km: 12.5, wx: W * 0.4, d: 0.9, vx: -26, trail: -1 });
    add({ img: S.weatherBalloonSprite(), km: 27, wx: -W * 0.24, d: 0.95, vx: 0.6, bob: 3 });
    add({ img: S.weatherBalloonSprite(), km: 34, wx: W * 0.33, d: 0.85, vx: -0.4, bob: 3 });
    const sat = S.satelliteSprite();
    [80, 88, 99, 106].forEach((km, i) =>
      add({ img: i % 2 ? flip(sat) : sat, km, wx: span(-W * 0.6, W * 0.6), d: span(0.85, 1.05), vx: span(3, 7) * (i % 2 ? -1 : 1), blink: [0, 4, i % 2 ? "#7dffb5" : "#ff5d8f"] }),
    );
    add({ img: S.issSprite(), km: 93, wx: W * 0.28, d: 1, vx: 2.4, blink: [22, 2, "#ff5d8f"] });
    const moonR = Math.round(clamp(W * 0.17, 26, 46));
    add({ img: S.moonSprite(moonR), km: 132, wx: W * 0.26, d: 0.7 });
    add({ img: S.icePlanetSprite(8), km: 174, wx: W * 0.36, d: 0.5 });
    add({ img: S.marsSprite(14), km: 168, wx: -W * 0.3, d: 0.65 });
    add({ img: S.ringedPlanetSprite(Math.round(clamp(W * 0.1, 16, 26))), km: 196, wx: W * 0.18, d: 0.75 });
    add({ img: S.jupiterSprite(Math.round(clamp(W * 0.13, 20, 34))), km: 214, wx: -W * 0.24, d: 0.55 });
    add({ img: S.galaxySprite(), km: 252, wx: -W * 0.24, d: 0.45 });
    add({ img: S.nebulaSprite(Math.round(W * 1.9), 150, S.NEBULA_PINK, 5), km: 236, wx: 0, d: 0.6 });
    add({ img: S.nebulaSprite(Math.round(W * 1.7), 120, S.NEBULA_TEAL, 9), km: 268, wx: W * 0.1, d: 0.8 });
    things.sort((a, b) => a.d - b.d);
    this.things = things;

    const stars: Star[] = [];
    const layers: [number, number, number][] = [
      [0.08, 120, 0],
      [0.2, 260, 0.04],
      [0.4, 700, 0.35],
    ];
    for (const [d, per, bigChance] of layers) {
      const count = Math.round((W * (H + 60)) / per);
      for (let i = 0; i < count; i += 1) {
        stars.push({
          x: r() * W,
          y: r() * (H + 60),
          d,
          tw: 1 + r() * 3,
          ph: r() * 6.28,
          c: STAR_COLS[Math.floor(r() * STAR_COLS.length)]!,
          big: r() < bigChance,
          gate: r(),
        });
      }
    }
    this.stars = stars;

    this.earth = S.earthCapSprite(Math.round(W * 1.6), Math.round(clamp(H * 0.4, 90, 170)));
    this.bhA = Math.round(clamp(W * 0.3, 42, 76));
    this.bh = makeCanvas(Math.round(this.bhA * 2.8) + 3, Math.round(this.bhA * 1.1) + 3);
    if (!this.placed) {
      this.anchorX = W / 2;
      this.anchorY = H * 0.52;
      this.placed = true;
    }
  }

  private targetWY() {
    const { km, stage } = this.state;
    const airborne = stage === "boost" || stage === "cruise";
    const hover = airborne ? 14 * (1 - clamp(km, 0, 1)) : 0;
    return worldY(km) + hover;
  }

  private anchorTarget() {
    const { W, H } = this;
    const side = this.state.side;
    const x = side ? Math.max(14, W * (W > 260 ? 0.15 : 0.13)) : W / 2;
    let y = H * (this.state.stage === "pad" ? 0.52 : 0.62);
    if (this.state.stage === "pad" && this.padTopCss !== null) {
      y = Math.max(H * 0.3, Math.min(H * 0.62, this.padTopCss / this.cssPerPx - 9));
    }
    return [x, y] as const;
  }

  private settle() {
    this.camWY = this.targetWY();
    this.camV = 0;
    const [x, y] = this.anchorTarget();
    this.anchorX = x;
    this.anchorY = y;
    this.parts = [];
    this.shake = 0;
    this.flash = 0;
  }

  private step(dt: number) {
    this.t += dt;
    const prevCam = this.camWY;
    const prevAX = this.anchorX;
    const prevAY = this.anchorY;
    const target = this.targetWY();
    const w = this.state.stage === "boost" ? 2.4 : 3;
    this.camV += (w * w * (target - this.camWY) - 2 * w * this.camV) * dt;
    this.camWY += this.camV * dt;
    if (Math.abs(target - this.camWY) < 0.05 && Math.abs(this.camV) < 0.05) {
      this.camWY = target;
      this.camV = 0;
    }
    const [ax, ay] = this.anchorTarget();
    const k = 1 - Math.exp(-dt * 4);
    this.anchorX += (ax - this.anchorX) * k;
    this.anchorY += (ay - this.anchorY) * k;

    const scroll = this.camWY - prevCam + (this.anchorY - prevAY);
    const pan = this.anchorX - prevAX;
    this.shake = Math.max(0, this.shake - dt * 9);
    this.flash = Math.max(0, this.flash - dt * 1.6);
    this.stall = Math.max(0, this.stall - dt);
    this.flameTick += dt;
    if (this.flameTick > 0.06) {
      this.flameTick = 0;
      this.flameSeed = Math.random();
    }

    const groundY = this.anchorY - (GROUND - this.camWY) - 2;
    for (const p of this.parts) {
      p.life += dt;
      const drag = Math.exp(-p.drag * dt);
      p.vx *= drag;
      p.vy = p.vy * drag + p.grav * dt;
      p.x += p.vx * dt + (p.world ? pan : 0);
      p.y += p.vy * dt + (p.world ? scroll : 0);
      p.size += p.grow * dt;
      if (p.world && (p.kind === "puff" || p.kind === "spark") && p.y > groundY) {
        p.y = groundY;
        if (p.vy > 0) {
          p.vx += (p.x < this.anchorX ? -1 : 1) * p.vy * 0.8;
          p.vy = -p.vy * 0.08;
        }
      }
    }
    this.parts = this.parts.filter((p) => p.life < p.max && p.y < this.H + 40 && p.y > -60);

    this.emit(dt);
  }

  private camKm() {
    return kmAt(this.camWY);
  }

  private emit(dt: number) {
    const { stage } = this.state;
    const rx = this.anchorX;
    const base = this.anchorY;
    const km = this.camKm();
    const inAir = km < 45;
    let rate = 0;
    if (stage === "ignite") rate = 70;
    else if (stage === "boost") rate = 80;
    else if (stage === "cruise") rate = 22;
    if (this.stall > 0) rate = 0;
    this.emitAcc += rate * dt;
    while (this.emitAcc >= 1) {
      this.emitAcc -= 1;
      if (stage === "ignite" && this.camWY < 30) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        this.parts.push({
          x: rx + dir * Math.random() * 6,
          y: base + 6 + this.camWY,
          vx: dir * (18 + Math.random() * 50),
          vy: -2 - Math.random() * 14,
          life: 0,
          max: 1.6 + Math.random() * 1.2,
          size: 2,
          grow: 3.2,
          pal: SMOKE,
          kind: "puff",
          drag: 1.1,
          grav: -3,
          world: true,
        });
      } else if (inAir && Math.random() < 0.65) {
        this.parts.push({
          x: rx + (Math.random() - 0.5) * 4,
          y: base + 10 + Math.random() * 6,
          vx: (Math.random() - 0.5) * 12,
          vy: 30 + Math.random() * 30,
          life: 0,
          max: 0.9 + Math.random() * 0.7,
          size: 1,
          grow: 3,
          pal: SMOKE,
          kind: "puff",
          drag: 1.4,
          grav: 0,
          world: true,
        });
      } else {
        this.parts.push({
          x: rx + (Math.random() - 0.5) * 5,
          y: base + 8 + Math.random() * 6,
          vx: (Math.random() - 0.5) * 26,
          vy: 50 + Math.random() * 50,
          life: 0,
          max: 0.35 + Math.random() * 0.35,
          size: 1,
          grow: 0,
          pal: SPARK,
          kind: "spark",
          drag: 1,
          grav: 0,
          world: true,
        });
      }
    }

    if (stage === "pad" && Math.random() < dt * 2.2) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.parts.push({
        x: rx + dir * 20,
        y: base + 7 + this.camWY,
        vx: dir * (3 + Math.random() * 6),
        vy: -6 - Math.random() * 6,
        life: 0,
        max: 1.4,
        size: 1,
        grow: 1.6,
        pal: SMOKE,
        kind: "puff",
        drag: 0.8,
        grav: -2,
        world: true,
      });
    }

    const speed = this.camV;
    if (Math.abs(speed) > 50) {
      const n = Math.abs(speed) * dt * (km < 60 ? 0.22 : 0.12);
      for (let i = 0; i < n; i += 1) {
        const up = speed > 0;
        this.parts.push({
          x: Math.random() * this.W,
          y: up ? -10 : this.H + 10,
          vx: 0,
          vy: speed * (1.4 + Math.random() * 0.8),
          life: 0,
          max: 1.5,
          size: 4 + Math.random() * 10,
          grow: 0,
          pal: km < 60 ? ["#e8f7ff"] : ["#c9d6ff", "#ffffff"],
          kind: "line",
          drag: 0,
          grav: 0,
          world: false,
        });
      }
    }

    this.meteorIn -= dt;
    if (this.meteorIn <= 0) {
      this.meteorIn = 0.8 + Math.random() * 1.8;
      if (km > 30 && km < 300) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        this.parts.push({
          x: dir > 0 ? Math.random() * this.W * 0.5 : this.W * (0.5 + Math.random() * 0.5),
          y: Math.random() * this.H * 0.35,
          vx: dir * (90 + Math.random() * 60),
          vy: 50 + Math.random() * 30,
          life: 0,
          max: 0.9,
          size: 9,
          grow: 0,
          pal: ["#ffffff", "#bff3ff", "#6fd3ff"],
          kind: "meteor",
          drag: 0,
          grav: 0,
          world: false,
        });
      }
    }

    if (this.state.celebrate) {
      this.fireworkIn -= dt;
      if (this.fireworkIn <= 0) {
        this.fireworkIn = 0.6 + Math.random() * 0.6;
        const cx = this.W * (0.12 + Math.random() * 0.76);
        const cy = this.H * (0.1 + Math.random() * 0.35);
        const hue = Math.floor(Math.random() * CONFETTI.length);
        for (let i = 0; i < 40; i += 1) {
          const a = (i / 40) * Math.PI * 2;
          const s = 30 + Math.random() * 40;
          this.parts.push({
            x: cx,
            y: cy,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: 0,
            max: 1 + Math.random() * 0.5,
            size: 1,
            grow: 0,
            pal: ["#ffffff", CONFETTI[hue]!, CONFETTI[(hue + 3) % CONFETTI.length]!],
            kind: "spark",
            drag: 1.6,
            grav: 26,
            world: false,
          });
        }
      }
    }
    if (this.parts.length > 700) this.parts.splice(0, this.parts.length - 700);
  }

  // ---------- drawing ----------

  private render() {
    const { g, W, H } = this;
    if (!this.img) return;
    this.paintSky();
    this.paintStars();
    this.paintAurora();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.putImageData(this.img, 0, 0);
    const sx = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake * 2) : 0;
    const sy = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake * 2) : 0;
    g.setTransform(1, 0, 0, 1, sx, sy);

    this.drawSun();
    let earthDrawn = false;
    for (const th of this.things) {
      if (th.front) continue;
      if (!earthDrawn && th.d > 0.5) {
        this.drawEarth();
        earthDrawn = true;
      }
      this.drawThing(th);
    }
    if (!earthDrawn) this.drawEarth();
    this.drawBlackHole();
    this.drawComet();
    this.drawTerrain();
    this.drawParticles(false);
    this.drawRocket();
    this.drawParticles(true);
    for (const th of this.things) if (th.front) this.drawThing(th);

    if (this.flash > 0) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = Math.min(0.55, this.flash);
      g.fillStyle = this.flashCol;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
  }

  private rowKm(y: number) {
    return kmAt(this.camWY + (this.anchorY - y));
  }

  private paintSky() {
    const { W, H, buf } = this;
    let si = 0;
    for (let y = 0; y < H; y += 1) {
      const km = this.rowKm(y);
      while (si < SKY.length - 2 && km >= SKY[si + 1]![0]) si += 1;
      while (si > 0 && km < SKY[si]![0]) si -= 1;
      const [k0, c0] = SKY[si]!;
      const [k1, c1] = SKY[Math.min(SKY.length - 1, si + 1)]!;
      const f = clamp((km - k0) / Math.max(0.0001, k1 - k0), 0, 1);
      const row = y * W;
      const b = (y & 3) * 4;
      for (let x = 0; x < W; x += 1) {
        buf[row + x] = f > FLAT_BAYER[b + (x & 3)]! ? c1 : c0;
      }
    }
  }

  private paintStars() {
    const { W, H, buf } = this;
    const pan = this.anchorX - W / 2;
    const Ht = H + 60;
    const t = this.state.reduced ? 0 : this.t;
    for (const s of this.stars) {
      let y = (s.y + this.camWY * s.d * 0.6) % Ht;
      if (y < 0) y += Ht;
      y = Math.round(y - 30);
      if (y < 0 || y >= H) continue;
      const vis = smooth(22, 70, this.rowKm(y));
      if (vis <= s.gate) continue;
      let x = (s.x + pan * s.d) % W;
      if (x < 0) x += W;
      x = Math.round(x);
      const tw = 0.5 + 0.5 * Math.sin(t * s.tw + s.ph);
      if (!s.big && tw < 0.15) continue;
      buf[y * W + x] = s.c;
      if (s.big && tw > 0.55) {
        if (x > 0) buf[y * W + x - 1] = s.c;
        if (x < W - 1) buf[y * W + x + 1] = s.c;
        if (y > 0) buf[(y - 1) * W + x] = s.c;
        if (y < H - 1) buf[(y + 1) * W + x] = s.c;
      }
    }
  }

  private paintAurora() {
    const { W, H, buf } = this;
    const t = this.state.reduced ? 0 : this.t;
    const curtains: [number, number, number][] = [
      [50, 0.85, 0],
      [63, 0.92, 2.1],
    ];
    const pan = this.anchorX - W / 2;
    for (const [km, d, ph] of curtains) {
      const base = this.anchorY - (worldY(km) - this.camWY) * d;
      if (base < -10 || base - 60 > H) continue;
      for (let x = 0; x < W; x += 1) {
        const wx = x - pan * d;
        const wave = Math.sin((wx + t * 8) * 0.045 + ph) * 7 + Math.sin(wx * 0.12 - t * 1.1) * 3;
        const inten = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(wx * 0.05 + t * 0.6 + ph * 2));
        const height = Math.round(16 + inten * 30);
        const by = Math.round(base + wave);
        for (let j = 0; j < height; j += 1) {
          const y = by - j;
          if (y < 0 || y >= H) continue;
          const f = j / height;
          const alpha = (1 - f) * inten * (j < 2 ? 1.4 : 0.9);
          if (alpha < bayer(x, y) + 0.08) continue;
          const ci = Math.min(AURORA.length - 1, Math.floor(f * (AURORA.length - 0.01)));
          buf[y * W + x] = AURORA[ci]!;
        }
      }
    }
  }

  private screenPos(th: { km: number; wx: number; d: number }) {
    const sx = this.W / 2 + (this.anchorX - this.W / 2) * th.d + th.wx;
    const sy = this.anchorY - (worldY(th.km) - this.camWY) * th.d;
    return [sx, sy] as const;
  }

  private drawThing(th: Thing) {
    const img = th.frames ? th.frames[Math.floor(this.t * 5 + th.phase) % th.frames.length]! : th.img!;
    let [sx, sy] = this.screenPos(th);
    const w = img.width;
    const h = img.height;
    if (sy + h < -4 || sy - h > this.H + 4) return;
    if (th.vx) {
      sx += th.vx * this.t;
      const lo = -this.W * 0.45 - w;
      const span = this.W * 1.9 + w * 2;
      sx = ((((sx - lo) % span) + span) % span) + lo;
    }
    if (th.bob) sy += Math.round(Math.sin(this.t * 1.2 + th.phase) * th.bob);
    const x = Math.round(sx - w / 2);
    const y = Math.round(sy - h / 2);
    if (x > this.W || x + w < 0) return;
    const g = this.g;
    if (th.trail) {
      const dir = th.trail;
      const tx = dir > 0 ? x : x + w;
      for (let i = 0; i < 60; i += 1) {
        if (i > 20 && bayer(i, 0) < i / 70) continue;
        g.fillStyle = i < 30 ? "#ffffff" : "#e6f2ff";
        g.fillRect(tx - dir * (i + 1), y + 4, 1, 1);
        g.fillRect(tx - dir * (i + 1), y + 6, 1, 1);
      }
    }
    g.drawImage(img, x, y);
    if (th.blink && Math.sin(this.t * 4 + th.phase) > 0.4) {
      g.fillStyle = th.blink[2];
      g.fillRect(x + th.blink[0], y + th.blink[1], 1, 1);
    }
  }

  private drawSun() {
    const km = this.camKm();
    if (km > 70) return;
    const img = this.sp.sun;
    const x = Math.round(this.W * 0.78 + (this.anchorX - this.W / 2) * 0.05 - img.width / 2);
    const y = Math.round(this.H * 0.13 + Math.min(this.camWY, 900) * 0.04 - img.height / 2);
    this.g.drawImage(img, x, y);
  }

  private drawEarth() {
    const e = this.earth;
    if (!e) return;
    const vis = smooth(860, 1080, this.camWY) * (1 - smooth(1380, 1700, this.camWY));
    if (vis <= 0.01) return;
    const x = Math.round(this.W / 2 + (this.anchorX - this.W / 2) * 0.3 - e.width / 2);
    const y = Math.round(this.H + 4 - vis * e.height * 0.85);
    this.g.drawImage(e, x, y);
  }

  private drawComet() {
    const km = 186;
    const d = 0.8;
    const travel = this.W * 1.8;
    const p = ((this.t * 7) % travel) - this.W * 0.4;
    const sy0 = this.anchorY - (worldY(km) - this.camWY) * d;
    if (sy0 < -40 || sy0 > this.H + 40) return;
    const x = Math.round(p + (this.anchorX - this.W / 2) * d);
    const y = Math.round(sy0 + p * 0.12);
    const g = this.g;
    const pal = ["#ffffff", "#d9f7ff", "#8fe0ff", "#4aa3e8", "#2c5fb0"];
    for (let i = 0; i < 26; i += 1) {
      const f = i / 26;
      if (f > 0.4 && bayer(i, i >> 2) < f - 0.3) continue;
      g.fillStyle = pal[Math.min(pal.length - 1, Math.floor(f * pal.length))]!;
      const spread = Math.floor(f * 3);
      g.fillRect(x - i, Math.round(y - i * 0.12) - spread, 1, 1 + spread * 2);
    }
    g.fillStyle = "#ffffff";
    g.fillRect(x, y - 1, 2, 2);
  }

  private drawBlackHole() {
    const km = 340;
    const d = 0.85;
    const a = this.bhA;
    const cvs = this.bh;
    const [sx, sy] = this.screenPos({ km, wx: this.W * 0.14, d });
    if (sy + cvs.height < -10 || sy - cvs.height > this.H + 10) return;
    const bg = cvs.getContext("2d")!;
    const w = cvs.width;
    const h = cvs.height;
    const img = bg.createImageData(w, h);
    const data = new Uint32Array(img.data.buffer);
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    const b = a * 0.27;
    const rs = a * 0.34;
    const t = this.state.reduced ? 0 : this.t;
    for (let y = 0; y < h; y += 1) {
      const dy = y - cy;
      for (let x = 0; x < w; x += 1) {
        const dx = x - cx;
        const dist = Math.hypot(dx, dy);
        const ex = dx / a;
        const ey = dy / b;
        const e = Math.hypot(ex, ey);
        const inDisk = e >= 0.42 && e <= 1.05;
        let col = 0;
        const disk = () => {
          const heat = 1 - (e - 0.42) / 0.63;
          const ang = Math.atan2(ey, ex);
          const swirl = 0.5 + 0.5 * Math.sin(ang * 3 - t * 2.6 + e * 13);
          const v = heat * 0.72 + swirl * 0.28 - ex * 0.18;
          if (e > 0.88 && v < bayer(x, y) * 0.6) return 0;
          const s = clamp(v, 0, 0.999) * (BH_PACKED.length - 1);
          const i = Math.floor(s);
          return BH_PACKED[Math.min(BH_PACKED.length - 1, s - i > bayer(x, y) ? i + 1 : i)]!;
        };
        if (dy > 0 && inDisk) col = disk();
        if (!col) {
          if (dist <= rs) col = PACK_BLACK;
          else if (dist <= rs + 1.4) col = BH_PACKED[4]!;
          else if (inDisk) col = disk();
          else if (dist <= rs + 7) {
            const gl = 1 - (dist - rs - 1.4) / 5.6;
            const sw = 0.6 + 0.4 * Math.sin(Math.atan2(dy, dx) * 2 + t * 1.8);
            const v = gl * sw * (dy < 0 ? 1 : 0.6);
            if (v > bayer(x, y) * 0.9) col = BH_PACKED[v > 0.6 ? 3 : 2]!;
          }
        }
        if (col) data[y * w + x] = col;
      }
    }
    for (let i = 0; i < 46; i += 1) {
      const life = (i * 0.137 + t * 0.07) % 1;
      const rad = rs + (a * 1.35 - rs) * (1 - life);
      const ang = i * 2.39 + t * (1.6 * a) / rad;
      const px = Math.round(cx + Math.cos(ang) * rad);
      const py = Math.round(cy + Math.sin(ang) * rad * 0.3);
      if (Math.sin(ang) < 0 && Math.hypot(px - cx, py - cy) < rs + 1) continue;
      if (px >= 0 && px < w && py >= 0 && py < h) data[py * w + px] = BH_PACKED[3 + (i % 3)]!;
    }
    bg.putImageData(img, 0, 0);
    this.g.drawImage(cvs, Math.round(sx - w / 2), Math.round(sy - h / 2));
  }

  private drawTerrain() {
    const { g, W, H } = this;
    const pan = this.anchorX - W / 2;
    const groundY = (d: number) => this.anchorY - (GROUND - this.camWY) * d;

    const mBase = groundY(0.3);
    if (mBase - 70 < H) {
      for (let x = 0; x < W; x += 1) {
        const wx = x - pan * 0.3;
        const h = 14 + fbm(wx / 46, 0.5, 3, 3) * 46;
        const top = Math.round(mBase - h);
        g.fillStyle = "#7f9bd0";
        g.fillRect(x, top, 1, H - top);
        if (h > 40) {
          g.fillStyle = "#eef4ff";
          g.fillRect(x, top, 1, Math.round((h - 40) / 2) + 1);
        }
        g.fillStyle = "#6f8bc2";
        const shade = Math.round(mBase - h * 0.35);
        if ((x & 1) === 0) g.fillRect(x, shade, 1, 1);
        g.fillRect(x, shade + 1, 1, H);
      }
    }

    const hBase = groundY(0.6);
    if (hBase - 40 < H) {
      for (let x = 0; x < W; x += 1) {
        const wx = x - pan * 0.6;
        const h = 6 + fbm(wx / 30, 2.5, 7, 3) * 26;
        const top = Math.round(hBase - h);
        g.fillStyle = "#86cf72";
        g.fillRect(x, top, 1, 1);
        g.fillStyle = "#5aae5f";
        g.fillRect(x, top + 1, 1, H);
        g.fillStyle = "#4a9655";
        if ((x + top) % 2 === 0) g.fillRect(x, top + 4, 1, 1);
        g.fillRect(x, top + 5, 1, H);
        const tn = fbm(wx / 7, 9.1, 11, 1);
        if (tn > 0.66) {
          g.fillStyle = "#2f6f3f";
          const th = Math.round((tn - 0.6) * 18);
          g.fillRect(x, top - th, 1, th);
        }
      }
    }

    const gy = Math.round(groundY(1));
    if (gy - 60 > H) return;
    const sceneX = (wx: number) => Math.round(this.anchorX + wx);
    for (let i = 0; i < 16; i += 1) {
      const wx = -W + ((i * 97) % 31) + i * (W * 2) / 16;
      if (wx > -36 && wx < 62) continue;
      const tree = this.sp.trees[i % 3]!;
      g.drawImage(tree, sceneX(wx) - tree.width / 2, gy - tree.height + 1);
    }
    g.drawImage(this.sp.bunker, sceneX(40), gy - this.sp.bunker.height + 1);
    if (Math.sin(this.t * 3) > 0) {
      g.fillStyle = "#ff5d8f";
      g.fillRect(sceneX(40) + 6, gy - this.sp.bunker.height + 1, 1, 1);
    }
    g.drawImage(this.sp.tank, sceneX(-50), gy - this.sp.tank.height + 1);
    const gt = this.sp.gantry;
    const gx = sceneX(-20);
    g.drawImage(gt, gx, gy - gt.height + 1);
    if (this.state.stage === "pad" || this.state.stage === "ignite") {
      if (this.camWY < 2) {
        g.fillStyle = "#6d7593";
        g.fillRect(gx + gt.width, gy - 32, Math.max(0, sceneX(-9) - gx - gt.width), 2);
      }
    }
    if (Math.sin(this.t * 4) > 0) {
      g.fillStyle = "#ff3d3d";
      g.fillRect(gx + 4, gy - gt.height, 1, 1);
    }

    g.fillStyle = "#7ddc6e";
    g.fillRect(0, gy, W, 1);
    g.fillStyle = "#56b85a";
    g.fillRect(0, gy + 1, W, 2);
    g.fillStyle = "#3f9a4b";
    g.fillRect(0, gy + 3, W, 6);
    g.fillStyle = "#357f40";
    for (let x = 0; x < W; x += 2) g.fillRect(x + ((gy >> 0) & 1), gy + 5, 1, 1);
    g.fillRect(0, gy + 7, W, 2);
    g.fillStyle = "#6d4c33";
    g.fillRect(0, gy + 9, W, H);
    g.fillStyle = "#5a3d28";
    for (let x = 0; x < W; x += 1) {
      const wx = x - pan;
      if ((wx * 7 + 3) % 11 < 1) g.fillRect(x, gy + 12 + ((wx * 5) % 9), 2, 1);
      if ((x & 1) === 0) g.fillRect(x, gy + 9, 1, 1);
    }
    for (let x = 0; x < W; x += 1) {
      const wx = Math.round(x - pan);
      if ((((wx * 13) % 7) + 7) % 7 === 0) {
        g.fillStyle = "#9be38a";
        g.fillRect(x, gy - 1, 1, 1);
      }
    }
    const pad = this.sp.pad;
    g.drawImage(pad, sceneX(0) - Math.floor(pad.width / 2), gy - pad.height + 1);
  }

  private drawRocket() {
    const { g } = this;
    const { stage } = this.state;
    const img = this.sp.rocket;
    const landing = stage === "pad" && this.camWY > 2;
    const airborne = stage === "boost" || stage === "cruise" || landing;
    let bob = 0;
    if (airborne && !this.state.reduced) bob = Math.round(Math.sin(this.t * 2.2) * 1.2);
    let jx = 0;
    if ((stage === "boost" || stage === "ignite") && !this.state.reduced) jx = this.flameSeed > 0.66 ? 1 : this.flameSeed < 0.33 ? -1 : 0;
    const rx = Math.round(this.anchorX) + jx;
    const base = Math.round(this.anchorY) + bob;

    let len = 0;
    if (stage === "ignite") len = 3 + Math.round(this.flameSeed * 5);
    else if (stage === "boost") len = 15 + Math.round(this.flameSeed * 8);
    else if (stage === "cruise" || landing) len = 6 + Math.round(this.flameSeed * 4);
    if (this.stall > 0) len = this.flameSeed > 0.8 ? 2 : 0;
    if (this.state.reduced && airborne) len = 8;
    if (len > 0) this.drawFlame(rx, base, len);

    g.drawImage(img, rx - Math.floor(img.width / 2), base - img.height + 1);
  }

  private drawFlame(rx: number, top: number, len: number) {
    const g = this.g;
    const s = this.flameSeed;
    for (let i = 0; i < len; i += 1) {
      const f = i / len;
      const wobble = ((i * 7 + Math.floor(s * 10)) % 3) - 1;
      const hw = Math.max(0, Math.round(3.2 * (1 - f * f) + (i > 1 ? wobble * 0.6 : 0)));
      const outer = f < 0.35 ? "#ffd15c" : f < 0.7 ? "#ff8a3c" : "#ff4d6d";
      g.fillStyle = outer;
      g.fillRect(rx - hw, top + i, hw * 2 + 1, 1);
      const core = Math.max(0, hw - 1);
      if (f < 0.6 && core >= 0) {
        g.fillStyle = f < 0.25 ? "#ffffff" : "#fff3a8";
        g.fillRect(rx - core, top + i, core * 2 + 1, 1);
      }
    }
    if (len > 10) {
      g.fillStyle = "#ffe27a";
      g.fillRect(rx - 4 + Math.round(s * 8), top + len + 1, 1, 1);
      g.fillRect(rx + 3 - Math.round(s * 6), top + len - 2, 1, 1);
    }
  }

  private disc(color: string, r: number, dither: boolean) {
    const key = `${color}|${r}|${dither ? 1 : 0}`;
    let c = this.discs.get(key);
    if (!c) {
      const size = r * 2 + 1;
      c = makeCanvas(size, size);
      const g = c.getContext("2d")!;
      g.fillStyle = color;
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          if (Math.hypot(x - r, y - r) > r + 0.3) continue;
          if (dither && (x + y) % 2) continue;
          g.fillRect(x, y, 1, 1);
        }
      }
      this.discs.set(key, c);
    }
    return c;
  }

  private drawParticles(over: boolean) {
    const g = this.g;
    for (const p of this.parts) {
      const front = p.kind === "star" || p.kind === "ring" || p.kind === "line";
      if (front !== over) continue;
      const f = p.life / p.max;
      const col = p.pal[Math.min(p.pal.length - 1, Math.floor(f * p.pal.length))]!;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      if (p.kind === "puff") {
        const r = Math.max(0, Math.round(p.size));
        const img = this.disc(col, r, f > 0.7);
        g.drawImage(img, x - r, y - r);
      } else if (p.kind === "spark") {
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      } else if (p.kind === "star") {
        g.fillStyle = col;
        if (p.size >= 2 && f < 0.7) {
          g.fillRect(x - 1, y, 3, 1);
          g.fillRect(x, y - 1, 1, 3);
        } else if ((Math.floor(p.life * 20) + x) % 3 !== 0) g.fillRect(x, y, 1, 1);
      } else if (p.kind === "line") {
        g.fillStyle = col;
        g.fillRect(x, y, 1, Math.round(p.size));
      } else if (p.kind === "ring") {
        g.fillStyle = col;
        const r = p.size;
        const n = Math.max(12, Math.round(r * 5));
        for (let i = 0; i < n; i += 1) {
          if (f > 0.5 && i % 2) continue;
          const a = (i / n) * Math.PI * 2;
          g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1);
        }
      } else if (p.kind === "meteor") {
        const dir = Math.sign(p.vx);
        for (let i = 0; i < p.size; i += 1) {
          g.fillStyle = p.pal[Math.min(p.pal.length - 1, Math.floor(i / 3))]!;
          if (i > 5 && i % 2) continue;
          g.fillRect(x - dir * i, y - Math.round(i * 0.5), 1, 1);
        }
      }
    }
  }
}

const FLAT_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const PACK_BLACK = pack([2, 1, 6]);

function flip(img: HTMLCanvasElement) {
  const c = makeCanvas(img.width, img.height);
  const g = c.getContext("2d")!;
  g.translate(img.width, 0);
  g.scale(-1, 1);
  g.drawImage(img, 0, 0);
  return c;
}
