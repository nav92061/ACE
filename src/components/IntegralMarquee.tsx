"use client";

/** Soft marquee of integral symbols for the practice hub. */
export function IntegralMarquee() {
  const items = [
    "∫",
    "∬",
    "dx",
    "∑",
    "∂",
    "f′",
    "lim",
    "∇",
    "∮",
    "Δ",
    "∞",
    "π",
  ];
  const strip = [...items, ...items, ...items];

  return (
    <div className="integral-marquee" aria-hidden>
      <div className="integral-marquee-track">
        {strip.map((sym, i) => (
          <span key={`${sym}-${i}`} className="integral-chip">
            {sym}
          </span>
        ))}
      </div>
    </div>
  );
}
