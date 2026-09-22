"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getClientAuth, getClientDb, isFirebaseConfigured } from "./client";

/** Map a classroom username to a Firebase Auth email (no real email needed). */
export function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${clean}@ace.local`;
}

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured] = useState(isFirebaseConfigured());

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const auth = getClientAuth();
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(getClientDb(), "users", u.uid));
          setUsername((snap.data()?.username as string) ?? null);
          setRole((snap.data()?.role as "student" | "teacher") ?? null);
        } catch {
          setUsername(null);
          setRole(null);
        }
      } else {
        setUsername(null);
        setRole(null);
      }
      setLoading(false);
    });
  }, [configured]);

  return { user, username, role, loading, configured };
}

export async function registerWithUsername(options: {
  username: string;
  password: string;
  role: "student" | "teacher";
}) {
  const username = options.username.trim();
  if (username.length < 2) throw new Error("Username must be at least 2 characters.");
  if (options.password.length < 4) throw new Error("Password must be at least 4 characters.");

  const auth = getClientAuth();
  const email = usernameToEmail(username);
  const cred = await createUserWithEmailAndPassword(auth, email, options.password);
  await setDoc(doc(getClientDb(), "users", cred.user.uid), {
    username,
    usernameLower: username.toLowerCase(),
    role: options.role,
    createdAt: Date.now(),
  });
  return cred.user;
}

export async function loginWithUsername(username: string, password: string) {
  const auth = getClientAuth();
  return signInWithEmailAndPassword(auth, usernameToEmail(username), password);
}

export async function signOutUser() {
  return signOut(getClientAuth());
}
