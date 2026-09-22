import Link from "next/link";
import { BrandMark } from "@/components/Brand";

const SUBJECTS = [
  {
    href: "/calc",
    code: "CALC",
    name: "AP Calculus",
    blurb: "Applications of differentiation — timed sets & class leaderboard.",
    live: true,
  },
  {
    href: "#",
    code: "PHYS",
    name: "Physics",
    blurb: "Coming soon.",
    live: false,
  },
  {
    href: "#",
    code: "CHEM",
    name: "Chemistry",
    blurb: "Coming soon.",
    live: false,
  },
];

export default function LandingPage() {
  return (
    <main className="main">
      <section className="hero">
        <div className="hero-brand">
          <BrandMark size={80} />
          <h1>ACE</h1>
        </div>
        <p className="pixel-lead">
          Short timed practice for class skills. Join with a username, climb
          the weekly board, top 3 win a prize.
        </p>
      </section>

      <h2 className="section-title">Subject classes</h2>
      <p className="pixel-lead">Open a subject to practice and compete.</p>
      <div className="skill-grid" style={{ marginTop: "1rem" }}>
        {SUBJECTS.map((s) =>
          s.live ? (
            <Link key={s.code} href={s.href} className="skill-card">
              <span className="tag">{s.code}</span>
              <h3>{s.name}</h3>
              <p>{s.blurb}</p>
            </Link>
          ) : (
            <div
              key={s.code}
              className="skill-card"
              style={{ opacity: 0.55, cursor: "default" }}
            >
              <span className="tag">{s.code}</span>
              <h3>{s.name}</h3>
              <p>{s.blurb}</p>
            </div>
          ),
        )}
      </div>
    </main>
  );
}
