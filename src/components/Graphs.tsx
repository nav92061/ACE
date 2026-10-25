import type { GraphSpec } from "@/lib/types";

const W = 320;
const H = 188;
const PAD = { l: 38, r: 14, t: 14, b: 32 };

function sx(spec: GraphSpec, x: number) {
  return PAD.l + ((x - spec.xMin) / (spec.xMax - spec.xMin)) * (W - PAD.l - PAD.r);
}

function sy(spec: GraphSpec, y: number) {
  return PAD.t + ((spec.yMax - y) / (spec.yMax - spec.yMin)) * (H - PAD.t - PAD.b);
}

function yAt(spec: GraphSpec, x: number) {
  const pts = spec.points;
  if (!pts.length) return 0;
  if (x <= pts[0]!.x) return pts[0]!.y;
  const last = pts[pts.length - 1]!;
  if (x >= last.x) return last.y;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (x <= b.x) {
      const t = (x - a.x) / (b.x - a.x || 1);
      return a.y + t * (b.y - a.y);
    }
  }
  return last.y;
}

export function ProblemGraph({ spec }: { spec: GraphSpec }) {
  const baseline = Math.min(spec.yMax, Math.max(spec.yMin, 0));
  const line = spec.points.map((p) => `${sx(spec, p.x)},${sy(spec, p.y)}`).join(" ");
  const ticks = spec.xTicks ?? [spec.xMin, spec.xMax];
  let shade = "";
  if (spec.shadeFrom != null && spec.shadeTo != null) {
    const a = spec.shadeFrom;
    const b = spec.shadeTo;
    const steps = 16;
    const top: string[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const x = a + ((b - a) * i) / steps;
      top.push(`${sx(spec, x)},${sy(spec, yAt(spec, x))}`);
    }
    shade = [
      `${sx(spec, a)},${sy(spec, baseline)}`,
      ...top,
      `${sx(spec, b)},${sy(spec, baseline)}`,
    ].join(" ");
  }

  return (
    <svg className="graph" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${spec.yLabel} versus ${spec.xLabel}`}>
      <line
        x1={PAD.l}
        y1={sy(spec, spec.yMin)}
        x2={PAD.l}
        y2={sy(spec, spec.yMax)}
        className="axis"
      />
      <line
        x1={PAD.l}
        y1={sy(spec, baseline)}
        x2={W - PAD.r}
        y2={sy(spec, baseline)}
        className="axis"
      />
      {shade ? <polygon points={shade} className="shade" /> : null}
      <polyline points={line} className="series" />
      {ticks.map((tick) => (
        <text key={tick} x={sx(spec, tick)} y={H - 8} textAnchor="middle" className="tick">
          {tick}
        </text>
      ))}
      <text x={PAD.l - 8} y={sy(spec, spec.yMax) + 4} textAnchor="end" className="tick">
        {spec.yLabel}
      </text>
      <text x={W - PAD.r} y={sy(spec, baseline) - 8} textAnchor="end" className="tick">
        {spec.xLabel}
      </text>
    </svg>
  );
}
