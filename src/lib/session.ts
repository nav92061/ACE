const CLASS_KEY = "ace-class";
const TEACHER_KEY = "ace-teacher-class";

export function saveClassSession(data: {
  classId: string;
  nickname: string;
  className: string;
}) {
  localStorage.setItem(CLASS_KEY, JSON.stringify(data));
}

export function loadClassSession(): {
  classId: string;
  nickname: string;
  className: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CLASS_KEY);
    return raw ? (JSON.parse(raw) as never) : null;
  } catch {
    return null;
  }
}

export function saveTeacherClass(classId: string) {
  localStorage.setItem(TEACHER_KEY, classId);
}

export function loadTeacherClass(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TEACHER_KEY);
}
