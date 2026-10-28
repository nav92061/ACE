"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatCountdown, msUntilNextSet, setNumberFor, utcDateKey } from "@/lib/daily";
import { answersMatch, correctLatex } from "@/lib/grade";
import { problemsForDate, problemsForUnit, unlimitedProblems, UNITS } from "@/lib/problems";
import { isPersonalBest, loadLaunches, recordLaunch, type LaunchRecord } from "@/lib/board";
import {
  addToPool,
  assembleLaunch,
  generateFor,
  GenerateError,
  getSet,
  markAnswered,
  markLaunched,
  markShown,
  planLaunch,
  setCounts,
} from "@/lib/notes";
import { altitudeFor, pointsFor, runPoints, shareText, squareFor, tierFor, weakestUnit } from "@/lib/score";
import { downloadStoryCard } from "@/lib/shareCard";
import { playTone } from "@/lib/sound";
import { zoneFor } from "@/lib/zones";
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
import { Board } from "./Board";
import { MathView, RichText } from "./MathView";
import { NotesScreen } from "./NotesScreen";
import { ProblemPane } from "./ProblemPane";
import { SkyScene, type Pulse, type Stage } from "./SkyScene";
import { useCountUp } from "./useCountUp";

// DEV-ONLY: auto-ace toggle for testing flights. Remove before launch.
const DEV = process.env.NODE_ENV === "development";

type Phase =
  | "land"
  | "problem"
  | "feedback"
  | "climb"
  | "results"
  | "archive"
  | "units"
  | "notes"
  | "generating"
  | "board";

interface Run {
  mode: FlightMode;
  problems: Problem[];
  index: number;
  answers: AnswerRecord[];
  altitude: number;
  unit?: string;
  /** Notes set this launch came from. */
  setId?: string;
  /** Missed on an earlier launch; shown with a retry notice. */
  retryIds?: string[];
  label?: string;
}

interface Feedback {
  correct: boolean;
  raw: string;
  problem: Problem;
  percent: number;
  points: { total: number; accuracy: number; speed: number };
  retry: boolean;
}

interface GenState {
  setId: string;
  title: string;
  error: string | null;
  note: string;
}

function runLabel(run: Run, setNumber: number) {
  if (run.mode === "daily") return `Daily #${setNumber}`;
  if (run.mode === "notes") return run.label ?? "Notes";
  if (run.mode === "practice") return run.unit ?? "Practice";
  return "Unlimited";
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
  const [climbKind, setClimbKind] = useState<"launch" | "boost">("launch");
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [crossed, setCrossed] = useState<string | null>(null);
  const [autoAce, setAutoAce] = useState(false); // DEV-ONLY
  const [gen, setGen] = useState<GenState | null>(null);
  const [lastLaunch, setLastLaunch] = useState<{ record: LaunchRecord; best: boolean } | null>(null);
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
    const done = () => setPhase(climbToRef.current === "results" ? "results" : "problem");
    if (reduced) {
      done();
      return;
    }
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    if (climbKind === "launch") {
      setCountNum(3);
      playTone("tick", soundOn);
      at(800, () => {
        setCountNum(2);
        playTone("tick", soundOn);
      });
      at(1600, () => {
        setCountNum(1);
        playTone("tick", soundOn);
      });
      at(2400, () => {
        setCountNum(0);
        playTone("go", soundOn);
      });
      at(3500, done);
    } else {
      setCountNum(0);
      if (lastGain > 0) playTone("lift", soundOn);
      if (crossed) at(700, () => playTone("zone", soundOn));
      at(2300, done);
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
    // Run once per climb.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reduced]);

  // DEV-ONLY: answer every problem correctly and move on by itself.
  useEffect(() => {
    if (!DEV || !autoAce) return;
    if (phase === "problem" && run) {
      const problem = run.problems[run.index];
      if (!problem) return;
      const id = window.setTimeout(() => onSubmit(problem.answer, 4), 1000);
      return () => window.clearTimeout(id);
    }
    if (phase === "feedback") {
      const id = window.setTimeout(() => afterFeedback(), 1600);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAce, phase, run?.index]);

  // A notes question counts as seen the moment it appears.
  useEffect(() => {
    if (phase !== "problem" || !run || run.mode !== "notes" || !run.setId) return;
    const problem = run.problems[run.index];
    if (problem) markShown(run.setId, problem.id);
    if (problem && run.retryIds?.includes(problem.id)) playTone("zone", soundOn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, run?.index, run?.setId]);

  async function launchNotes(setId: string) {
    const set = getSet(setId);
    if (!set) return;
    setGen({ setId, title: set.title, error: null, note: "Reading your notes" });
    setPhase("generating");
    try {
      const plan = planLaunch(set);
      if (plan.missing > 0) {
        setGen((g) => g && { ...g, note: `Writing ${plan.missing} new questions` });
        const fresh = await generateFor(set, Math.min(20, plan.missing + 3));
        addToPool(setId, fresh);
      }
      const ready = getSet(setId);
      if (!ready) return;
      const { problems, retryIds } = assembleLaunch(ready);
      if (problems.length === 0) {
        const c = setCounts(ready);
        setGen((g) =>
          g && {
            ...g,
            error:
              c.mastered > 0
                ? `You've mastered all ${c.mastered} questions these notes can support. Add more notes to keep going.`
                : "Couldn't find anything to ask from these notes. Try adding more detail.",
          },
        );
        return;
      }
      markLaunched(setId);
      begin(
        {
          mode: "notes",
          problems,
          index: 0,
          answers: [],
          altitude: 0,
          setId,
          retryIds,
          label: ready.title,
        },
        true,
      );
    } catch (error) {
      const message =
        error instanceof GenerateError
          ? error.message
          : error instanceof Error && error.name === "QuotaExceededError"
            ? "Your browser storage is full. Delete an old notes set and try again."
            : "Something went wrong while building questions.";
      setGen((g) => g && { ...g, error: message });
    }
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    saveSound(next);
    playTone("tap", next);
  }

  function begin(next: Run, withCountdown: boolean) {
    setRun(next);
    setFeedback(null);
    setCopied(false);
    setLastLaunch(null);
    if (!withCountdown) setShown(next.altitude);
    if (withCountdown && !reduced) {
      setClimbTo("problem");
      setClimbKind("launch");
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
    const points = pointsFor(problem, correct, seconds);
    const retry = Boolean(current.retryIds?.includes(problem.id));
    const answer: AnswerRecord = {
      problemId: problem.id,
      correct,
      seconds,
      altitude: gained,
      raw,
      points: points.total,
      retry,
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
      points,
      retry,
    });
    setPhase("feedback");
    setLastGain(gained);
    setPulse({ kind: correct ? "ok" : "no", id: Date.now() });
    const before = zoneFor(current.altitude);
    const after = zoneFor(next.altitude);
    setCrossed(after.id !== before.id ? after.name : null);
    recordAttempt(problem.id, correct);
    if (current.mode === "notes" && current.setId) markAnswered(current.setId, problem.id, correct);
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
      const record = recordLaunch({
        mode: current.mode,
        label: runLabel(current, setNumber),
        altitude: current.altitude,
        answers: current.answers,
      });
      setLastLaunch({ record, best: isPersonalBest(record, loadLaunches()) });
      setClimbTo("results");
      setClimbKind("boost");
      setPhase(reduced ? "results" : "climb");
      return;
    }
    setRun({ ...current, index: current.index + 1 });
    setClimbTo("problem");
    setClimbKind("boost");
    setPhase(reduced ? "problem" : "climb");
  }

  const finishedToday = Boolean(today?.finished);
  const allCorrect = Boolean(
    run && run.answers.length === run.problems.length && run.answers.every((a) => a.correct),
  );
  let stage: Stage = "cruise";
  if (["land", "archive", "units", "notes", "board"].includes(phase)) stage = "pad";
  else if (phase === "generating") stage = gen?.error ? "pad" : "ignite";
  else if (phase === "climb") stage = climbKind === "launch" && countNum > 0 ? "ignite" : "boost";
  const side = phase === "problem" || phase === "feedback" || phase === "results";
  const inFlight = phase === "problem" || phase === "feedback" || phase === "climb";

  return (
    <SkyScene
      altitude={shown}
      stage={stage}
      side={side}
      reduced={reduced}
      celebrate={phase === "results" && allCorrect}
      pulse={pulse}
    >
      <div className="corner">
        {DEV ? (
          <button
            type="button"
            className={`corner-btn dev${autoAce ? " on" : ""}`}
            aria-pressed={autoAce}
            onClick={() => setAutoAce((v) => !v)}
          >
            ⚡ Auto-ace {autoAce ? "on" : "off"}
          </button>
        ) : null}
        {inFlight && run && run.mode !== "daily" ? (
          <button type="button" className="corner-btn" onClick={() => setPhase("land")}>
            ✕ End flight
          </button>
        ) : null}
        <button
          type="button"
          className={`corner-btn${soundOn ? " on" : ""}`}
          aria-pressed={soundOn}
          onClick={toggleSound}
        >
          ♪ Sound {soundOn ? "on" : "off"}
        </button>
      </div>

      {phase === "land" ? (
        <main className="land">
          <header className="hero">
            <h1 className="logo" aria-label="ACE SETS">
              {"ACE SETS".split("").map((ch, i) => (
                <span
                  key={i}
                  className="logo-ch"
                  data-ch={ch}
                  style={{ animationDelay: `${i * 0.09}s` }}
                  aria-hidden
                >
                  {ch === " " ? "\u00a0" : ch}
                </span>
              ))}
            </h1>
            <p className="subtitle">The Daily Set</p>
            <p className="tagline">10 questions · 60 seconds each · faster answers score more</p>
            {streak.count > 0 ? <p className="streak">🔥 Streak {streak.count}</p> : null}
          </header>
          <div className="land-actions">
            {ready && !finishedToday ? <p className="press">▲ Press launch ▲</p> : null}
            <button type="button" className="btn-launch big" onClick={launchDaily} disabled={!ready}>
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
            <button type="button" className="btn-launch notes-btn" onClick={() => setPhase("notes")}>
              ✎ Launch from my notes
            </button>
            <div className="mini-row four">
              <button type="button" className="btn-mini" onClick={() => setPhase("board")}>
                🏆 Best attempts
              </button>
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
                Every launch is 10 questions with 60 seconds each. Right answers lift the rocket
                through the sky and into space; harder questions fly higher.
              </p>
              <p>
                Points reward accuracy and speed. A right answer earns 100 (easy), 200 (medium),
                300 (hard) or 500 (rare) points, plus up to the same again for answering fast.
                Wrong answers score 0.
              </p>
              <p>
                Launch from your notes to get questions written from your own study material.
                You never see the same question twice, except ones you missed: those come back on
                a later launch as a retry opportunity until you get them right.
              </p>
              <p>
                The daily set is the same 10 calculus problems for everyone until the next UTC
                midnight, with one scored flight a day. A streak allows one missed day each week.
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
          soundOn={soundOn}
          points={runPoints(run.answers)}
          retry={Boolean(run.retryIds?.includes(run.problems[run.index]!.id))}
          onSubmit={onSubmit}
        />
      ) : null}

      {phase === "feedback" && feedback ? (
        <main className="overlay">
          <article className={`pixel-frame card pop${feedback.correct ? " win" : " shake"}`}>
            <div className="pixel-inner">
              {feedback.retry ? (
                <p className={`retry-result${feedback.correct ? " cleared" : ""}`}>
                  {feedback.correct
                    ? "↻ Retry cleared! This one is mastered."
                    : "↻ Still tricky. It comes back on a later launch."}
                </p>
              ) : null}
              <div className="verdict">
                <h2 className={feedback.correct ? "good" : "bad"}>
                  {feedback.correct ? "Correct!" : "Missed"}
                </h2>
                <span className={`gain-chip${feedback.correct ? "" : " zero"}`}>
                  {feedback.correct ? `+${feedback.points.total} pts` : "0 pts"}
                </span>
              </div>
              {feedback.correct ? (
                <p className="points-split">
                  <span>Accuracy +{feedback.points.accuracy}</span>
                  <span>Speed +{feedback.points.speed}</span>
                  <span>Climb +{lastGain} km</span>
                </p>
              ) : (
                <p className="points-split">
                  <span>Engine stall · no climb</span>
                </p>
              )}
              <p className="feedback-line">
                <span>Your answer</span>
                {feedback.raw ? (
                  feedback.problem.type === "mc" ? (
                    feedback.problem.rich ? (
                      <RichText
                        text={feedback.problem.choices?.find((c) => c.id === feedback.raw)?.latex ?? feedback.raw}
                      />
                    ) : (
                      <MathView
                        latex={
                          feedback.problem.choices?.find((c) => c.id === feedback.raw)?.latex ??
                          feedback.raw
                        }
                      />
                    )
                  ) : (
                    <MathView latex={feedback.raw} />
                  )
                ) : (
                  <em>blank</em>
                )}
              </p>
              <p className="feedback-line">
                <span>Correct answer</span>
                {feedback.problem.rich && feedback.problem.type === "mc" ? (
                  <RichText text={correctLatex(feedback.problem)} />
                ) : (
                  <MathView latex={correctLatex(feedback.problem)} />
                )}
              </p>
              <p className="explain">
                {feedback.problem.rich ? <RichText text={feedback.problem.explanation} /> : feedback.problem.explanation}
              </p>
              {feedback.percent >= 0 ? (
                <p className="percent">{feedback.percent}% of players got this right</p>
              ) : null}
              {feedback.correct ? null : (
                <p className="hint">
                  <strong>Hint. </strong>
                  {feedback.problem.rich ? <RichText text={feedback.problem.hint} /> : feedback.problem.hint}
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
          {climbKind === "launch" ? (
            <>
              <p className="climb-label">
                {countNum > 0 ? "Fuelling · ignition in" : "We have liftoff"}
              </p>
              <p key={countNum} className={`count-num${countNum === 0 ? " go" : ""}`}>
                {countNum > 0 ? countNum : "GO!"}
              </p>
            </>
          ) : (
            <>
              <p className="climb-label">{lastGain > 0 ? "Thrusters firing" : "Engine stall · holding"}</p>
              <p className={`count-num gainer${lastGain > 0 ? "" : " stall"}`}>
                {lastGain > 0 ? `+${lastGain}` : "±0"}
                <small>km</small>
              </p>
              {crossed ? (
                <p className="zone-banner">
                  <span>Entering</span>
                  {crossed}
                </p>
              ) : null}
            </>
          )}
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
          onBoard={() => setPhase("board")}
          launch={lastLaunch}
          onKeep={() =>
            run.mode === "notes" && run.setId
              ? void launchNotes(run.setId)
              : begin(
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

      {phase === "notes" ? (
        <NotesScreen onLaunch={(id) => void launchNotes(id)} onBack={() => setPhase("land")} />
      ) : null}

      {phase === "board" ? (
        <Board onBack={() => setPhase(run && lastLaunch ? "results" : "land")} highlight={lastLaunch?.record.id} />
      ) : null}

      {phase === "generating" && gen ? (
        <main className="overlay">
          <article className="pixel-frame card pop">
            <div className="pixel-inner gen-card">
              <p className="kicker">{gen.title}</p>
              {gen.error ? (
                <>
                  <h2 className="bad">Launch scrubbed</h2>
                  <p className="explain">{gen.error}</p>
                  <button type="button" className="btn-launch" onClick={() => void launchNotes(gen.setId)}>
                    Try again
                  </button>
                  <button type="button" className="btn-mini wide" onClick={() => setPhase("notes")}>
                    Back to notes
                  </button>
                </>
              ) : (
                <>
                  <h2>Fuelling up</h2>
                  <p className="gen-note">
                    {gen.note}
                    <span className="dots" aria-hidden />
                  </p>
                  <div className="fuel" aria-hidden>
                    <span />
                  </div>
                  <p className="explain">Questions are written from your notes. This can take up to a minute.</p>
                </>
              )}
            </div>
          </article>
        </main>
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
  onBoard,
  launch,
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
  onBoard: () => void;
  launch: { record: LaunchRecord; best: boolean } | null;
}) {
  const allCorrect =
    run.answers.length === run.problems.length && run.answers.every((a) => a.correct);
  const tier = tierFor(run.altitude, run.problems.length >= 6 && allCorrect);
  const notes = run.mode === "notes";
  const weak = notes ? null : weakestUnit(run.answers);
  const points = runPoints(run.answers);
  const shownPoints = useCountUp(points, 1600, 0);
  const right = run.answers.filter((a) => a.correct).length;
  const avg = run.answers.length
    ? run.answers.reduce((s, a) => s + a.seconds, 0) / run.answers.length
    : 0;
  const retries = run.answers.filter((a) => a.retry);
  const cleared = retries.filter((a) => a.correct).length;
  const missedNew = run.answers.filter((a) => !a.retry && !a.correct).length;
  const text = shareText({
    setNumber,
    tier: tier.name,
    altitude: run.altitude,
    answers: run.answers,
  });
  const scored = run.mode === "daily";
  const climbed = useCountUp(run.altitude, 1400, 0);

  return (
    <main className="overlay results">
      <article className={`pixel-frame card pop${allCorrect ? " win" : ""}`}>
        <div className="pixel-inner">
          <p className="kicker">
            {scored ? `Set #${setNumber}` : notes ? run.label ?? "Notes launch" : "Unscored flight"}
          </p>
          {launch?.best && points > 0 ? <p className="pb-badge">★ New personal best ★</p> : null}
          <h2 className="tier">{tier.name}</h2>
          <p className="points-big">
            {shownPoints.toLocaleString()} <small>pts</small>
          </p>
          <p className="zone-line">
            {climbed} km · {zoneFor(run.altitude).name}
          </p>
          <div className="result-stats">
            <span>
              <strong>
                {right}/{run.answers.length}
              </strong>
              right
            </span>
            <span>
              <strong>{avg.toFixed(1)}s</strong>
              avg time
            </span>
            <span>
              <strong>x{launch?.record.bestCombo ?? 0}</strong>
              best combo
            </span>
          </div>
          <p className="explain">{tier.blurb}</p>
          <ol className="squares big" aria-label="Results">
            {run.answers.map((a, i) => (
              <li
                key={a.problemId}
                className={`sq ${squareFor(a)}`}
                style={{ animationDelay: `${0.3 + i * 0.12}s` }}
              />
            ))}
          </ol>
          {notes ? (
            <div className="retry-summary">
              {retries.length > 0 ? (
                <p>
                  ↻ Retries cleared: <strong>{cleared}/{retries.length}</strong>
                </p>
              ) : null}
              <p>
                {missedNew + retries.length - cleared > 0
                  ? `${missedNew + retries.length - cleared} missed question${missedNew + retries.length - cleared === 1 ? "" : "s"} will come back as retry opportunities.`
                  : "Nothing missed. Next launch is all new questions."}
              </p>
            </div>
          ) : weak ? (
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
          ) : notes ? null : (
            <p className="explain">This flight does not count toward today’s set or your streak.</p>
          )}
          <button type="button" className="btn-launch" onClick={onKeep}>
            {notes ? "Next launch" : "Keep flying"}
          </button>
          <div className="mini-row">
            <button type="button" className="btn-mini" onClick={onBoard}>
              🏆 Best attempts
            </button>
            <button type="button" className="btn-mini" onClick={onPad}>
              Back to pad
            </button>
          </div>
        </div>
      </article>
    </main>
  );
}
