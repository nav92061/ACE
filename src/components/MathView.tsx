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
  rich = false,
}: {
  parts: { kind: "text" | "math"; value: string }[];
  rich?: boolean;
}) {
  return (
    <div className="prompt">
      {parts.map((part, i) =>
        rich ? (
          <RichText key={i} text={part.value} block />
        ) : part.kind === "math" ? (
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

/** Plain text with $inline math$, used for questions generated from notes. */
export function RichText({ text, block = false }: { text: string; block?: boolean }) {
  const parts = text.split(/(\$[^$]+\$)/g).filter(Boolean);
  const Tag = block ? "p" : "span";
  return (
    <Tag className={block ? "rich-text prompt-text" : "rich-text"}>
      {parts.map((part, i) =>
        part.startsWith("$") && part.endsWith("$") && part.length > 2 ? (
          <MathView key={i} latex={part.slice(1, -1)} />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </Tag>
  );
}
