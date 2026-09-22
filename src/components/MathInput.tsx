"use client";

import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import "mathlive";

interface MathInputProps {
  value: string;
  onChange: (latex: string) => void;
  onSubmit?: () => void;
  className?: string;
  autoFocus?: boolean;
}

type MathFieldEl = HTMLElement & { value: string; focus: () => void };

export type MathInputHandle = { getValue: () => string };

/**
 * MathLive field for expression answers.
 * Exposes getValue() so Submit always reads the live field (not stale React state).
 */
export const MathInput = forwardRef<MathInputHandle, MathInputProps>(
  function MathInput(
    { value, onChange, onSubmit, className = "", autoFocus = true },
    ref,
  ) {
    const elRef = useRef<MathFieldEl | null>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => elRef.current?.value ?? value ?? "",
    }));

    useEffect(() => {
      const el = elRef.current;
      if (!el) return;

      const formatValue = (raw: string) =>
        raw.replace(/--/g, "+").replace(/\+-/g, "-").replace(/-\+/g, "-");

      const handleInput = () => {
        const next = formatValue(el.value ?? "");
        if (next !== el.value) el.value = next;
        onChange(next);
      };
      const handleKey = (e: Event) => {
        const ke = e as KeyboardEvent;
        if (ke.key === "Enter") {
          ke.preventDefault();
          const next = formatValue(el.value ?? "");
          onChange(next);
          onSubmit?.();
        }
      };

      el.addEventListener("input", handleInput);
      el.addEventListener("change", handleInput);
      el.addEventListener("keydown", handleKey);
      let t: ReturnType<typeof setTimeout> | undefined;
      if (autoFocus) {
        t = setTimeout(() => el.focus?.(), 50);
      }
      return () => {
        if (t) clearTimeout(t);
        el.removeEventListener("input", handleInput);
        el.removeEventListener("change", handleInput);
        el.removeEventListener("keydown", handleKey);
      };
    }, [onChange, onSubmit, autoFocus]);

    useEffect(() => {
      const el = elRef.current;
      if (el && el.value !== value) {
        el.value = value;
      }
    }, [value]);

    return createElement("math-field", {
      ref: elRef,
      className: `math-input ${className}`,
      "virtual-keyboard-mode": "manual",
      "smart-fence": true,
      style: {
        display: "block",
        width: "100%",
        minHeight: "3rem",
        fontSize: "1.35rem",
        padding: "0.6rem 0.85rem",
        borderRadius: "0.5rem",
        border: "2px solid var(--ace-border)",
        background: "var(--ace-surface)",
        color: "var(--ace-ink)",
      },
    });
  },
);
