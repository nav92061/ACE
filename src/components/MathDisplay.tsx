"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { PromptLine, PromptPart } from "@/types";
import { latexToLines, latexToPlain } from "@/lib/problems/prompt";

interface MathDisplayProps {
  /** Structured lines (preferred). */
  lines?: PromptLine[];
  /** Legacy latex — converted if lines omitted. */
  latex?: string;
  className?: string;
}

function KatexOnly({ math }: { math: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const src = math.trim();
    if (!src) {
      el.textContent = "";
      return;
    }
    try {
      katex.render(src, el, {
        throwOnError: false,
        displayMode: false,
        strict: "ignore",
      });
      if (el.querySelector(".katex-error")) {
        el.textContent = latexToPlain(src);
      }
    } catch {
      el.textContent = latexToPlain(src);
    }
  }, [math]);
  return <span ref={ref} className="katex-host" />;
}

function PartView({ part }: { part: PromptPart }) {
  if (part.kind === "text") {
    return <span className="prompt-text">{part.value}</span>;
  }
  return (
    <span className="prompt-math">
      <KatexOnly math={part.value} />
    </span>
  );
}

/**
 * Renders prompts / solutions / answers.
 * Text is HTML. Math is KaTeX only. Never mixes them in one KaTeX string.
 */
export function MathDisplay({ lines, latex, className }: MathDisplayProps) {
  const rows: PromptLine[] =
    lines && lines.length > 0
      ? lines
      : latex
        ? latexToLines(latex)
        : [[ { kind: "text", value: "" } ]];

  return (
    <div className={`prompt-view ${className ?? ""}`}>
      {rows.map((row, i) => (
        <div key={i} className="prompt-row">
          {row.map((part, j) => (
            <PartView key={j} part={part} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Back-compat export used by older call sites. */
export function prepareLatex(latex: string): string {
  return latex;
}
