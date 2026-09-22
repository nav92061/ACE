import { SKILLS } from "@/lib/problems/skills";
import type { SkillId } from "@/types";
import type { Firestore } from "firebase-admin/firestore";

function mondayStart(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function sundayEnd(monday: Date): Date {
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Ensure subject class + current week exist. Returns weekId. */
export async function ensureSubjectClass(
  db: Firestore,
  classId: string,
  className: string,
) {
  const classRef = db.collection("classes").doc(classId);
  const snap = await classRef.get();
  const allSkills = SKILLS.map((s) => s.id);

  if (!snap.exists) {
    await classRef.set({
      name: className,
      subjectId: classId,
      activeSkills: allSkills,
      createdAt: Date.now(),
    });
  }

  const now = Date.now();
  const weeks = await classRef.collection("weeks").get();
  const active = weeks.docs.find((d) => {
    const w = d.data();
    return !w.locked && w.startAt <= now && now <= w.endAt;
  });

  if (!active) {
    const start = mondayStart();
    const end = sundayEnd(start);
    const weekRef = classRef.collection("weeks").doc();
    const skills =
      (snap.exists ? (snap.data()?.activeSkills as SkillId[]) : null) ??
      allSkills;
    await weekRef.set({
      classId,
      startAt: start.getTime(),
      endAt: end.getTime(),
      skills,
      locked: false,
      label: `Week of ${start.toLocaleDateString("en-US")}`,
    });
    return weekRef.id;
  }

  return active.id;
}

export async function recomputeStanding(
  db: Firestore,
  classId: string,
  weekId: string,
  studentId: string,
  nickname: string,
) {
  const weekRef = db.collection("classes").doc(classId).collection("weeks").doc(weekId);
  const weekSnap = await weekRef.get();
  if (!weekSnap.exists || weekSnap.data()?.locked) return;

  const skills: string[] = weekSnap.data()?.skills ?? [];
  const bests = await weekRef.collection("bestScores").where("studentId", "==", studentId).get();

  let total = 0;
  let achievedAt = Date.now();
  for (const doc of bests.docs) {
    const data = doc.data();
    if (!skills.includes(data.skillId)) continue;
    total += Number(data.score ?? 0);
    achievedAt = Math.min(achievedAt, Number(data.achievedAt ?? achievedAt));
  }

  const standingRef = weekRef.collection("standings").doc(studentId);
  const prev = await standingRef.get();
  let finalAchieved = achievedAt;
  if (prev.exists) {
    const prevTotal = Number(prev.data()?.totalScore ?? 0);
    if (total > prevTotal) finalAchieved = Date.now();
    else if (total === prevTotal) {
      finalAchieved = Number(prev.data()?.achievedAt ?? achievedAt);
    }
  }

  await standingRef.set({
    classId,
    weekId,
    studentId,
    nickname,
    totalScore: total,
    achievedAt: finalAchieved,
  });
}
