"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { GradedAnswer, Problem, SkillId } from "@/types";
import { WRONG_ANSWER_PENALTY } from "@/types";
import { checkAnswer, generatePracticeSet, scoreTimed } from "@/lib/problems";
import { getSkill } from "@/lib/problems/skills";
import { MathDisplay } from "./MathDisplay";
import { MathInput } from "./MathInput";
import { Timer } from "./Timer";

type Phase = "ready" | "active" | "review";
type FlashKind = "right" | "wrong" | "hit" | null;

interface PracticeSetProps {
  skillId: SkillId;
  startTimedServer?: (durationSeconds: 60 | 90) => Promise<{
    attemptId: string;
    problems: Problem[];
    durationSeconds: number;
  }>;
  submitTimedServer?: (
    attemptId: string,
    answers: { problemId: string; answer: string }[],
  ) => Promise<{
    correctCount: number;
    wrongCount: number;
    score: number;
    graded: GradedAnswer[];
    questionsAnswered?: number;
  }>;
}

function vibrate(pattern: number | number[], reduced: boolean) {
  if (reduced) return;
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

function BurstParticles({ kind }: { kind: "right" | "wrong" | "hit" }) {
  const bits = useMemo(() => {
    const n = kind === "hit" ? 5 : 10;
    return Array.from({ length: n }, (_, i) => {
      const angle = (Math.PI * 2 * i) / n + (i % 2) * 0.3;
      const dist = 48 + (i % 3) * 22;
      return {
        id: i,
        dx: `${Math.cos(angle) * dist}px`,
        dy: `${Math.sin(angle) * dist - 20}px`,
        delay: `${i * 18}ms`,
      };
    });
  }, [kind]);

  return (
    <>
      {bits.map((b) => (
        <span
          key={b.id}
          className={kind === "wrong" ? "dust" : kind === "right" ? "coin" : "sparkle"}
          style={
            {
              left: "50%",
              top: "45%",
              "--dx": b.dx,
              "--dy": b.dy,
              animationDelay: b.delay,
            } as CSSProperties
          }
        >
          {kind === "right" ? "$" : null}
        </span>
      ))}
    </>
  );
}

/** Timed-only practice — no mastery unlock. */
export function PracticeSet({
  skillId,
  startTimedServer,
  submitTimedServer,
}: PracticeSetProps) {
  const skill = getSkill(skillId);
  const [phase, setPhase] = useState<Phase>("ready");
  const [duration, setDuration] = useState<60 | 90>(skill.defaultTimedSeconds);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [flash, setFlash] = useState<FlashKind>(null);
  const [graded, setGraded] = useState<GradedAnswer[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<
    { problemId: string; answer: string }[]
  >([]);
  const pendingRef = useRef(pendingAnswers);
  pendingRef.current = pendingAnswers;
  const [timedRunning, setTimedRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fanfare, setFanfare] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const serverMode = Boolean(startTimedServer && submitTimedServer);
  const inputRef = useRef<{ getValue: () => string } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const current = problems[index];

  const startTimed = async () => {
    setError(null);
    setFanfare(false);
    try {
      if (startTimedServer) {
        const res = await startTimedServer(duration);
        setAttemptId(res.attemptId);
        setProblems(res.problems);
        setDuration(res.durationSeconds as 60 | 90);
      } else {
        setAttemptId(null);
        setProblems(generatePracticeSet(skillId, 40, { rampDifficulty: true }));
      }
      setIndex(0);
      setAnswer("");
      setGraded([]);
      setCorrectCount(0);
      setWrongCount(0);
      setPendingAnswers([]);
      pendingRef.current = [];
      setFlash(null);
      setPhase("active");
      setTimedRunning(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start timed set.");
    }
  };

  const finishTimed = useCallback(
    async (answersOverride?: { problemId: string; answer: string }[]) => {
      setTimedRunning(false);
      const answers = answersOverride ?? pendingRef.current;

      if (submitTimedServer && attemptId) {
        try {
          const res = await submitTimedServer(attemptId, answers);
          setCorrectCount(res.correctCount);
          setWrongCount(res.wrongCount);
          setGraded(res.graded);
          setFanfare(true);
          setPhase("review");
          vibrate([30, 40, 30, 40, 60], reducedMotion);
          return;
        } catch (e) {
          setError(e instanceof Error ? e.message : "Grading failed.");
          setPhase("review");
          return;
        }
      }

      const localGraded = answers.map((a) => {
        const p = problems.find((x) => x.id === a.problemId)!;
        return checkAnswer(p, a.answer, { timed: true });
      });
      const correct = localGraded.filter((g) => g.correct).length;
      setCorrectCount(correct);
      setWrongCount(localGraded.length - correct);
      setGraded(localGraded);
      setFanfare(true);
      setPhase("review");
      vibrate([30, 40, 30, 40, 60], reducedMotion);
    },
    [attemptId, problems, reducedMotion, submitTimedServer],
  );

  const onExpire = useCallback(() => {
    void finishTimed();
  }, [finishTimed]);

  const readAnswer = () => {
    if (
      current &&
      (current.answerType === "multiple-choice" ||
        current.answerType === "choice-text")
    ) {
      return answer;
    }
    const live = inputRef.current?.getValue?.() ?? answer;
    return live.trim();
  };

  /** Animation-only preview — never changes server score. */
  const previewFlash = (problem: Problem, studentAnswer: string): FlashKind => {
    if (problem.correctAnswerMath) {
      const preview = checkAnswer(problem, studentAnswer, { timed: true });
      return preview.correct ? "right" : "wrong";
    }
    return "hit";
  };

  const submitCurrent = () => {
    if (!current || submitting) return;
    const studentAnswer = readAnswer();

    if (
      (current.answerType === "multiple-choice" ||
        current.answerType === "choice-text") &&
      !studentAnswer
    ) {
      return;
    }

    setSubmitting(true);
    const nextPending = [
      ...pendingRef.current,
      { problemId: current.id, answer: studentAnswer },
    ];
    pendingRef.current = nextPending;
    setPendingAnswers(nextPending);

    const kind = previewFlash(current, studentAnswer);
    setFlash(kind);

    // Local mode: live counters for HUD. Server mode: score comes from API only.
    if (!serverMode && current.correctAnswerMath) {
      if (kind === "right") setCorrectCount((c) => c + 1);
      else setWrongCount((w) => w + 1);
    }

    if (kind === "right") vibrate(25, reducedMotion);
    else if (kind === "wrong") vibrate([40, 30, 40], reducedMotion);
    else vibrate(15, reducedMotion);

    const delay = reducedMotion ? 120 : kind === "hit" ? 320 : 600;

    window.setTimeout(() => {
      setFlash(null);
      setAnswer("");
      setSubmitting(false);
      if (index + 1 >= problems.length) {
        void finishTimed(nextPending);
      } else {
        setIndex((i) => i + 1);
      }
    }, delay);
  };

  const score = useMemo(
    () => scoreTimed(correctCount, wrongCount, WRONG_ANSWER_PENALTY),
    [correctCount, wrongCount],
  );

  if (phase === "ready") {
    return (
      <div className="panel practice-ready">
        <p className="tag">{skill.unitDay}</p>
        <h1 className="skill-title">{skill.name}</h1>
        <p className="muted">{skill.description}</p>
        <div className="duration-row">
          <span>Timer:</span>
          <button
            type="button"
            className={`chip ${duration === 60 ? "chip-on" : ""}`}
            onClick={() => setDuration(60)}
          >
            60s
          </button>
          <button
            type="button"
            className={`chip ${duration === 90 ? "chip-on" : ""}`}
            onClick={() => setDuration(90)}
          >
            90s
          </button>
        </div>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          Score = correct − {WRONG_ANSWER_PENALTY} × wrong. Don&apos;t guess
          bud.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void startTimed()}
        >
          Start timed set
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (phase === "review") {
    const missed = graded.filter((g) => !g.correct);
    return (
      <div className={`panel practice-review ${fanfare ? "fanfare" : ""}`}>
        <div className="fx-layer" aria-hidden>
          {fanfare && !reducedMotion && (
            <>
              <BurstParticles kind="right" />
              <span className="face-pop face-happy" style={{ fontSize: "3.2rem" }}>
                ☺
              </span>
            </>
          )}
        </div>
        <h1 className="skill-title">Set complete</h1>
        <div className="score-block fanfare-burst">
          <div className="score-big">{score}</div>
          <p className="pixel-lead">
            {correctCount} right · {wrongCount} wrong
          </p>
        </div>
        {missed.length === 0 ? (
          <p className="pixel-lead">Perfect set.</p>
        ) : (
          <div className="missed-list">
            <h2>Missed problems</h2>
            {missed.map((g) => {
              const p = problems.find((x) => x.id === g.problemId);
              return (
                <div key={g.problemId} className="missed-card">
                  {p?.graphSvg && (
                    <div
                      className="graph-wrap"
                      dangerouslySetInnerHTML={{ __html: p.graphSvg }}
                    />
                  )}
                  <div className="missed-prompt">
                    {p && (
                      <MathDisplay
                        lines={p.promptLines}
                        latex={p.promptLatex}
                      />
                    )}
                  </div>
                  <p className="missed-meta">
                    <span className="missed-label">Your answer</span>
                    <code>{g.studentAnswer || "(blank)"}</code>
                  </p>
                  <div className="missed-box missed-why">
                    <span className="missed-label">Why it&apos;s wrong</span>
                    <p className="missed-why-text">
                      {g.feedback ||
                        `Not correct. The right answer is shown below — compare your work to the solution.`}
                    </p>
                  </div>
                  <div className="missed-box">
                    <span className="missed-label">Correct</span>
                    <MathDisplay latex={g.correctAnswerLatex} />
                  </div>
                  <div className="missed-box">
                    <span className="missed-label">Solution</span>
                    <MathDisplay
                      lines={g.solutionLines}
                      latex={g.solutionLatex}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setFanfare(false);
              setPhase("ready");
            }}
          >
            Again
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  const isChoice =
    (current?.answerType === "multiple-choice" ||
      current?.answerType === "choice-text") &&
    Boolean(current?.choices?.length);
  const isNumber = current?.answerType === "number";
  const flashClass =
    flash === "right"
      ? "flash-right"
      : flash === "wrong"
        ? "flash-wrong"
        : flash === "hit"
          ? "flash-hit"
          : "";

  return (
    <div className={`panel practice-active ${flashClass}`}>
      {flash && (
        <div className="fx-layer" aria-hidden>
          {!reducedMotion && <BurstParticles kind={flash} />}
          {flash === "right" && (
            <span className="face-pop face-happy">☺</span>
          )}
          {flash === "wrong" && (
            <span className="face-pop face-sad">☹</span>
          )}
        </div>
      )}

      <div className="practice-top">
        <div className="progress">{pendingAnswers.length} bag</div>
        <Timer seconds={duration} running={timedRunning} onExpire={onExpire} />
        <div className="live-score">
          {serverMode
            ? `${pendingAnswers.length} done`
            : `${correctCount}✓ · ${wrongCount}✗`}
        </div>
      </div>

      {current && (
        <>
          {current.graphSvg && (
            <div
              className="graph-wrap"
              dangerouslySetInnerHTML={{ __html: current.graphSvg }}
            />
          )}
          <div className="prompt">
            <MathDisplay
              lines={current.promptLines}
              latex={current.promptLatex}
            />
          </div>

          {isChoice ? (
            <div className="choices">
              {current.choices!.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`choice ${answer === c.id ? "choice-on" : ""}`}
                  onClick={() => setAnswer(c.id)}
                >
                  <span className="choice-label">{c.id}</span>
                  <MathDisplay latex={c.latex} />
                </button>
              ))}
            </div>
          ) : isNumber ? (
            <input
              className="plain-answer"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={answer}
              placeholder="Type your answer"
              onChange={(e) => {
                let v = e.target.value.replace(/--/g, "+");
                v = v.replace(/\+-/g, "-").replace(/-\+/g, "-");
                setAnswer(v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitCurrent();
                }
              }}
            />
          ) : (
            <MathInput
              ref={inputRef}
              value={answer}
              onChange={setAnswer}
              onSubmit={submitCurrent}
            />
          )}

          <button
            type="button"
            className="btn btn-primary btn-wide"
            onClick={submitCurrent}
            disabled={submitting || (isChoice && !answer)}
          >
            {submitting ? "…" : "Submit & next"}
          </button>
        </>
      )}
    </div>
  );
}
