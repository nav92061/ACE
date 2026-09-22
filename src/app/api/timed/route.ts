import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, requireUser } from "@/lib/firebase/admin";
import { classIdForSubject, getSubject } from "@/lib/subjects";
import { ensureSubjectClass, recomputeStanding } from "@/lib/server/class";
import { generatePracticeSet } from "@/lib/problems";
import {
  antiderivativesMatch,
  explainWrong,
  expressionsMatch,
  numbersMatch,
} from "@/lib/problems/checker";
import { latexToLines } from "@/lib/problems/prompt";
import type { PromptLine, SkillId } from "@/types";
import { WRONG_ANSWER_PENALTY } from "@/types";

/**
 * Firestore rejects nested arrays. PromptLine is PromptPart[], so PromptLine[]
 * cannot be stored directly — keep lines in the HTTP response only.
 */
function linesForClient(
  lines: PromptLine[] | undefined,
  latex: string,
): PromptLine[] {
  return lines?.length ? lines : latexToLines(latex);
}

/** Start a timed set — problems without answer keys. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = (await req.json()) as {
      subject?: string;
      skillId?: SkillId;
      durationSeconds?: number;
    };
    const subject = getSubject(body.subject ?? "calc");
    if (!subject) {
      return NextResponse.json({ error: "Unknown subject" }, { status: 400 });
    }
    const skillId = body.skillId;
    if (!skillId) {
      return NextResponse.json({ error: "skillId required" }, { status: 400 });
    }
    const durationSeconds = body.durationSeconds === 90 ? 90 : 60;
    const classId = classIdForSubject(subject.id);
    const db = adminDb();

    const weekId = await ensureSubjectClass(db, classId, subject.className);
    const studentRef = db
      .collection("classes")
      .doc(classId)
      .collection("students")
      .doc(user.uid);
    if (!(await studentRef.get()).exists) {
      return NextResponse.json(
        { error: "Sign in first so we can put you in this class." },
        { status: 403 },
      );
    }

    const generated = generatePracticeSet(skillId, 50, { rampDifficulty: true });
    const answerKey: Record<string, unknown> = {};
    const clientProblems = generated.map((p) => {
      const choiceValues = p.choices?.map((c) => ({
        id: c.id,
        value: c.value,
      }));
      const choiceLatex = p.choices?.map((c) => ({
        id: c.id,
        latex: c.latex,
      }));
      // No nested arrays in Firestore answerKey.
      answerKey[p.id] = {
        correctAnswerMath: p.correctAnswerMath,
        correctAnswerLatex: p.correctAnswerLatex,
        solutionLatex: p.solutionLatex,
        isAntiderivative: p.isAntiderivative ?? false,
        answerType: p.answerType,
        ...(choiceValues
          ? {
              choices: choiceValues.map((c, i) => ({
                ...c,
                latex: choiceLatex?.[i]?.latex ?? c.value,
              })),
            }
          : {}),
      };
      // correctAnswerMath / choice values are for client flash animation only.
      // Final score always comes from server PUT grading. Solutions stay server-side.
      return {
        id: p.id,
        skillId: p.skillId,
        promptLatex: p.promptLatex,
        promptLines: linesForClient(p.promptLines, p.promptLatex),
        answerType: p.answerType,
        difficulty: p.difficulty,
        correctAnswerMath: p.correctAnswerMath,
        ...(p.isAntiderivative ? { isAntiderivative: true } : {}),
        ...(p.graphSvg ? { graphSvg: p.graphSvg } : {}),
        ...(choiceLatex
          ? {
              choices: choiceLatex.map((c, i) => ({
                ...c,
                value: choiceValues?.[i]?.value ?? c.id,
              })),
            }
          : {}),
      };
    });

    // Persist without promptLines (nested arrays illegal in Firestore).
    const storedProblems = clientProblems.map(
      ({ promptLines: _lines, ...rest }) => rest,
    );

    const attemptRef = db
      .collection("classes")
      .doc(classId)
      .collection("attempts")
      .doc();
    await attemptRef.set({
      classId,
      studentId: user.uid,
      uid: user.uid,
      skillId,
      weekId,
      durationSeconds,
      startedAt: Date.now(),
      answerKey,
      problems: storedProblems,
    });

    return NextResponse.json({
      attemptId: attemptRef.id,
      durationSeconds,
      problems: clientProblems,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Start failed";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Not signed in" ? 401 : 500 },
    );
  }
}

/** Grade submission — always counts (timer is UX only; late submits still score). */
export async function PUT(req: Request) {
  try {
    const user = await requireUser(req);
    const body = (await req.json()) as {
      subject?: string;
      attemptId?: string;
      answers?: { problemId: string; answer: string }[];
    };
    const subject = getSubject(body.subject ?? "calc");
    if (!subject || !body.attemptId) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const classId = classIdForSubject(subject.id);
    const db = adminDb();
    const attemptRef = db
      .collection("classes")
      .doc(classId)
      .collection("attempts")
      .doc(body.attemptId);
    const attemptSnap = await attemptRef.get();
    if (!attemptSnap.exists) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    const attempt = attemptSnap.data()!;
    if (attempt.uid !== user.uid) {
      return NextResponse.json({ error: "Not your attempt" }, { status: 403 });
    }
    if (attempt.submittedAt) {
      return NextResponse.json({ error: "Already submitted" }, { status: 400 });
    }

    const key = attempt.answerKey as Record<
      string,
      {
        correctAnswerMath: string;
        correctAnswerLatex: string;
        solutionLatex: string;
        isAntiderivative?: boolean;
        answerType: string;
        choices?: { id: string; value: string; latex?: string }[];
      }
    >;

    // If answerKey was already cleared somehow, still accept with 0 score rather than fail
    const answers = body.answers ?? [];
    let correctCount = 0;
    let wrongCount = 0;
    const graded = answers.map((a) => {
      const k = key?.[a.problemId];
      if (!k) {
        wrongCount += 1;
        return {
          problemId: a.problemId,
          correct: false,
          studentAnswer: a.answer,
          correctAnswerLatex: "?",
          solutionLatex: "",
          solutionLines: [] as PromptLine[],
          feedback: "Answer key missing for this problem.",
        };
      }
      let correct = false;
      if (k.answerType === "multiple-choice" || k.answerType === "choice-text") {
        const chosen = k.choices?.find((c) => c.id === a.answer);
        correct =
          chosen?.value === k.correctAnswerMath ||
          a.answer === k.correctAnswerMath;
      } else if (k.answerType === "number") {
        correct = numbersMatch(a.answer, k.correctAnswerMath);
      } else if (k.isAntiderivative) {
        correct = antiderivativesMatch(a.answer, k.correctAnswerMath);
      } else {
        correct = expressionsMatch(a.answer, k.correctAnswerMath);
      }
      if (correct) correctCount += 1;
      else wrongCount += 1;
      return {
        problemId: a.problemId,
        correct,
        studentAnswer: a.answer,
        correctAnswerLatex: k.correctAnswerLatex,
        solutionLatex: k.solutionLatex,
        // Built for HTTP response only — not written as nested arrays to Firestore.
        solutionLines: latexToLines(k.solutionLatex),
        ...(correct
          ? {}
          : {
              feedback: explainWrong({
                studentAnswer: a.answer,
                correctAnswerMath: k.correctAnswerMath,
                correctAnswerLatex: k.correctAnswerLatex,
                solutionLatex: k.solutionLatex,
                answerType: k.answerType,
                isAntiderivative: k.isAntiderivative,
                choices: k.choices,
              }),
            }),
      };
    });

    const score = Math.max(
      0,
      correctCount - WRONG_ANSWER_PENALTY * wrongCount,
    );
    const questionsAnswered = answers.length;

    const studentSnap = await db
      .collection("classes")
      .doc(classId)
      .collection("students")
      .doc(user.uid)
      .get();
    const nickname = studentSnap.data()?.nickname ?? "Student";

    await attemptRef.update({
      submittedAt: Date.now(),
      correctCount,
      wrongCount,
      score,
      questionsAnswered,
      counted: true,
      answerKey: FieldValue.delete(),
      // Strip nested solutionLines before Firestore write.
      gradedMissed: graded
        .filter((g) => !g.correct)
        .map(({ solutionLines: _sl, ...rest }) => rest),
    });

    await db
      .collection("classes")
      .doc(classId)
      .collection("students")
      .doc(user.uid)
      .set(
        {
          questionsAnswered: FieldValue.increment(questionsAnswered),
          questionsCorrect: FieldValue.increment(correctCount),
          questionsWrong: FieldValue.increment(wrongCount),
          lastPlayedAt: Date.now(),
        },
        { merge: true },
      );
    await db.collection("classes").doc(classId).set(
      { questionsAnsweredTotal: FieldValue.increment(questionsAnswered) },
      { merge: true },
    );
    await db.collection("users").doc(user.uid).set(
      { questionsAnswered: FieldValue.increment(questionsAnswered) },
      { merge: true },
    );

    const bestId = `${user.uid}_${attempt.skillId}`;
    const bestRef = db
      .collection("classes")
      .doc(classId)
      .collection("weeks")
      .doc(attempt.weekId)
      .collection("bestScores")
      .doc(bestId);
    const bestExisting = await bestRef.get();
    if (!bestExisting.exists || Number(bestExisting.data()?.score) < score) {
      await bestRef.set({
        classId,
        studentId: user.uid,
        skillId: attempt.skillId,
        weekId: attempt.weekId,
        score,
        achievedAt: Date.now(),
        attemptId: body.attemptId,
      });
    }

    await recomputeStanding(db, classId, attempt.weekId, user.uid, nickname);

    return NextResponse.json({
      correctCount,
      wrongCount,
      score,
      questionsAnswered,
      graded: graded.filter((g) => !g.correct),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Submit failed";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Not signed in" ? 401 : 500 },
    );
  }
}
