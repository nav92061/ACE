import type { CSSProperties, ReactNode } from "react";

/** How far up the lane the rocket sits. The first correct answers leave the ground. */
export function liftFor(km: number) {
  if (km <= 0) return 0;
  return Math.min(1, 1 - Math.exp(-km / 14));
}

/** Night sky and stars. They stay off through the blue atmosphere. */
export function spaceFor(km: number) {
  if (km <= 70) return 0;
  return Math.min(1, (km - 70) / 160);
}

export function SkyScene({
  altitude,
  boost,
  reduced,
  children,
}: {
  altitude: number;
  boost: boolean;
  reduced: boolean;
  children: ReactNode;
}) {
  const lift = liftFor(altitude);
  const space = spaceFor(altitude);
  const style = {
    "--lift": String(lift),
    "--space": String(space),
    "--star": String(space),
  } as CSSProperties;

  const marks = [0, 50, 100, 150, 200, 250, 300];
  const you = Math.min(100, (altitude / 300) * 100);
  return (
    <div className={`world${reduced ? " reduced" : ""}${boost ? " boost" : ""}`} style={style}>
      <div className="sky-day" aria-hidden />
      <div className="sky-night" aria-hidden />
      <div className="stars" aria-hidden />
      <div className="stars stars-far" aria-hidden />
      <div className="moon" aria-hidden />
      <div className="satellite" aria-hidden />
      <div className="clouds" aria-hidden>
        <span className="cloud c1" />
        <span className="cloud c2" />
        <span className="cloud c3" />
        <span className="cloud c4" />
      </div>
      <div className="horizon" aria-hidden />
      <div className="rocket" aria-hidden>
        <svg viewBox="0 0 32 78" shapeRendering="crispEdges">
          <rect x="14" y="0" width="4" height="4" fill="#ff5d8f" />
          <rect x="12" y="4" width="8" height="4" fill="#f7f7f7" />
          <rect x="10" y="8" width="12" height="22" fill="#eef3f8" />
          <rect x="14" y="14" width="4" height="6" fill="#3ee0ff" />
          <rect x="6" y="22" width="4" height="8" fill="#ff5d8f" />
          <rect x="22" y="22" width="4" height="8" fill="#ff5d8f" />
          <g className="thrust">
            <rect className="flame outer" x="11" y="30" width="10" height="18" fill="#ff5d8f" />
            <rect className="flame mid" x="13" y="30" width="6" height="26" fill="#ff9a3c" />
            <rect className="flame core" x="15" y="30" width="2" height="16" fill="#fff6c2" />
            <rect className="spark s1" x="7" y="34" width="3" height="3" fill="#ffd15c" />
            <rect className="spark s2" x="22" y="36" width="3" height="3" fill="#ff5d8f" />
          </g>
        </svg>
      </div>
      <div className="ruler" aria-hidden>
        {marks.map((m) => (
          <span key={m} className="ruler-mark" style={{ bottom: `${(m / 300) * 100}%` }}>
            {m}
          </span>
        ))}
        <span className="you" style={{ bottom: `${you}%` }}>
          YOU
        </span>
      </div>
      {reduced ? null : <div className="scanlines" aria-hidden />}
      {children}
    </div>
  );
}
