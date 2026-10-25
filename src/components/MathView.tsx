"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export function MathView({
  latex,
  display = false,
}: {
  latex: string;
  display?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      katex.render(latex, el, {
        throwOnError: false,
        displayMode: display,
        strict: "ignore",
      });
    } catch {
      el.textContent = latex;
    }
  }, [latex, display]);
  return <span ref={ref} className="math-view" />;
}

export function PromptView({
  parts,
}: {
  parts: { kind: "text" | "math"; value: string }[];
}) {
  return (
    <div className="prompt">
      {parts.map((part, i) =>
        part.kind === "math" ? (
          <div key={i} className="prompt-math">
            <MathView latex={part.value} display />
          </div>
        ) : (
          <p key={i} className="prompt-text">
            {part.value}
          </p>
        ),
      )}
    </div>
  );
}
