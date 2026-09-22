"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PracticeSet } from "@/components/PracticeSet";
import { SKILLS } from "@/lib/problems/skills";
import type { GradedAnswer, Problem, SkillId } from "@/types";
import { loadClassSession } from "@/lib/session";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { useAuthUser } from "@/lib/firebase/auth";
import { authFetch } from "@/lib/api";

export default function CalcPracticeSkillPage() {
  const params = useParams<{ skillId: string }>();
  const skillId = params.skillId as SkillId;
  const known = SKILLS.some((s) => s.id === skillId);
  const [inClass, setInClass] = useState(false);
  const { user, loading } = useAuthUser();

  useEffect(() => {
    const session = loadClassSession();
    setInClass(Boolean(session?.classId === "calc" || session?.classId));
  }, [user]);

  const useServer = Boolean(user) && isFirebaseConfigured();

  if (!known) {
    return (
      <div className="panel">
        <p>Unknown skill.</p>
        <Link href="/calc/practice">Back</Link>
      </div>
    );
  }

  if (loading) return <div className="panel">Loading…</div>;

  if (!user) {
    return (
      <div className="panel">
        <h1 className="skill-title">Sign in to practice</h1>
        <p className="muted">
          Timed scores only count when you&apos;re signed in — they feed the
          class leaderboard.
        </p>
        <Link href="/calc/login" className="btn btn-primary">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p style={{ marginBottom: "0.75rem" }}>
        <Link href="/calc/practice">← All skills</Link>
        {useServer ? (
          <span className="muted"> · scores count on the calc leaderboard</span>
        ) : null}
        {!inClass && useServer ? (
          <span className="muted">
            {" "}
            · <Link href="/calc/login">re-login</Link> if scores don&apos;t save
          </span>
        ) : null}
      </p>
      <PracticeSet
        skillId={skillId}
        startTimedServer={
          useServer
            ? async (durationSeconds) => {
                const data = await authFetch("/api/timed", {
                  method: "POST",
                  body: JSON.stringify({
                    subject: "calc",
                    skillId,
                    durationSeconds,
                  }),
                });
                return data as {
                  attemptId: string;
                  problems: Problem[];
                  durationSeconds: number;
                };
              }
            : undefined
        }
        submitTimedServer={
          useServer
            ? async (attemptId, answers) => {
                const data = await authFetch("/api/timed", {
                  method: "PUT",
                  body: JSON.stringify({
                    subject: "calc",
                    attemptId,
                    answers,
                  }),
                });
                return data as {
                  correctCount: number;
                  wrongCount: number;
                  score: number;
                  graded: GradedAnswer[];
                };
              }
            : undefined
        }
      />
    </div>
  );
}
