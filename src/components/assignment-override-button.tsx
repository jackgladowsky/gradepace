"use client";

import { useState, useEffect, useCallback } from "react";
import { getOverrides, setOverride } from "@/lib/assignment-overrides";

export function AssignmentOverrideButton({ assignmentId }: { assignmentId: number }) {
  const [markedDone, setMarkedDone] = useState(false);

  useEffect(() => {
    const overrides = getOverrides();
    setMarkedDone(overrides[String(assignmentId)]?.markedDone ?? false);
  }, [assignmentId]);

  const toggle = useCallback(() => {
    const next = !markedDone;
    setOverride(assignmentId, next);
    setMarkedDone(next);
  }, [assignmentId, markedDone]);

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
        markedDone
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
        markedDone ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/40"
      }`}>
        {markedDone && (
          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </span>
      {markedDone ? "Marked as done" : "Mark as done"}
    </button>
  );
}
