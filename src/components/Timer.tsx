"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  /** Total seconds for the set. */
  seconds: number;
  running: boolean;
  onExpire: () => void;
}

/** Game-style countdown with a health/clock bar. */
export function Timer({ seconds, running, onExpire }: TimerProps) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      onExpire();
      return;
    }
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, left, onExpire]);

  useEffect(() => {
    if (running && left === 0) onExpire();
  }, [left, running, onExpire]);

  const urgent = left <= 10;
  const mins = Math.floor(left / 60);
  const secs = left % 60;
  const label = `${mins}:${secs.toString().padStart(2, "0")}`;
  const pct = seconds > 0 ? Math.max(0, Math.min(100, (left / seconds) * 100)) : 0;

  return (
    <div
      className={`timer-wrap ${urgent ? "timer-urgent" : ""}`}
      aria-live="polite"
      aria-label={`${left} seconds remaining`}
    >
      <div className="timer">{label}</div>
      <div className="timer-bar" role="presentation">
        <div className="timer-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
