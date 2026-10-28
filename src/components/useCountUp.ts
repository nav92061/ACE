"use client";

import { useEffect, useRef, useState } from "react";

/** Counts from the last shown value to `value`, for score readouts. */
export function useCountUp(value: number, ms = 900, initial = value) {
  const [shown, setShown] = useState(initial);
  const shownRef = useRef(initial);

  useEffect(() => {
    const from = shownRef.current;
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = instant ? 1 : Math.min(1, (now - start) / ms);
      const next = Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3)));
      shownRef.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);

  return shown;
}
