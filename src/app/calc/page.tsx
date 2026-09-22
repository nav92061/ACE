import Link from "next/link";
import { BrandMark } from "@/components/Brand";
import { SKILLS } from "@/lib/problems/skills";

export default function CalcHomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-brand">
          <BrandMark size={72} />
          <h1>ACE / Calc</h1>
        </div>
        <p className="pixel-lead">
          Timed practice for Applications of Differentiation (4.1–5.10). Create a
          username, race the clock, climb the class board — you&apos;re already
          in this class because you&apos;re on <code>/calc</code>.
        </p>
        <div className="btn-row">
          <Link href="/calc/login" className="btn btn-primary">
            Sign in
          </Link>
          <Link href="/calc/practice" className="btn btn-ghost">
            Practice skills
          </Link>
          <Link href="/calc/leaderboard" className="btn btn-ghost">
            Leaderboard
          </Link>
        </div>
      </section>

      <h2 className="section-title">This unit</h2>
      <p className="pixel-lead">Through Test 3 — pick a skill and start a timed set.</p>
      <div className="skill-grid">
        {SKILLS.map((s) => (
          <Link key={s.id} href={`/calc/practice/${s.id}`} className="skill-card">
            <span className="tag">{s.unitDay}</span>
            <h3>{s.name}</h3>
            <p>{s.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
