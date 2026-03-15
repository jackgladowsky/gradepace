"use client";

const STORAGE_KEY = "studyhub_overrides";

export interface AssignmentOverrides {
  [assignmentId: string]: {
    markedDone: boolean;
  };
}

export function getOverrides(): AssignmentOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setOverride(assignmentId: number, markedDone: boolean) {
  const overrides = getOverrides();
  if (markedDone) {
    overrides[String(assignmentId)] = { markedDone: true };
  } else {
    delete overrides[String(assignmentId)];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function isMarkedDone(assignmentId: number): boolean {
  const overrides = getOverrides();
  return overrides[String(assignmentId)]?.markedDone ?? false;
}
