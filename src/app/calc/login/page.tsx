"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  loginWithUsername,
  registerWithUsername,
  useAuthUser,
  signOutUser,
} from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { authFetch } from "@/lib/api";
import { saveClassSession } from "@/lib/session";

/** Username + password. Auto-joins the /calc class — no join code. */
export default function CalcLoginPage() {
  const router = useRouter();
  const { configured, user, username } = useAuthUser();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured on this deploy.");
      }

      if (mode === "register") {
        await registerWithUsername({
          username: name,
          password,
          role: "student",
        });
      } else {
        await loginWithUsername(name, password);
      }

      const data = (await authFetch("/api/enroll", {
        method: "POST",
        body: JSON.stringify({ subject: "calc", username: name.trim() }),
      })) as {
        classId: string;
        nickname: string;
        className: string;
      };

      saveClassSession({
        classId: data.classId,
        nickname: data.nickname,
        className: data.className,
      });
      router.push("/calc/practice");
    } catch (e) {
      const msg =
        e && typeof e === "object" && "code" in e
          ? String((e as { code: string }).code)
          : e instanceof Error
            ? e.message
            : "Login failed.";
      if (msg.includes("email-already-in-use")) {
        setError("Username taken — try logging in instead.");
      } else if (
        msg.includes("user-not-found") ||
        msg.includes("invalid-credential") ||
        msg.includes("wrong-password")
      ) {
        setError("Wrong username or password.");
      } else {
        setError(msg.replace(/^auth\//, ""));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel" style={{ maxWidth: 420 }}>
      <h1 className="skill-title">Calc login</h1>
      <p className="muted">
        Username + password. You&apos;re automatically in the AP Calculus class
        (this URL). Scores go to the weekly leaderboard.
      </p>
      {!configured && (
        <p className="error">Firebase config missing — sign-in won&apos;t work.</p>
      )}
      {user && username && (
        <p className="badge-mastered">
          Signed in as {username}{" "}
          <button type="button" className="btn btn-ghost" onClick={() => void signOutUser()}>
            Sign out
          </button>
        </p>
      )}

      <div className="duration-row">
        <button
          type="button"
          className={`chip ${mode === "login" ? "chip-on" : ""}`}
          onClick={() => setMode("login")}
        >
          Log in
        </button>
        <button
          type="button"
          className={`chip ${mode === "register" ? "chip-on" : ""}`}
          onClick={() => setMode("register")}
        >
          Create account
        </button>
      </div>

      <div className="form" style={{ marginTop: "0.75rem" }}>
        <label>
          Username
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="username"
            placeholder="calcstar"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••"
          />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? "Working…" : mode === "login" ? "Log in" : "Create account"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
