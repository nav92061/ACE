import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { classIdForSubject, getSubject } from "@/lib/subjects";
import { ensureSubjectClass } from "@/lib/server/class";

/** Weekly standings for every enrolled student (0 if they haven't scored yet). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const subject = getSubject(url.searchParams.get("subject") ?? "calc");
    if (!subject) {
      return NextResponse.json({ error: "Unknown subject" }, { status: 400 });
    }
    const db = adminDb();
    const classId = classIdForSubject(subject.id);
    await ensureSubjectClass(db, classId, subject.className);

    const classSnap = await db.collection("classes").doc(classId).get();
    if (classSnap.data()?.hideLeaderboard) {
      return NextResponse.json({ hidden: true, standings: [], winners: [] });
    }

    const weeks = await db
      .collection("classes")
      .doc(classId)
      .collection("weeks")
      .get();
    const now = Date.now();
    const active =
      weeks.docs.find((d) => {
        const w = d.data();
        return !w.locked && w.startAt <= now && now <= w.endAt;
      }) ?? weeks.docs.find((d) => !d.data().locked);

    let weekLabel = "This week";
    const scoreByStudent = new Map<
      string,
      { totalScore: number; achievedAt: number }
    >();
    let prevMap: Record<string, number> = {};

    if (active) {
      weekLabel = String(active.data().label ?? "This week");
      const standSnap = await active.ref.collection("standings").get();
      for (const d of standSnap.docs) {
        const data = d.data();
        scoreByStudent.set(d.id, {
          totalScore: Number(data.totalScore ?? 0),
          achievedAt: Number(data.achievedAt ?? Date.now()),
        });
      }

      const locked = weeks.docs
        .filter((d) => d.data().locked)
        .sort((a, b) => b.data().startAt - a.data().startAt);
      if (locked[0]) {
        const prev = await locked[0].ref.collection("standings").get();
        prevMap = Object.fromEntries(
          prev.docs.map((doc) => [doc.id, Number(doc.data().totalScore ?? 0)]),
        );
      }
    }

    const studentsSnap = await db
      .collection("classes")
      .doc(classId)
      .collection("students")
      .get();

    const standings = studentsSnap.docs
      .map((d) => {
        const data = d.data();
        const scored = scoreByStudent.get(d.id);
        return {
          studentId: d.id,
          nickname: String(data.nickname ?? "Student"),
          totalScore: scored?.totalScore ?? 0,
          achievedAt: scored?.achievedAt ?? Number(data.joinedAt ?? 0),
          played: Boolean(scored),
        };
      })
      .filter(
        (r) => !/^ball\s*pablo$/i.test(r.nickname.replace(/\s+/g, " ").trim()),
      );

    standings.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (a.played !== b.played) return a.played ? -1 : 1;
      return a.achievedAt - b.achievedAt;
    });

    const mostImproved = standings
      .map((r) => ({
        nickname: r.nickname,
        delta: r.totalScore - (prevMap[r.studentId] ?? 0),
      }))
      .filter((r) => r.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5);

    let winners: unknown[] = [];
    try {
      const winSnap = await db
        .collection("classes")
        .doc(classId)
        .collection("winners")
        .orderBy("lockedAt", "desc")
        .limit(10)
        .get();
      winners = winSnap.docs.map((d) => d.data());
    } catch {
      winners = [];
    }

    return NextResponse.json({
      hidden: false,
      className: subject.className,
      weekLabel,
      standings,
      totalPlayers: standings.length,
      mostImproved,
      winners,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
