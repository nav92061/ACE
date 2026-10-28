"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { progressFor, TOP_KM, ZONES, worldY, WORLD_TOP, zoneFor } from "@/lib/zones";
import { SkyEngine, type Stage } from "./sky/engine";

export type { Stage } from "./sky/engine";

export interface Pulse {
  kind: "ok" | "no";
  id: number;
}

const ZONE_TINT: Record<string, string> = {
  pad: "#7ddc6e",
  sky: "#8fd8fb",
  clouds: "#e8f3ff",
  strato: "#3f7fd6",
  aurora: "#3ddc97",
  orbit: "#6fd3ff",
  moon: "#dfe0ea",
  planets: "#e5bd7c",
  nebula: "#e0559b",
  void: "#ffbf45",
};

export function SkyScene({
  altitude,
  stage,
  side,
  reduced,
  celebrate = false,
  pulse,
  children,
}: {
  altitude: number;
  stage: Stage;
  side: boolean;
  reduced: boolean;
  celebrate?: boolean;
  pulse?: Pulse | null;
  children: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SkyEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new SkyEngine(canvas);
    engineRef.current = engine;
    engine.start();
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setState({ km: altitude, stage, side, reduced, celebrate });
  }, [altitude, stage, side, reduced, celebrate]);

  useEffect(() => {
    if (pulse) engineRef.current?.pulse(pulse.kind);
  }, [pulse]);

  // On the landing page, stand the rocket on top of the button stack.
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(".land-actions");
      engineRef.current?.setPadTop(el ? el.getBoundingClientRect().top : null);
    };
    measure();
    const late = window.setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(late);
      window.removeEventListener("resize", measure);
    };
  }, [stage, children]);

  const you = progressFor(altitude) * 100;
  const zone = zoneFor(altitude);
  return (
    <div className={`world${reduced ? " reduced" : ""}`}>
      <canvas ref={canvasRef} className="sky-canvas" aria-hidden />
      <div className={`meter${stage === "pad" && altitude === 0 ? " hidden" : ""}`} aria-hidden>
        {ZONES.map((z, i) => {
          const end = ZONES[i + 1]?.from ?? TOP_KM;
          const from = (worldY(z.from) / WORLD_TOP) * 100;
          const to = (worldY(end) / WORLD_TOP) * 100;
          return (
            <span
              key={z.id}
              className={`meter-seg${z.id === zone.id ? " on" : ""}`}
              style={{ bottom: `${from}%`, height: `${to - from}%`, background: ZONE_TINT[z.id] }}
            />
          );
        })}
        <span className="meter-you" style={{ bottom: `${you}%` }}>
          <span className="meter-tag">{Math.round(altitude)}</span>
        </span>
      </div>
      {reduced ? null : <div className="scanlines" aria-hidden />}
      {children}
    </div>
  );
}
