import type { SkillId, SkillMeta } from "@/types";

/**
 * Unit focus: Applications of Differentiation (AP Calc 4.1–5.10)
 * Aligned to the class day schedule through Test 3.
 */
export const SKILLS: SkillMeta[] = [
  {
    id: "derivatives-in-context",
    name: "Derivatives in Context",
    unitDay: "Days 1–2 · 4.1–4.3",
    description: "Interpret f′ as a rate of change in a real situation.",
    targetSeconds: 20,
    defaultTimedSeconds: 90,
  },
  {
    id: "related-rates",
    name: "Related Rates",
    unitDay: "Days 2–3 · 4.4–4.5",
    description: "One clear related-rates setup; find the asked rate.",
    targetSeconds: 30,
    defaultTimedSeconds: 90,
  },
  {
    id: "linear-approximation",
    name: "Linear Approximation",
    unitDay: "Day 4 · 4.6",
    description: "Approximate f near a given point.",
    targetSeconds: 25,
    defaultTimedSeconds: 90,
  },
  {
    id: "mean-value-theorem",
    name: "Mean Value Theorem",
    unitDay: "Day 5 · 5.1",
    description: "Find c guaranteed by the MVT on [a, b].",
    targetSeconds: 25,
    defaultTimedSeconds: 90,
  },
  {
    id: "critical-points",
    name: "Critical Points",
    unitDay: "Day 7 · 5.2–5.3",
    description: "Find where f′ = 0 or f′ is undefined.",
    targetSeconds: 20,
    defaultTimedSeconds: 90,
  },
  {
    id: "increasing-decreasing",
    name: "Inc / Dec Intervals",
    unitDay: "Day 7 · 5.2–5.3",
    description: "From factored f′(x), find where f increases or decreases.",
    targetSeconds: 25,
    defaultTimedSeconds: 90,
  },
  {
    id: "first-derivative-test",
    name: "First Derivative Test",
    unitDay: "Day 8 · 5.4",
    description: "Classify relative max/min from an f′ sign change.",
    targetSeconds: 20,
    defaultTimedSeconds: 90,
  },
  {
    id: "candidates-test",
    name: "Candidates Test",
    unitDay: "Day 9 · 5.5",
    description: "Absolute max/min of f on a closed interval.",
    targetSeconds: 30,
    defaultTimedSeconds: 90,
  },
  {
    id: "second-derivative-test",
    name: "Second Derivative Test",
    unitDay: "Day 10 · 5.6–5.7",
    description: "Concavity, inflection, or classify with f″.",
    targetSeconds: 25,
    defaultTimedSeconds: 90,
  },
  {
    id: "graph-extrema",
    name: "Extrema from a Graph",
    unitDay: "Day 11 · 5.8–5.9",
    description: "Read absolute/local max and min from a graph.",
    targetSeconds: 20,
    defaultTimedSeconds: 90,
  },
  {
    id: "connect-derivatives",
    name: "Connecting f, f′, f″",
    unitDay: "Day 11 · 5.8–5.9",
    description: "Match graph features to f′ and f″ signs.",
    targetSeconds: 25,
    defaultTimedSeconds: 90,
  },
  {
    id: "optimization",
    name: "Optimization",
    unitDay: "Days 13–14 · 5.10",
    description: "Quick one-variable max/min word problems.",
    targetSeconds: 30,
    defaultTimedSeconds: 90,
  },
];

export function getSkill(id: SkillId): SkillMeta {
  const skill = SKILLS.find((s) => s.id === id);
  if (!skill) throw new Error(`Unknown skill: ${id}`);
  return skill;
}
