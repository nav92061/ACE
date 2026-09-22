"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { SKILLS } from "@/lib/problems/skills";
import type { SkillId } from "@/types";
import { loadClassSession } from "@/lib/session";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { useAuthUser } from "@/lib/firebase/auth";

export default function ProgressPage() {
  const [session, setSession] = useState<ReturnType<typeof loadClassSession>>(null);
  const [skillId, setSkillId] = useState<SkillId>("candidates-test");
  const [data, setData] = useState<{ label: string; score: number }[]>([]);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuthUser();

  useEffect(() => {
    setSession(loadClassSession());
  }, [user]);

  useEffect(() => {
    async function load() {
      if (authLoading) return;
      if (!user || !isFirebaseConfigured()) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const db = getClientDb();
        const classId = session?.classId || "calc";

        const student = await getDoc(
          doc(db, "classes", classId, "students", user.uid),
        );
        setQuestionsAnswered(Number(student.data()?.questionsAnswered ?? 0));

        const attemptsQ = query(
          collection(db, "classes", classId, "attempts"),
          where("uid", "==", user.uid),
        );
        const attempts = await getDocs(attemptsQ);
        const rows = attempts.docs
          .map((d) => d.data())
          .filter(
            (a) =>
              a.skillId === skillId &&
              a.submittedAt &&
              typeof a.score === "number",
          )
          .sort((a, b) => Number(a.submittedAt) - Number(b.submittedAt))
          .map((a, i) => ({ label: `#${i + 1}`, score: a.score as number }));
        setData(rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load progress.");
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [session, skillId, user, authLoading]);

  if (authLoading) {
    return (
      <div className="panel pixel-panel">
        <p className="pixel-lead">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="panel pixel-panel">
        <h1 className="skill-title">My progress</h1>
        <p className="pixel-lead">Log in to track personal bests.</p>
        <Link href="/calc/login" className="btn btn-primary">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="progress-page">
      <h1 className="skill-title">My progress</h1>
      <p className="pixel-lead">
        Timed scores over time
        {session?.nickname ? (
          <>
            {" "}
            for <span className="pixel-nick">{session.nickname}</span>
          </>
        ) : null}
      </p>

      <div className="panel pixel-panel stat-slot">
        <span className="stat-label">Questions answered</span>
        <span className="stat-value">{questionsAnswered}</span>
      </div>

      <label className="pixel-field">
        <span className="stat-label">Skill</span>
        <select
          value={skillId}
          onChange={(e) => setSkillId(e.target.value as SkillId)}
        >
          {SKILLS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <div className="panel pixel-panel chart-panel">
        {loading ? (
          <p className="pixel-lead">Loading…</p>
        ) : data.length === 0 ? (
          <p className="pixel-lead">
            No timed scores yet for this skill. Finish a timed set on{" "}
            <Link href={`/calc/practice/${skillId}`}>practice</Link> while
            logged in.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data}>
              <CartesianGrid stroke="#1a3160" strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                stroke="#9ec5ff"
                tick={{ fill: "#c8daf8", fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                stroke="#9ec5ff"
                tick={{ fill: "#c8daf8", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#0c1630",
                  border: "3px solid #2f6bff",
                  borderRadius: 0,
                  color: "#fff",
                  fontFamily: "var(--font-ace-sans)",
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#6ea0ff"
                strokeWidth={3}
                dot={{ fill: "#2f6bff", stroke: "#fff", strokeWidth: 1, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
