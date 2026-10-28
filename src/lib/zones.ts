/**
 * The flight path, bottom to top. Each zone starts at `from` km and gets `span`
 * pixels of world height, so short zones near the ground still feel roomy.
 */
export interface Zone {
  id: ZoneId;
  name: string;
  from: number;
  span: number;
  blurb: string;
}

export type ZoneId =
  | "pad"
  | "sky"
  | "clouds"
  | "strato"
  | "aurora"
  | "orbit"
  | "moon"
  | "planets"
  | "nebula"
  | "void";

export const ZONES: Zone[] = [
  { id: "pad", name: "Launch Pad", from: 0, span: 70, blurb: "Still on the pad. Tomorrow is another launch." },
  { id: "sky", name: "Lower Sky", from: 1, span: 200, blurb: "Off the pad and climbing." },
  { id: "clouds", name: "Cloud Layer", from: 6, span: 260, blurb: "Punched through the clouds." },
  { id: "strato", name: "Stratosphere", from: 15, span: 240, blurb: "Above the weather." },
  { id: "aurora", name: "Aurora", from: 40, span: 260, blurb: "Riding the northern lights." },
  { id: "orbit", name: "Low Orbit", from: 75, span: 280, blurb: "Circling the planet." },
  { id: "moon", name: "Lunar Space", from: 110, span: 300, blurb: "Waved at the Moon." },
  { id: "planets", name: "Planet Belt", from: 160, span: 340, blurb: "Rings in the window." },
  { id: "nebula", name: "Nebula", from: 220, span: 320, blurb: "Lost in a star nursery." },
  { id: "void", name: "Event Horizon", from: 290, span: 420, blurb: "Almost nobody flies this far." },
];

/** Altitude where the map ends. Higher scores keep the black hole view. */
export const TOP_KM = 450;

export function zoneFor(km: number): Zone {
  let pick = ZONES[0]!;
  for (const z of ZONES) if (km >= z.from) pick = z;
  return pick;
}

function zoneEnd(i: number) {
  return ZONES[i + 1]?.from ?? TOP_KM;
}

/** km to world pixels (up is positive). Linear inside each zone. */
export function worldY(km: number): number {
  let y = 0;
  for (let i = 0; i < ZONES.length; i += 1) {
    const z = ZONES[i]!;
    const end = zoneEnd(i);
    if (km < end || i === ZONES.length - 1) {
      return y + ((Math.min(km, end) - z.from) / (end - z.from)) * z.span + Math.max(0, km - TOP_KM) * 0.2;
    }
    y += z.span;
  }
  return y;
}

/** World pixels back to km. */
export function kmAt(wy: number): number {
  if (wy <= 0) return 0;
  let y = 0;
  for (let i = 0; i < ZONES.length; i += 1) {
    const z = ZONES[i]!;
    const end = zoneEnd(i);
    if (wy < y + z.span || i === ZONES.length - 1) {
      return z.from + ((wy - y) / z.span) * (end - z.from);
    }
    y += z.span;
  }
  return TOP_KM;
}

export const WORLD_TOP = worldY(TOP_KM);

/** 0 at the pad, 1 at the top of the map. Used by the side meter. */
export function progressFor(km: number) {
  return Math.max(0, Math.min(1, worldY(km) / WORLD_TOP));
}
