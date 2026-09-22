"use client";

import { getClientAuth } from "@/lib/firebase/client";

export async function authFetch(input: string, init: RequestInit = {}) {
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  const res = await fetch(input, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data;
}
