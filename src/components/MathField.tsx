"use client";

import { createElement, useEffect, useRef } from "react";

type MathFieldEl = HTMLElement & {
  value: string;
  focus: () => void;
  getValue?: (format?: string) => string;
  shadowRoot: ShadowRoot | null;
};

function readLatex(el: MathFieldEl | null): string {
  if (!el) return "";
  try {
    return el.getValue?.("latex") || el.value || "";
  } catch {
    return el.value || "";
  }
}

export function MathField({
  onChange,
  onSubmit,
  disabled,
}: {
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<MathFieldEl | null>(null);
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  onChangeRef.current = onChange;
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    let dead = false;
    let detach = () => {};
    void import("mathlive").then(() => {
      if (dead) return;
      const el = ref.current;
      if (!el) return;
      const style = document.createElement("style");
      style.textContent = `
        .ML__menu-toggle, .ML__virtual-keyboard-toggle { display: none !important; }
        .ML__container, .ML__content { background: transparent !important; }
        .ML__latex { color: #f4fbff !important; }
      `;
      el.shadowRoot?.appendChild(style);
      const publish = () => onChangeRef.current(readLatex(el));
      const handleKey = (event: Event) => {
        const ke = event as KeyboardEvent;
        if (ke.key === "Enter" && !ke.shiftKey) {
          ke.preventDefault();
          publish();
          onSubmitRef.current();
        }
      };
      el.addEventListener("input", publish);
      el.addEventListener("change", publish);
      el.addEventListener("keydown", handleKey);
      window.setTimeout(() => el.focus?.(), 40);
      detach = () => {
        el.removeEventListener("input", publish);
        el.removeEventListener("change", publish);
        el.removeEventListener("keydown", handleKey);
      };
    });
    return () => {
      dead = true;
      detach();
    };
  }, []);

  return createElement("math-field", {
    ref,
    className: "math-field",
    "aria-label": "Your answer",
    "math-virtual-keyboard-policy": "manual",
    "smart-fence": "true",
    "smart-superscript": "off",
    "smart-mode": "off",
    "popover-policy": "off",
    placeholder: "\\text{Type your answer}",
    readOnly: disabled ? true : undefined,
  });
}
