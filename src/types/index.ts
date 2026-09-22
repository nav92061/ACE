/** Shared types for ACE */

export type SkillId =
  | "derivatives-in-context"
  | "related-rates"
  | "linear-approximation"
  | "mean-value-theorem"
  | "critical-points"
  | "increasing-decreasing"
  | "first-derivative-test"
  | "candidates-test"
  | "second-derivative-test"
  | "graph-extrema"
  | "connect-derivatives"
  | "optimization";

export type AnswerType =
  | "expression"
  | "number"
  | "multiple-choice"
  | "interval"
  | "choice-text";

export type Difficulty = 1 | 2 | 3;

/** One visual row piece: pure KaTeX math OR plain English (never mixed). */
export interface PromptPart {
  kind: "math" | "text";
  value: string;
}

export type PromptLine = PromptPart[];

export interface MultipleChoiceOption {
  id: string;
  latex: string;
  /** Plain label for choice-text UI when latex is only \text{...} */
  label?: string;
  value: string;
}

export interface Problem {
  id: string;
  skillId: SkillId;
  /** Legacy single-string prompt — converted to promptLines if missing. */
  promptLatex: string;
  /** Preferred: structured prompt rows (math vs text). */
  promptLines?: PromptLine[];
  graphSvg?: string;
  answerType: AnswerType;
  correctAnswerLatex: string;
  correctAnswerMath: string;
  choices?: MultipleChoiceOption[];
  solutionLatex: string;
  solutionLines?: PromptLine[];
  difficulty: Difficulty;
  isAntiderivative?: boolean;
  hint?: string;
}

export interface GradedAnswer {
  problemId: string;
  correct: boolean;
  studentAnswer: string;
  correctAnswerLatex: string;
  solutionLatex: string;
  solutionLines?: PromptLine[];
  missingPlusC?: boolean;
  feedback?: string;
}

export interface SkillMeta {
  id: SkillId;
  name: string;
  unitDay: string;
  description: string;
  targetSeconds: number;
  defaultTimedSeconds: 60 | 90;
}

export const WRONG_ANSWER_PENALTY = 0.5;
