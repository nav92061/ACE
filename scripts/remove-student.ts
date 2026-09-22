/**
 * One-off: remove a student from the calc class roster + week standings.
 * Usage: npx tsx scripts/remove-student.ts ballpablo
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2]!.trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = v;
  }
}

loadEnvLocal();

const nick = (process.argv[2] || "").trim().toLowerCase();
if (!nick) {
  console.error("Usage: npx tsx scripts/remove-student.ts <nickname>");
  process.exit(1);
}

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
if (!getApps().length) {
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}
const db = getFirestore();
const classId = "calc";

async function main() {
  const students = await db.collection("classes").doc(classId).collection("students").get();
  const matches = students.docs.filter((d) => {
    const n = String(d.data().nickname ?? "").toLowerCase();
    return n === nick || n.replace(/\s+/g, "") === nick.replace(/\s+/g, "");
  });
  if (!matches.length) {
    console.log(`No student matching "${nick}"`);
    return;
  }

  for (const s of matches) {
    const uid = s.id;
    console.log(`Removing ${s.data().nickname} (${uid})`);

    await s.ref.delete();

    const weeks = await db.collection("classes").doc(classId).collection("weeks").get();
    for (const w of weeks.docs) {
      await w.ref.collection("standings").doc(uid).delete().catch(() => {});
      const bests = await w.ref
        .collection("bestScores")
        .where("studentId", "==", uid)
        .get();
      for (const b of bests.docs) {
        await b.ref.delete();
      }
    }

    // Soft-clear class link on user profile (keep auth account)
    await db
      .collection("users")
      .doc(uid)
      .set({ removedFromClassAt: Date.now(), subjectId: null }, { merge: true })
      .catch(() => {});
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
