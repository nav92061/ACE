/** Subject classes are defined by URL path, not join codes. */

export type SubjectId = "calc";

export interface SubjectMeta {
  id: SubjectId;
  name: string;
  className: string;
  href: string;
}

export const SUBJECTS: SubjectMeta[] = [
  {
    id: "calc",
    name: "AP Calculus",
    className: "AP Calculus",
    href: "/calc",
  },
];

export function getSubject(id: string): SubjectMeta | null {
  return SUBJECTS.find((s) => s.id === id) ?? null;
}

/** Firestore class document id for a subject. */
export function classIdForSubject(subject: SubjectId): string {
  return subject; // classes/calc
}
