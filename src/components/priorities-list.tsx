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

interface PrioritiesListProps {
  allAssignments: Assignment[];
  courseNameMap: Record<number, string>;
  courseFilter: string | undefined;
  hideSubmitted: boolean;
}

function computePriorityScore(assignment: Assignment, markedDone: boolean): number {
  if (markedDone) return 0;
  const sub = assignment.submission;
  if (sub?.missing) return 100;
  if (sub?.submitted_at || sub?.workflow_state === "graded") return 0;

  let urgency = 0;
  if (assignment.due_at) {
    const now = Date.now();
    const due = new Date(assignment.due_at).getTime();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);

    if (hoursUntilDue <= 0) urgency = 95;
    else if (hoursUntilDue <= 24) urgency = 90;
    else if (hoursUntilDue <= 72) urgency = 90 - ((hoursUntilDue - 24) / 48) * 20;
    else if (hoursUntilDue <= 168) urgency = 70 - ((hoursUntilDue - 72) / 96) * 30;
    else if (hoursUntilDue <= 336) urgency = 40 - ((hoursUntilDue - 168) / 168) * 20;
    else urgency = Math.max(5, 20 - ((hoursUntilDue - 336) / 336) * 15);
  } else {
    urgency = 10;
  }

  const points = assignment.points_possible ?? 0;
  const pointsBoost = Math.min(10, (points / 100) * 10);
  return Math.min(100, Math.round(urgency + pointsBoost));
}

function getPriorityColor(score: number) {
  if (score >= 80) return { bg: "bg-red-500", text: "text-red-600 dark:text-red-400", ring: "border-red-500/30" };
  if (score >= 60) return { bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", ring: "border-orange-500/30" };
  if (score >= 35) return { bg: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400", ring: "border-yellow-500/20" };
  return { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", ring: "border-emerald-500/20" };
}

function formatRelativeTime(dueAt: string | null) {
  if (!dueAt) return "No due date";
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const diff = due - now;
  const absDiff = Math.abs(diff);
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    if (days === 0) return `${hours}h overdue`;
    return `${days}d overdue`;
  }
  if (hours < 1) return "< 1 hour";
  if (hours < 24) return `in ${hours}h`;
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return "No due date";
  const date = new Date(dueAt);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeRemainingPct(dueAt: string | null): number {
  if (!dueAt) return 0;
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const diff = due - now;
  if (diff <= 0) return 100;
  const maxWindow = 14 * 24 * 60 * 60 * 1000;
  const elapsed = maxWindow - Math.min(diff, maxWindow);
  return Math.round((elapsed / maxWindow) * 100);
}

export function PrioritiesList({ allAssignments, courseNameMap, courseFilter, hideSubmitted }: PrioritiesListProps) {
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

  const scored = allAssignments.map((a) => {
    const markedDone = isDone(a.id);
    const sub = a.submission;
    const isSubmitted = markedDone || !!(sub?.submitted_at || sub?.workflow_state === "graded");
    return { ...a, priorityScore: computePriorityScore(a, markedDone), isSubmitted, markedDone };
  });

  let filtered = scored;
  if (courseFilter && courseFilter !== "all") {
    filtered = filtered.filter((a) => a.course_id === Number(courseFilter));
  }
  if (hideSubmitted) {
    filtered = filtered.filter((a) => !a.isSubmitted);
  }

  const unsubmitted = filtered.filter((a) => !a.isSubmitted).sort((a, b) => b.priorityScore - a.priorityScore);
  const submitted = filtered.filter((a) => a.isSubmitted).sort((a, b) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(b.due_at).getTime() - new Date(a.due_at).getTime();
  });

  const urgentCount = unsubmitted.filter((a) => a.priorityScore >= 80).length;

  return (
    <>
      <div className="mb-6">
        <p className="text-xs text-muted-foreground">
          {unsubmitted.length} pending{urgentCount > 0 ? ` \u00b7 ${urgentCount} urgent` : ""}
        </p>
      </div>

      {unsubmitted.length === 0 && submitted.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">No assignments to show.</p>
        </div>
      ) : (
        <>
          {unsubmitted.length > 0 && (
            <section className="mb-8">
              <div className="space-y-2.5">
                {unsubmitted.map((assignment) => {
                  const color = getPriorityColor(assignment.priorityScore);
                  const courseName = courseNameMap[assignment.course_id] || "";
                  const relTime = formatRelativeTime(assignment.due_at);
                  const dueDateStr = formatDueDate(assignment.due_at);
                  const timePct = timeRemainingPct(assignment.due_at);
                  const sub = assignment.submission;
                  const canOverride = !!(sub?.missing || sub?.late || (!sub?.submitted_at && sub?.workflow_state !== "graded"));

                  return (
                    <div
                      key={assignment.id}
                      className={`group rounded-xl border ${color.ring} bg-card px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:bg-accent/30 dark:shadow-none`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Priority indicator */}
                        <div className="flex flex-col items-center gap-1 pt-0.5">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color.bg}/10`}>
                            <span className={`text-sm font-bold tabular-nums ${color.text}`}>
                              {assignment.priorityScore}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <Link
                          href={`/assignment/${assignment.id}?courseId=${assignment.course_id}`}
                          className="min-w-0 flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{assignment.name}</p>
                            {assignment.submission?.missing && (
                              <Badge variant="destructive" className="h-auto shrink-0 py-0 text-[10px]">Missing</Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{courseName}</p>
                          <div className="mt-2.5 flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div className={`h-full rounded-full transition-all ${color.bg}`} style={{ width: `${timePct}%` }} />
                            </div>
                            <span className={`shrink-0 text-[11px] font-medium ${color.text}`}>{relTime}</span>
                          </div>
                        </Link>

                        {/* Right side */}
                        <div className="flex shrink-0 items-start gap-3">
                          <div className="text-right">
                            <p className="text-[11px] text-muted-foreground">{dueDateStr}</p>
                            {assignment.points_possible != null && (
                              <p className="text-[11px] text-muted-foreground">{assignment.points_possible} pts</p>
                            )}
                          </div>
                          {canOverride && (
                            <button
                              onClick={(e) => toggleOverride(e, assignment.id)}
                              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 transition-colors hover:border-emerald-500 hover:bg-emerald-500/10"
                              title="Mark as done"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Submitted section */}
          {!hideSubmitted && submitted.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted</h2>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                  {submitted.length}
                </span>
              </div>
              <div className="rounded-xl border border-border/50 bg-card card-lift">
                {submitted.map((assignment, i) => {
                  const courseName = courseNameMap[assignment.course_id] || "";
                  const sub = assignment.submission;
                  const isGraded = sub?.workflow_state === "graded";
                  return (
                    <div
                      key={assignment.id}
                      className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/30 ${i > 0 ? "border-t border-border/50" : ""}`}
                    >
                      {assignment.markedDone ? (
                        <button
                          onClick={(e) => toggleOverride(e, assignment.id)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500 transition-colors"
                          title="Undo mark as done"
                        >
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </button>
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10">
                          <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                      <Link href={`/assignment/${assignment.id}?courseId=${assignment.course_id}`} className="min-w-0 flex-1 flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`truncate text-sm font-medium ${assignment.markedDone ? "line-through" : ""} text-muted-foreground`}>
                              {assignment.name}
                            </p>
                            {assignment.markedDone && (
                              <span className="shrink-0 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Done</span>
                            )}
                            {!assignment.markedDone && isGraded && (
                              <span className="shrink-0 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Graded</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{courseName}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          {sub?.score != null ? (
                            <p className="text-xs font-medium tabular-nums">
                              {sub.score}<span className="font-normal text-muted-foreground">/{assignment.points_possible}</span>
                            </p>
                          ) : assignment.points_possible != null ? (
                            <p className="text-[11px] text-muted-foreground">{assignment.points_possible} pts</p>
                          ) : null}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
