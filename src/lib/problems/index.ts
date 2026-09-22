import type { Difficulty, Problem, SkillId } from "@/types";
import { finalizeProblem } from "./prompt";
import {
  generateDerivativesInContext,
  generateDerivativesInContextSet,
} from "./generators/derivativesInContext";
import {
  generateRelatedRates,
  generateRelatedRatesSet,
} from "./generators/relatedRates";
import {
  generateLinearApproximation,
  generateLinearApproximationSet,
} from "./generators/linearApproximation";
import {
  generateMeanValueTheorem,
  generateMeanValueTheoremSet,
} from "./generators/meanValueTheorem";
import {
  generateCriticalPoints,
  generateCriticalPointsSet,
} from "./generators/criticalPoints";
import {
  generateIncreasingDecreasing,
  generateIncreasingDecreasingSet,
} from "./generators/increasingDecreasing";
import {
  generateFirstDerivativeTest,
  generateFirstDerivativeTestSet,
} from "./generators/firstDerivativeTest";
import {
  generateCandidatesTest,
  generateCandidatesTestSet,
} from "./generators/candidatesTest";
import {
  generateSecondDerivativeTest,
  generateSecondDerivativeTestSet,
} from "./generators/secondDerivativeTest";
import {
  generateGraphExtrema,
  generateGraphExtremaSet,
} from "./generators/graphExtrema";
import {
  generateConnectDerivatives,
  generateConnectDerivativesSet,
} from "./generators/connectDerivatives";
import {
  generateOptimization,
  generateOptimizationSet,
} from "./generators/optimization";

function rawProblem(skillId: SkillId, difficulty: Difficulty): Problem {
  switch (skillId) {
    case "derivatives-in-context":
      return generateDerivativesInContext(difficulty);
    case "related-rates":
      return generateRelatedRates(difficulty);
    case "linear-approximation":
      return generateLinearApproximation(difficulty);
    case "mean-value-theorem":
      return generateMeanValueTheorem(difficulty);
    case "critical-points":
      return generateCriticalPoints(difficulty);
    case "increasing-decreasing":
      return generateIncreasingDecreasing(difficulty);
    case "first-derivative-test":
      return generateFirstDerivativeTest(difficulty);
    case "candidates-test":
      return generateCandidatesTest(difficulty);
    case "second-derivative-test":
      return generateSecondDerivativeTest(difficulty);
    case "graph-extrema":
      return generateGraphExtrema(difficulty);
    case "connect-derivatives":
      return generateConnectDerivatives(difficulty);
    case "optimization":
      return generateOptimization(difficulty);
    default: {
      const _exhaustive: never = skillId;
      throw new Error(`No generator for skill: ${_exhaustive}`);
    }
  }
}

function rawSet(
  skillId: SkillId,
  count: number,
  options?: { rampDifficulty?: boolean },
): Problem[] {
  switch (skillId) {
    case "derivatives-in-context":
      return generateDerivativesInContextSet(count, options);
    case "related-rates":
      return generateRelatedRatesSet(count, options);
    case "linear-approximation":
      return generateLinearApproximationSet(count, options);
    case "mean-value-theorem":
      return generateMeanValueTheoremSet(count, options);
    case "critical-points":
      return generateCriticalPointsSet(count, options);
    case "increasing-decreasing":
      return generateIncreasingDecreasingSet(count, options);
    case "first-derivative-test":
      return generateFirstDerivativeTestSet(count, options);
    case "candidates-test":
      return generateCandidatesTestSet(count, options);
    case "second-derivative-test":
      return generateSecondDerivativeTestSet(count, options);
    case "graph-extrema":
      return generateGraphExtremaSet(count, options);
    case "connect-derivatives":
      return generateConnectDerivativesSet(count, options);
    case "optimization":
      return generateOptimizationSet(count, options);
    default: {
      const _exhaustive: never = skillId;
      throw new Error(`No practice set for skill: ${_exhaustive}`);
    }
  }
}

/** Central router — always attaches structured promptLines. */
export function generateProblem(
  skillId: SkillId,
  difficulty: Difficulty = 1,
): Problem {
  return finalizeProblem(rawProblem(skillId, difficulty));
}

export function generatePracticeSet(
  skillId: SkillId,
  count: number,
  options?: { rampDifficulty?: boolean },
): Problem[] {
  return rawSet(skillId, count, options).map(finalizeProblem);
}

export { checkAnswer, scoreTimed } from "./checker";
export {
  finalizeProblem,
  latexToLines,
  math,
  text,
  row,
  prompt,
  solution,
} from "./prompt";
