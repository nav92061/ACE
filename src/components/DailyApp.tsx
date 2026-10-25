"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatCountdown, msUntilNextSet, setNumberFor, utcDateKey } from "@/lib/daily";
import { answersMatch, correctLatex } from "@/lib/grade";
import { problemsForDate, problemsForUnit, unlimitedProblems, UNITS } from "@/lib/problems";
import { altitudeFor, shareText, squareFor, tierFor, weakestUnit } from "@/lib/score";
import { downloadStoryCard } from "@/lib/shareCard";
import { playTone } from "@/lib/sound";
import {
  finishDaily,
  loadDaily,
  loadHistory,
  loadSound,
  loadStreak,
  recordAttempt,
  saveDaily,
  saveSound,
} from "@/lib/storage";
import type { AnswerRecord, FlightMode, FlightRecord, Problem, StreakState } from "@/lib/types";
import { MathView } from "./MathView";
import { ProblemPane } from "./ProblemPane";
import { SkyScene } from "./SkyScene";

type Phase = "land" | "problem" | "feedback" | "climb" | "results" | "archive" | "units";

interface Run {
  mode: FlightMode;
  problems: Problem[];
  index: number;
  answers: AnswerRecord[];
  altitude: number;
  unit?: string;
}

interface Feedback {
  correct: boolean;
  raw: string;
  problem: Problem;
  percent: number;
}

function toFlight(run: Run, date: string, setNumber: number, finished: boolean): FlightRecord {
  return {
    date,
    setNumber,
    mode: run.mode,
    unit: run.unit,
    answers: run.answers,
    altitude: run.altitude,
    finished,
  };
}

export function DailyApp() {
  const date = utcDateKey();
  const setNumber = setNumberFor();
  const [phase, setPhase] = useState<Phase>("land");
  const [soundOn, setSoundOn] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [streak, setStreak] = useState<StreakState>({ count: 0, lastDate: null, graceWeek: null });
  const [today, setToday] = useState<FlightRecord | null>(null);
  const [archive, setArchive] = useState<FlightRecord[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [climbTo, setClimbTo] = useState<"problem" | "results">("problem");
  const [countNum, setCountNum] = useState(3);
  const [copied, setCopied] = useState(false);
  const [boost, setBoost] = useState(false);
  const [left, setLeft] = useState("");
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(0);
  const [lastGain, setLastGain] = useState(0);
  const runRef = useRef<Run | null>(null);
  const climbToRef = useRef(climbTo);
  runRef.current = run;
  climbToRef.current = climbTo;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    setSoundOn(loadSound());
    setStreak(loadStreak());
    const saved = loadDaily();
    setToday(saved && saved.date === date ? saved : null);
    setArchive(loadHistory());
    setReady(true);
    return () => mq.removeEventListener("change", apply);
  }, [date]);

  useEffect(() => {
    if (phase === "climb" || phase === "results") setShown(run?.altitude ?? 0);
    else if (phase === "land") setShown(0);
  }, [phase, run?.altitude]);

  useEffect(() => {
    const tick = () => setLeft(formatCountdown(msUntilNextSet()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (phase !== "climb") return;
    setBoost(true);
    setCountNum(3);
    if (reduced) {
      setBoost(false);
      setPhase(climbToRef.current === "results" ? "results" : "problem");
      return;
    }
    playTone("lift", soundOn);
    const a = window.setTimeout(() => setCountNum(2), 700);
    const b = window.setTimeout(() => setCountNum(1), 1400);
    const c = window.setTimeout(() => {
      setBoost(false);
      setPhase(climbToRef.current === "results" ? "results" : "problem");
    }, 2100);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
      window.clearTimeout(c);
    };
  }, [phase, reduced, soundOn]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    saveSound(next);
    playTone("ok", next);
  }

  function begin(next: Run, withCountdown: boolean) {
    setRun(next);
    setFeedback(null);
    setCopied(false);
    if (!withCountdown) setShown(next.altitude);
    if (withCountdown && !reduced) {
      setClimbTo("problem");
      setPhase("climb");
    } else {
      setPhase("problem");
    }
  }

  function launchDaily() {
    if (today?.finished) {
      review(today);
      return;
    }
    if (today && !today.finished && today.answers.length > 0) {
      begin(
        {
          mode: "daily",
          problems: problemsForDate(),
          index: today.answers.length,
          answers: today.answers,
          altitude: today.altitude,
        },
        false,
      );
      return;
    }
    begin(
      { mode: "daily", problems: problemsForDate(), index: 0, answers: [], altitude: 0 },
      true,
    );
  }

  function review(flight: FlightRecord) {
    const problems =
      flight.mode === "practice" && flight.unit
        ? problemsForUnit(flight.unit)
        : problemsForDate();
    setRun({
      mode: flight.mode,
      problems,
      index: flight.answers.length,
      answers: flight.answers,
      altitude: flight.altitude,
      unit: flight.unit,
    });
    setPhase("results");
  }

  function onSubmit(raw: string, seconds: number) {
    const current = runRef.current;
    if (!current) return;
    const problem = current.problems[current.index];
    if (!problem) return;
    const correct = answersMatch(problem, raw);
    const gained = altitudeFor(problem, correct, seconds);
    const answer: AnswerRecord = {
      problemId: problem.id,
      correct,
      seconds,
      altitude: gained,
      raw,
    };
    const next: Run = {
      ...current,
      answers: [...current.answers, answer],
      altitude: current.altitude + gained,
    };
    setRun(next);
    setFeedback({
      correct,
      raw,
      problem,
      percent: Math.round(problem.solveRate * 100),
    });
    setPhase("feedback");
    setLastGain(gained);
    recordAttempt(problem.id, correct);
    playTone(correct ? "ok" : "no", soundOn);
    if (next.mode === "daily") saveDaily(toFlight(next, date, setNumber, false));
  }

  function afterFeedback() {
    const current = runRef.current;
    if (!current) return;
    const done = current.answers.length >= current.problems.length;
    if (done) {
      if (current.mode === "daily") {
        const flight = toFlight(current, date, setNumber, true);
        const nextStreak = finishDaily(flight);
        setStreak(nextStreak);
        setToday(flight);
        setArchive(loadHistory());
      }
      setClimbTo("results");
      setPhase(reduced ? "results" : "climb");
      return;
    }
    setRun({ ...current, index: current.index + 1 });
    setClimbTo("problem");
    setPhase(reduced ? "problem" : "climb");
  }

  const finishedToday = Boolean(today?.finished);

  return (
    <SkyScene altitude={shown} boost={boost} reduced={reduced}>
      <button
        type="button"
        className={`sound-btn${soundOn ? " on" : ""}`}
        aria-pressed={soundOn}
        onClick={toggleSound}
      >
        {soundOn ? "Sound on" : "Sound off"}
      </button>

      {phase === "land" ? (
        <main className="land">
          <header className="hero">
            <h1 className="logo">
              <span className="logo-ghost" aria-hidden>
                ACE SETS
              </span>
              <span className="logo-main">ACE SETS</span>
            </h1>
            <p className="subtitle">The Daily Set</p>
            <p className="tagline">6 problems · 60 seconds each · harder answers fly higher</p>
            {streak.count > 0 ? <p className="streak">Streak {streak.count}</p> : null}
          </header>
          <div className="land-actions">
            <button type="button" className="btn-launch" onClick={launchDaily} disabled={!ready}>
              {!ready
                ? "Launch"
                : finishedToday
                  ? "View flight"
                  : today && today.answers.length > 0
                    ? "Resume"
                    : "Launch"}
            </button>
            <p className="set-line">
              Set #{setNumber}
              {finishedToday ? " · scored flight complete" : ""}
            </p>
            <div className="mini-row">
              <button type="button" className="btn-mini" onClick={() => setPhase("archive")}>
                Archive
              </button>
              <button type="button" className="btn-mini" onClick={() => setPhase("units")}>
                Practice by unit
              </button>
              <button
                type="button"
                className="btn-mini"
                onClick={() =>
                  begin(
                    {
                      mode: "unlimited",
                      problems: unlimitedProblems(),
                      index: 0,
                      answers: [],
                      altitude: 0,
                    },
                    true,
                  )
                }
              >
                Unlimited
              </button>
            </div>
            <details className="how">
              <summary>How to play</summary>
              <p>
                Everyone gets the same six calculus problems until the next UTC midnight. Each
                correct answer lifts the rocket from the pad through the atmosphere and into space. Easy problems are worth 10 km, medium 30, hard 60,
                and rare 100, plus a time bonus of at most 20%. Wrong answers score 0. You get one
                scored flight a day. Archive and unlimited flights are not scored. A streak allows
                one missed day each week.
              </p>
              <p>Choose an answer or type it, then press Enter or Fire.</p>
            </details>
            <p className="privacy-line">
              <Link href="/privacy">Privacy</Link>
            </p>
          </div>
        </main>
      ) : null}

      {phase === "problem" && run ? (
        <ProblemPane
          problem={run.problems[run.index]!}
          index={run.index}
          total={run.problems.length}
          altitude={run.altitude}
          answers={run.answers}
          scored={run.mode === "daily"}
          onSubmit={onSubmit}
        />
      ) : null}

      {phase === "feedback" && feedback ? (
        <main className="overlay">
          <article className="pixel-frame card">
            <div className="pixel-inner">
              <h2 className={feedback.correct ? "good" : "bad"}>
                {feedback.correct ? "Correct" : "Missed"}
              </h2>
              <p className="feedback-line">
                <span>Your answer</span>
                {feedback.raw ? (
                  feedback.problem.type === "mc" ? (
                    <MathView
                      latex={
                        feedback.problem.choices?.find((c) => c.id === feedback.raw)?.latex ??
                        feedback.raw
                      }
                    />
                  ) : (
                    <MathView latex={feedback.raw} />
                  )
                ) : (
                  <em>blank</em>
                )}
              </p>
              <p className="feedback-line">
                <span>Correct answer</span>
                <MathView latex={correctLatex(feedback.problem)} />
              </p>
              <p className="explain">{feedback.problem.explanation}</p>
              <p className="percent">{feedback.percent}% of players got this right</p>
              {feedback.correct ? null : (
                <p className="hint">
                  <strong>Hint. </strong>
                  {feedback.problem.hint}
                </p>
              )}
              <button type="button" className="btn-launch" onClick={afterFeedback}>
                {run && run.answers.length >= run.problems.length ? "See flight" : "Next"}
              </button>
            </div>
          </article>
        </main>
      ) : null}

      {phase === "climb" ? (
        <div className="climb" aria-live="assertive">
          <p className="count-num">{countNum}</p>
          <p className="gain">{lastGain > 0 ? `+${lastGain} km` : "Hold"}</p>
        </div>
      ) : null}

      {phase === "results" && run ? (
        <Results
          run={run}
          setNumber={setNumber}
          countdown={left}
          copied={copied}
          onCopy={async () => {
            const text = shareText({
              setNumber,
              tier: tierFor(
                run.altitude,
                run.answers.length === run.problems.length && run.answers.every((a) => a.correct),
              ).name,
              altitude: run.altitude,
              answers: run.answers,
            });
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
          onCard={() => {
            const all =
              run.answers.length === run.problems.length && run.answers.every((a) => a.correct);
            void downloadStoryCard({
              setNumber,
              tier: tierFor(run.altitude, all).name,
              altitude: run.altitude,
              squares: run.answers.map(squareFor),
            });
          }}
          onPractice={(unit) => {
            const problems = problemsForUnit(unit);
            if (!problems.length) return;
            begin(
              { mode: "practice", problems, index: 0, answers: [], altitude: 0, unit },
              true,
            );
          }}
          onPad={() => setPhase("land")}
          onKeep={() =>
            begin(
              {
                mode: "unlimited",
                problems: unlimitedProblems(),
                index: 0,
                answers: [],
                altitude: 0,
              },
              true,
            )
          }
        />
      ) : null}

      {phase === "archive" ? (
        <main className="overlay">
          <article className="pixel-frame card">
            <div className="pixel-inner">
              <h2>Archive</h2>
              <p className="explain">Past scored flights on this device. Unscored.</p>
              {archive.length === 0 ? <p className="explain">No flights yet.</p> : null}
              <ul className="archive-list">
                {archive.map((flight) => (
                  <li key={`${flight.date}-${flight.setNumber}`}>
                    <button type="button" className="btn-mini wide" onClick={() => review(flight)}>
                      Set #{flight.setNumber} · {flight.altitude} km
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn-launch" onClick={() => setPhase("land")}>
                Back
              </button>
            </div>
          </article>
        </main>
      ) : null}

      {phase === "units" ? (
        <main className="overlay">
          <article className="pixel-frame card">
            <div className="pixel-inner">
              <h2>Practice by unit</h2>
              <p className="explain">
                Unscored practice for every Calc AB unit, including integrals. Come back tomorrow
                for a new scored set.
              </p>
              <div className="unit-list">
                {UNITS.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    className="btn-mini wide"
                    onClick={() =>
                      begin(
                        {
                          mode: "practice",
                          problems: problemsForUnit(unit),
                          index: 0,
                          answers: [],
                          altitude: 0,
                          unit,
                        },
                        true,
                      )
                    }
                  >
                    {unit} · {problemsForUnit(unit).length}
                  </button>
                ))}
              </div>
              <button type="button" className="btn-launch" onClick={() => setPhase("land")}>
                Back
              </button>
            </div>
          </article>
        </main>
      ) : null}
    </SkyScene>
  );
}

function Results({
  run,
  setNumber,
  countdown,
  copied,
  onCopy,
  onCard,
  onPractice,
  onPad,
  onKeep,
}: {
  run: Run;
  setNumber: number;
  countdown: string;
  copied: boolean;
  onCopy: () => void;
  onCard: () => void;
  onPractice: (unit: string) => void;
  onPad: () => void;
  onKeep: () => void;
}) {
  const allCorrect =
    run.answers.length === run.problems.length && run.answers.every((a) => a.correct);
  const tier = tierFor(run.altitude, run.problems.length >= 6 && allCorrect);
  const weak = weakestUnit(run.answers);
  const text = shareText({
    setNumber,
    tier: tier.name,
    altitude: run.altitude,
    answers: run.answers,
  });
  const scored = run.mode === "daily";

  return (
    <main className="overlay results">
      <article className="pixel-frame card">
        <div className="pixel-inner">
          <p className="kicker">{scored ? `Set #${setNumber}` : "Unscored flight"}</p>
          <h2>{tier.name}</h2>
          <p className="altitude-big">{run.altitude} km</p>
          <p className="explain">{tier.blurb}</p>
          <ol className="squares big" aria-label="Results">
            {run.answers.map((a) => (
              <li key={a.problemId} className={`sq ${squareFor(a)}`} />
            ))}
          </ol>
          {weak ? (
            <button type="button" className="btn-mini wide" onClick={() => onPractice(weak)}>
              Practice this unit · {weak}
            </button>
          ) : (
            <p className="explain">No weak unit on this flight.</p>
          )}
          {scored ? (
            <>
              <pre className="share-pre">{text}</pre>
              <div className="mini-row">
                <button type="button" className="btn-mini" onClick={onCopy}>
                  {copied ? "Copied" : "Copy grid"}
                </button>
                <button type="button" className="btn-mini" onClick={onCard}>
                  Story card
                </button>
              </div>
              <p className="explain">Next set in {countdown}</p>
            </>
          ) : (
            <p className="explain">This flight does not count toward today’s set or your streak.</p>
          )}
          <button type="button" className="btn-launch" onClick={onKeep}>
            Keep flying
          </button>
          <button type="button" className="btn-mini wide" onClick={onPad}>
            Back to pad
          </button>
        </div>
      </article>
    </main>
  );
}
