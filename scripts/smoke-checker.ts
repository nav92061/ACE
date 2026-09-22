/**
 * Smoke test — generate one problem per unit skill.
 * Run: npm run test:checker
 */

import { generateProblem } from "../src/lib/problems";
import { SKILLS } from "../src/lib/problems/skills";
import { checkAnswer } from "../src/lib/problems/checker";

for (const skill of SKILLS) {
  for (const d of [1, 2, 3] as const) {
    const p = generateProblem(skill.id, d);
    if (p.skillId !== skill.id) throw new Error(`skill mismatch ${skill.id}`);
    if (p.choices?.length) {
      const correct = p.choices.find((c) => c.value === p.correctAnswerMath);
      if (!correct) throw new Error(`no correct choice for ${skill.id}`);
      const g = checkAnswer(p, correct.id);
      if (!g.correct) throw new Error(`MC grade fail ${skill.id}: ${p.promptLatex}`);
    } else {
      const g = checkAnswer(p, p.correctAnswerMath);
      if (!g.correct) {
        throw new Error(
          `number/expr grade fail ${skill.id}: got ${p.correctAnswerMath} for ${p.promptLatex}`,
        );
      }
    }
  }
}

console.log("All", SKILLS.length, "unit skills generate & grade OK");
