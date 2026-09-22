import Link from "next/link";
import { SKILLS } from "@/lib/problems/skills";
import { IntegralMarquee } from "@/components/IntegralMarquee";

export default function CalcPracticeIndex() {
  return (
    <div>
      <h1 className="skill-title">Practice</h1>
      <p className="pixel-lead">
        Timed practice. Weekly scores count toward the leaderboard when you log
        in — so create an account.
      </p>
      <IntegralMarquee />
      <div className="skill-grid" style={{ marginTop: "1.25rem" }}>
        {SKILLS.map((s) => (
          <Link key={s.id} href={`/calc/practice/${s.id}`} className="skill-card">
            <span className="tag">{s.unitDay}</span>
            <h3>{s.name}</h3>
            <p>{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
