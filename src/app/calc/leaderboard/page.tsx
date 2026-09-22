"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadClassSession } from "@/lib/session";
import { useAuthUser } from "@/lib/firebase/auth";
import { BrandMark } from "@/components/Brand";

interface Standing {
  studentId: string;
  nickname: string;
  totalScore: number;
  achievedAt: number;
  played?: boolean;
}

interface WinnerRecord {
  label: string;
  lockedAt?: number;
  top3: { nickname: string; totalScore: number; place: number }[];
}

export default function CalcLeaderboardPage() {
  const { user, username } = useAuthUser();
  const [session, setSession] = useState<ReturnType<typeof loadClassSession>>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [winners, setWinners] = useState<WinnerRecord[]>([]);
  const [hidden, setHidden] = useState(false);
  const [weekLabel, setWeekLabel] = useState("This week");
  const [className, setClassName] = useState("AP Calculus");
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [mostImproved, setMostImproved] = useState<
    { nickname: string; delta: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(loadClassSession());
  }, [user]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/leaderboard?subject=calc");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        if (data.hidden) {
          setHidden(true);
          return;
        }
        setHidden(false);
        setClassName(data.className ?? "AP Calculus");
        setWeekLabel(data.weekLabel ?? "This week");
        setStandings(data.standings ?? []);
        setTotalPlayers(Number(data.totalPlayers ?? data.standings?.length ?? 0));
        setMostImproved(data.mostImproved ?? []);
        setWinners(data.winners ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load leaderboard.");
      } finally {
        setLoading(false);
      }
    }
    void load();
    const id = setInterval(() => void load(), 15000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="panel">
        <p className="pixel-lead">Loading leaderboard…</p>
      </div>
    );
  }

  if (hidden) {
    return (
      <div className="panel">
        <h1 className="skill-title">Leaderboard hidden</h1>
        <p className="pixel-lead">The board is hidden for now.</p>
      </div>
    );
  }

  const top3 = standings.slice(0, 3);
  const you = session?.nickname || username;
  const yourRank =
    you != null
      ? standings.findIndex(
          (s) => s.nickname.toLowerCase() === you.toLowerCase(),
        ) + 1
      : 0;

  return (
    <div className="leaderboard-page">
      <div className="hero-brand" style={{ marginBottom: "0.75rem" }}>
        <BrandMark size={56} />
        <div>
          <h1 className="skill-title">Leaderboard</h1>
          <p className="pixel-lead" style={{ margin: 0 }}>
            {className} · {weekLabel} · {totalPlayers} players
            {you ? (
              <>
                {" "}
                · <span className="pixel-nick">{you}</span>
                {yourRank > 0 ? ` · #${yourRank}` : null}
              </>
            ) : (
              <>
                {" "}
                · <Link href="/calc/login">log in</Link> to compete
              </>
            )}
          </p>
        </div>
      </div>

      <div className="podium">
        {[2, 1, 3].map((place) => {
          const row = top3[place - 1];
          return (
            <div key={place} className={`place place-${place}`}>
              <div className="rank">
                {place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}
              </div>
              <div className="nick">{row?.nickname ?? "—"}</div>
              <div className="pts">{row ? row.totalScore : "–"}</div>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          Full standings
        </h2>
        {standings.length === 0 ? (
          <p className="pixel-lead">
            Nobody enrolled yet.{" "}
            <Link href="/calc/login">Create an account</Link> to join.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((r, i) => {
                  const isYou =
                    !!you &&
                    r.nickname.toLowerCase() === you.toLowerCase();
                  return (
                    <tr
                      key={r.studentId}
                      className={isYou ? "table-you" : undefined}
                    >
                      <td>{i + 1}</td>
                      <td>
                        {r.nickname}
                        {isYou ? " · you" : ""}
                        {!r.played ? (
                          <span className="muted"> · not played</span>
                        ) : null}
                      </td>
                      <td>{r.totalScore}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="section-title">Most improved</h2>
      <div className="panel">
        {mostImproved.length === 0 ? (
          <p className="pixel-lead">Shows after a prior week is locked.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Δ</th>
              </tr>
            </thead>
            <tbody>
              {mostImproved.map((r) => (
                <tr key={r.nickname}>
                  <td>{r.nickname}</td>
                  <td>+{r.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="section-title">Past winners</h2>
      <div className="skill-grid">
        {winners.length === 0 && (
          <p className="pixel-lead">Winners appear when a week is locked.</p>
        )}
        {winners.map((w) => (
          <div key={`${w.label}-${w.lockedAt ?? ""}`} className="panel">
            <h3 className="skill-card-title">{w.label}</h3>
            <ol className="pixel-list">
              {w.top3?.map((t) => (
                <li key={t.place}>
                  {t.nickname} — {t.totalScore}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
