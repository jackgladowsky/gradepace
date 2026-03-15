"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getOverrides, setOverride } from "@/lib/assignment-overrides";

interface Assignment {
  id: number;
  name: string;
  due_at: string | null;
  points_possible: number | null;
  course_id: number;
  submission?: {
    score: number | null;
    submitted_at: string | null;
    workflow_state: string;
    late: boolean;
    missing: boolean;
  };
}

interface AssignmentsListProps {
  allAssignments: Assignment[];
  courseNameMap: Record<number, string>;
}

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return "No due date";
  const date = new Date(dueAt);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function getSubmissionStatus(assignment: Assignment, markedDone: boolean) {
  if (markedDone) return { label: "Done", className: "text-emerald-600 dark:text-emerald-400", variant: undefined };
  const sub = assignment.submission;
  if (!sub) return null;
  if (sub.missing) return { label: "Missing", variant: "destructive" as const, className: undefined };
  if (sub.late) return { label: "Late", className: "text-amber-600 dark:text-amber-400", variant: undefined };
  if (sub.workflow_state === "graded") return { label: "Graded", className: "text-emerald-600 dark:text-emerald-400", variant: undefined };
  if (sub.submitted_at) return { label: "Submitted", className: "text-muted-foreground", variant: undefined };
  return null;
}

export function AssignmentsList({ allAssignments, courseNameMap }: AssignmentsListProps) {
  const [overrides, setOverrides] = useState<Record<string, { markedDone: boolean }>>({});

  useEffect(() => {
    setOverrides(getOverrides());
  }, []);

  const toggleOverride = useCallback((e: React.MouseEvent, assignmentId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const current = overrides[String(assignmentId)]?.markedDone ?? false;
    setOverride(assignmentId, !current);
    setOverrides(getOverrides());
  }, [overrides]);

  const isDone = (id: number) => overrides[String(id)]?.markedDone ?? false;

  const now = new Date();

  const missing = allAssignments.filter((a) => a.submission?.missing && !isDone(a.id));

  const upcoming = allAssignments
    .filter((a) => a.due_at && new Date(a.due_at) > now && !a.submission?.missing)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

  const past = allAssignments
    .filter((a) => {
      if (!a.due_at) return false;
      if (new Date(a.due_at) > now) return false;
      if (a.submission?.missing && !isDone(a.id)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.due_at!).getTime() - new Date(a.due_at!).getTime());

  const allPast = past;

  function AssignmentRow({ assignment, showBorder }: { assignment: Assignment; showBorder: boolean }) {
    const markedDone = isDone(assignment.id);
    const status = getSubmissionStatus(assignment, markedDone);
    const courseName = courseNameMap[assignment.course_id] || "";
    const sub = assignment.submission;
    const canOverride = !!(sub?.missing || sub?.late || (!sub?.submitted_at && sub?.workflow_state !== "graded"));
    const showToggle = canOverride || markedDone;

    return (
      <div className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/30 ${showBorder ? "border-t border-border/50" : ""}`}>
        {showToggle && (
          <button
            onClick={(e) => toggleOverride(e, assignment.id)}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              markedDone
                ? "border-emerald-500 bg-emerald-500"
                : "border-muted-foreground/30 hover:border-muted-foreground/60"
            }`}
            title={markedDone ? "Undo mark as done" : "Mark as done"}
          >
            {markedDone && (
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </button>
        )}
        <Link href={`/assignment/${assignment.id}?courseId=${assignment.course_id}`} className="min-w-0 flex-1 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className={`truncate text-sm font-medium ${markedDone ? "line-through text-muted-foreground" : ""}`}>{assignment.name}</p>
              {status && (
                status.variant === "destructive" ? (
                  <Badge variant="destructive" className="h-auto shrink-0 py-0 text-[10px]">{status.label}</Badge>
                ) : (
                  <span className={`shrink-0 text-[11px] font-medium ${status.className}`}>{status.label}</span>
                )
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{courseName}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">{formatDueDate(assignment.due_at)}</p>
            {sub?.score != null ? (
              <p className="text-xs font-medium tabular-nums">
                {sub.score}<span className="text-muted-foreground font-normal">/{assignment.points_possible}</span>
              </p>
            ) : assignment.points_possible != null ? (
              <p className="text-[11px] text-muted-foreground">{assignment.points_possible} pts</p>
            ) : null}
          </div>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Missing */}
      {missing.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Missing</h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/10 px-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">
              {missing.length}
            </span>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-card card-lift">
            {missing.map((a, i) => (
              <AssignmentRow key={a.id} assignment={a} showBorder={i > 0} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</h2>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
            {upcoming.length}
          </span>
        </div>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">No upcoming assignments.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card card-lift">
            {upcoming.map((a, i) => (
              <AssignmentRow key={a.id} assignment={a} showBorder={i > 0} />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {allPast.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Past</h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
              {allPast.length}
            </span>
          </div>
          <div className="rounded-xl border border-border/50 bg-card card-lift">
            {allPast.map((a, i) => (
              <AssignmentRow key={a.id} assignment={a} showBorder={i > 0} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
