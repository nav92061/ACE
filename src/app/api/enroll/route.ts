import { NextResponse } from "next/server";
import { adminDb, requireUser } from "@/lib/firebase/admin";
import { classIdForSubject, getSubject } from "@/lib/subjects";
import { ensureSubjectClass } from "@/lib/server/class";

/** Enroll signed-in user into a subject class (from URL). No join code. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = (await req.json()) as { subject?: string; username?: string };
    const subject = getSubject(body.subject ?? "");
    if (!subject) {
      return NextResponse.json({ error: "Unknown subject" }, { status: 400 });
    }

    const db = adminDb();
    const classId = classIdForSubject(subject.id);
    await ensureSubjectClass(db, classId, subject.className);

    const username =
      (body.username || "").trim() ||
      user.name ||
      user.email?.split("@")[0] ||
      "student";

    const studentRef = db
      .collection("classes")
      .doc(classId)
      .collection("students")
      .doc(user.uid);

    const existing = await studentRef.get();
    if (existing.exists) {
      await studentRef.update({ nickname: username });
    } else {
      await studentRef.set({
        classId,
        nickname: username,
        uid: user.uid,
        joinedAt: Date.now(),
      });
    }

    // Mirror username on user profile
    await db.collection("users").doc(user.uid).set(
      {
        username,
        usernameLower: username.toLowerCase(),
        role: "student",
        subjectId: subject.id,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    return NextResponse.json({
      classId,
      nickname: username,
      className: subject.className,
      subjectId: subject.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Enroll failed";
    const status = msg === "Not signed in" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
