"use client";

import { useEffect, useRef, useState } from "react";
import type { AnswerRecord, Problem } from "@/lib/types";
import { ProblemGraph } from "./Graphs";
import { MathField } from "./MathField";
import { MathView, PromptView } from "./MathView";
import { squareFor } from "@/lib/score";

export function ProblemPane({
  problem,
  index,
  total,
  altitude,
  answers,
  scored,
  onSubmit,
}: {
  problem: Problem;
  index: number;
  total: number;
  altitude: number;
  answers: AnswerRecord[];
  scored: boolean;
  onSubmit: (raw: string, seconds: number) => void;
}) {
  const [left, setLeft] = useState(60);
  const [choice, setChoice] = useState<string | null>(null);
  const remainRef = useRef(60);
  const choiceRef = useRef<string | null>(null);
  const exprRef = useRef("");
  const locked = useRef(false);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    locked.current = false;
    remainRef.current = 60;
    choiceRef.current = null;
    exprRef.current = "";
    setLeft(60);
    setChoice(null);
    const start = performance.now();
    const id = window.setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const remain = Math.max(0, 60 - elapsed);
      remainRef.current = remain;
      setLeft(remain);
      if (remain <= 0) {
        window.clearInterval(id);
        fire();
      }
    }, 100);
    return () => window.clearInterval(id);
    // Reset only when the problem changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id]);

  function fire() {
    if (locked.current) return;
    locked.current = true;
    const seconds = Math.min(60, Math.max(0, 60 - remainRef.current));
    let raw = choiceRef.current ?? "";
    if (problem.type !== "mc") {
      const field = document.querySelector("math-field") as
        | (HTMLElement & { value: string; getValue?: (format?: string) => string })
        | null;
      raw = exprRef.current;
      if (field) {
        try {
          raw = field.getValue?.("latex") || field.value || raw;
        } catch {
          raw = field.value || raw;
        }
      }
    }
    onSubmitRef.current(raw, seconds);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === "MATH-FIELD" || target?.tagName === "INPUT";
      if (problem.type === "mc" && !typing && ["1", "2", "3", "4"].includes(e.key)) {
        const next = problem.choices?.[Number(e.key) - 1];
        if (next) {
          choiceRef.current = next.id;
          setChoice(next.id);
        }
      }
      if (e.key === "Enter" && problem.type === "mc") {
        e.preventDefault();
        fire();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [problem]);

  const secs = Math.ceil(left);
  const dash = 2 * Math.PI * 18;
  const offset = dash * (1 - left / 60);

  return (
    <div className="play">
      <header className="hud">
        <div className="hud-stat">
          <span className="hud-label">Altitude</span>
          <strong>{altitude} km</strong>
        </div>
        <ol className="squares" aria-label="Problems">
          {Array.from({ length: total }, (_, i) => {
            const ans = answers[i];
            const cls = ans ? squareFor(ans) : i === index ? "now" : "todo";
            return <li key={i} className={`sq ${cls}`} />;
          })}
        </ol>
        <div className="hud-stat hud-right">
          <span className="hud-label">Score</span>
          <strong>{altitude}</strong>
        </div>
      </header>

      <div className="stage">
        <article className="pixel-frame card">
          <div className="pixel-inner">
            <p className="kicker">
              Problem {index + 1} of {total}
              {scored ? null : " · practice"}
            </p>
            <p className="unit-name">{problem.unit}</p>
            <PromptView parts={problem.prompt} />
            {problem.graph ? <ProblemGraph spec={problem.graph} /> : null}
            <p className="rarity">harder answers fly higher</p>
          </div>
        </article>
      </div>

      <div className="dock">
        {problem.type === "mc" ? (
          <div className="choices" role="radiogroup" aria-label="Choices">
            {problem.choices?.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={choice === c.id}
                className={`btn-choice${choice === c.id ? " selected" : ""}`}
                onClick={() => {
                  choiceRef.current = c.id;
                  setChoice(c.id);
                }}
              >
                <MathView latex={c.latex} />
              </button>
            ))}
          </div>
        ) : null}
        <div className="dock-row">
          <div
            className="timer"
            role="timer"
            aria-label={`${secs} seconds left`}
          >
            <svg viewBox="0 0 44 44" aria-hidden>
              <circle cx="22" cy="22" r="18" className="timer-track" />
              <circle
                cx="22"
                cy="22"
                r="18"
                className="timer-value"
                strokeDasharray={dash}
                strokeDashoffset={offset}
              />
            </svg>
            <span>{secs}</span>
          </div>
          {problem.type === "mc" ? (
            <p className="dock-hint">Choose an answer, then fire</p>
          ) : (
            <MathField
              key={problem.id}
              onChange={(v) => {
                exprRef.current = v;
              }}
              onSubmit={fire}
            />
          )}
          <button type="button" className="btn-fire" onClick={fire}>
            Fire
          </button>
        </div>
      </div>
    </div>
  );
}
