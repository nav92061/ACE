import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
  }
  return JSON.parse(raw) as Record<string, string>;
}

let app: App | undefined;
let db: Firestore | undefined;

export function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }
  const sa = loadServiceAccount();
  app = initializeApp({
    credential: cert(sa as never),
    projectId: sa.project_id,
  });
  return app;
}

export function adminDb() {
  if (!db) {
    db = getFirestore(getAdminApp());
    db.settings({ ignoreUndefinedProperties: true });
  }
  return db;
}

/** Verify Firebase ID token without pulling jwks-rsa/jose ESM path when possible. */
export async function requireUser(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Not signed in");

  // Verify via Google identitytoolkit (avoids jwks-rsa ESM issues on Vercel)
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    },
  );
  const data = (await res.json()) as {
    users?: { localId: string; email?: string; displayName?: string }[];
    error?: { message: string };
  };
  if (!res.ok || !data.users?.[0]) {
    throw new Error("Not signed in");
  }
  const u = data.users[0];
  return {
    uid: u.localId,
    email: u.email,
    name: u.displayName,
  };
}
