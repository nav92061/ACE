/** Firestore document shapes used across the app. Keep flat and readable. */

import type { SkillId } from "@/types";

export interface ClassDoc {
  name: string;
  subjectId: string;
  activeSkills: SkillId[];
  createdAt: number;
}

export interface WeekDoc {
  classId: string;
  startAt: number;
  endAt: number;
  skills: SkillId[];
  locked: boolean;
  label: string;
}

export interface StudentDoc {
  classId: string;
  nickname: string;
  uid: string;
  joinedAt: number;
  questionsAnswered?: number;
  questionsCorrect?: number;
  questionsWrong?: number;
  lastPlayedAt?: number;
}

export interface TimedAttemptDoc {
  classId: string;
  studentId: string;
  uid: string;
  skillId: SkillId;
  weekId: string;
  durationSeconds: number;
  startedAt: number;
  /** Server-only: map problemId → correct answer payload. */
  answerKey?: Record<
    string,
    {
      correctAnswerMath: string;
      correctAnswerLatex: string;
      solutionLatex: string;
      isAntiderivative?: boolean;
      answerType: string;
      choices?: { id: string; value: string }[];
    }
  >;
  problems: {
    id: string;
    promptLatex: string;
    answerType: string;
    choices?: { id: string; latex: string }[];
  }[];
  submittedAt?: number;
  correctCount?: number;
  wrongCount?: number;
  score?: number;
  questionsAnswered?: number;
  counted?: boolean;
}

export interface BestScoreDoc {
  classId: string;
  studentId: string;
  skillId: SkillId;
  weekId: string;
  score: number;
  achievedAt: number;
  attemptId: string;
}

export interface WeeklyStandingDoc {
  classId: string;
  weekId: string;
  studentId: string;
  nickname: string;
  totalScore: number;
  /** Earliest time the current total was achieved (tie-break). */
  achievedAt: number;
}
