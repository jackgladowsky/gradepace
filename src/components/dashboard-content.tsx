"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { WorkloadChart, type WeekBucket } from "@/components/charts/workload-chart";
import { CompletionRing, type CompletionData } from "@/components/charts/completion-ring";
import { getOverrides, setOverride } from "@/lib/assignment-overrides";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

interface CourseGrade {
  name: string;
  score: number;
  courseId: number;
}

interface DashboardContentProps {
  userName: string | undefined;
  termName: string | undefined;
  averageGrade: number | null;
  letterGrade: string | null;
  gradeData: CourseGrade[];
  weeklyBuckets: WeekBucket[];
  allAssignments: Assignment[];
  courseNameMap: Record<number, string>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function letterGradeFromScore(score: number): string {
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 60) return "D";
  return "F";
}

function gradeColor(score: number) {
  if (score >= 90) return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" };
  if (score >= 80) return { text: "text-blue-600 dark:text-blue-400", bar: "bg-blue-500" };
  if (score >= 70) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" };
  return { text: "text-red-600 dark:text-red-400", bar: "bg-red-500" };
}

function urgencyLabel(hoursUntil: number) {
  if (hoursUntil <= 0) return { text: "text-red-500", bg: "bg-red-500/10", label: "OVERDUE" };
  if (hoursUntil <= 24) return { text: "text-red-500", bg: "bg-red-500/10", label: "TODAY" };
  if (hoursUntil <= 48) return { text: "text-orange-500", bg: "bg-orange-500/10", label: "TOMORROW" };
  if (hoursUntil <= 168) return { text: "text-amber-500", bg: "bg-amber-500/10", label: "THIS WEEK" };
  return { text: "text-blue-500", bg: "bg-blue-500/10", label: "UPCOMING" };
}

function formatRelativeTime(dueAt: string, now: number): string {
  const due = new Date(dueAt).getTime();
  const diff = due - now;
  const absDiff = Math.abs(diff);
  const mins = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  if (diff < 0) {
    if (hours < 1) return `${mins}m ago`;
    if (days === 0) return `${hours}h ago`;
    return `${days}d ago`;
  }
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return "1d";
  return `${days}d`;
}

function formatDueTime(dueAt: string): string {
  return new Date(dueAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDueShort(dueAt: string): string {
  const d = new Date(dueAt);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function isUnsubmitted(a: Assignment, done: boolean): boolean {
  if (done) return false;
  const sub = a.submission;
  if (sub?.submitted_at || sub?.workflow_state === "graded") return false;
  return true;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DashboardContent({
  userName,
  termName,
  averageGrade,
  letterGrade,
  gradeData,
  weeklyBuckets,
  allAssignments,
  courseNameMap,
}: DashboardContentProps) {
  const [overrides, setOverridesState] = useState<Record<string, { markedDone: boolean }>>({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setOverridesState(getOverrides());
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isDone = (id: number) => overrides[String(id)]?.markedDone ?? false;

  const toggleOverride = useCallback((e: React.MouseEvent, assignmentId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const current = overrides[String(assignmentId)]?.markedDone ?? false;
    setOverride(assignmentId, !current);
    setOverridesState(getOverrides());
  }, [overrides]);

  /* --- Stats -------------------------------------------------------- */
  const stats = useMemo(() => {
    const today = new Date(now);
    let submitted = 0, graded = 0, missing = 0, late = 0, notYetDue = 0;
    for (const a of allAssignments) {
      const sub = a.submission;
      const done = isDone(a.id);
      if (sub?.missing && !done) { missing++; continue; }
      if ((sub?.missing && done) || done) { submitted++; continue; }
      if (sub?.late) { late++; continue; }
      if (sub?.workflow_state === "graded") { graded++; continue; }
      if (sub?.submitted_at) { submitted++; continue; }
      if (a.due_at && new Date(a.due_at) > today) { notYetDue++; continue; }
      notYetDue++;
    }
    const completedCount = submitted + graded + late;
    const totalCount = allAssignments.length;
    const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const dueThisWeek = allAssignments.filter((a) => {
      if (!a.due_at) return false;
      const d = new Date(a.due_at);
      return d > today && d <= weekEnd;
    }).length;

    return { submitted, graded, missing, late, notYetDue, completedCount, totalCount, completionPct, dueThisWeek };
  }, [allAssignments, overrides, now]);

  /* --- All upcoming unsubmitted, sorted by due date ------------------ */
  const upcoming = useMemo(() => {
    return allAssignments
      .filter((a) => a.due_at && isUnsubmitted(a, isDone(a.id)))
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
  }, [allAssignments, overrides, now]);

  /* --- Overdue items ------------------------------------------------- */
  const overdue = useMemo(() => {
    return upcoming.filter((a) => new Date(a.due_at!).getTime() <= now);
  }, [upcoming, now]);

  /* --- Future items -------------------------------------------------- */
  const future = useMemo(() => {
    return upcoming.filter((a) => new Date(a.due_at!).getTime() > now);
  }, [upcoming, now]);

  /* --- Pending per course ------------------------------------------- */
  const pendingByCourse = useMemo(() => {
    const map: Record<number, number> = {};
    for (const a of allAssignments) {
      if (!isUnsubmitted(a, isDone(a.id))) continue;
      map[a.course_id] = (map[a.course_id] || 0) + 1;
    }
    return map;
  }, [allAssignments, overrides]);

  /* --- Greeting ------------------------------------------------------ */
  const firstName = userName?.split(" ")[0] ?? "";
  const greeting = getGreeting();

  /* --- Completion data for ring -------------------------------------- */
  const completionData: CompletionData = {
    submitted: stats.submitted,
    graded: stats.graded,
    missing: stats.missing,
    late: stats.late,
    notYetDue: stats.notYetDue,
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">

      {/* ---- Header -------------------------------------------------- */}
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {greeting}, {firstName}
          </h1>
          {termName && (
            <p className="mt-0.5 text-xs text-muted-foreground/60">{termName}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm tabular-nums text-muted-foreground">
          {stats.dueThisWeek > 0 && (
            <span>{stats.dueThisWeek} due this week</span>
          )}
        </div>
      </div>

      {/* ---- Stats strip --------------------------------------------- */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* GPA */}
        <div className="rounded-lg border border-border/60 bg-card px-4 py-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Average</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums tracking-tight">
              {averageGrade != null ? `${averageGrade}%` : "--"}
            </span>
            {letterGrade && (
              <span className="text-sm font-medium text-muted-foreground">{letterGrade}</span>
            )}
          </div>
        </div>

        {/* Completed */}
        <div className="rounded-lg border border-border/60 bg-card px-4 py-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Completed</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight">{stats.completedCount}</span>
            <span className="text-sm text-muted-foreground">/ {stats.totalCount}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${stats.completionPct}%` }}
            />
          </div>
        </div>

        {/* This Week */}
        <div className="rounded-lg border border-border/60 bg-card px-4 py-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">This Week</span>
          <span className="mt-1 block text-2xl font-bold tabular-nums tracking-tight">{stats.dueThisWeek}</span>
        </div>

        {/* Missing */}
        <div className={`rounded-lg border bg-card px-4 py-3.5 ${
          stats.missing > 0 ? "border-red-500/30" : "border-border/60"
        }`}>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Missing</span>
          <span className={`mt-1 block text-2xl font-bold tabular-nums tracking-tight ${
            stats.missing > 0
              ? "text-red-500"
              : "text-emerald-500"
          }`}>
            {stats.missing}
          </span>
        </div>
      </div>

      {/* ---- What's Due (HERO section) ------------------------------- */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What&apos;s Due
          </h2>
          <Link href="/assignments" className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors">
            View all
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
            <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All caught up</p>
              <p className="text-xs text-muted-foreground">Nothing needs your attention right now.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
            {/* Overdue items */}
            {overdue.length > 0 && (
              <>
                <div className="border-b border-red-500/15 bg-red-500/8 px-4 py-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                    Overdue
                  </span>
                  <span className="ml-2 text-xs text-red-500/60">{overdue.length}</span>
                </div>
                {overdue.map((a, i) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    courseNameMap={courseNameMap}
                    now={now}
                    onToggle={toggleOverride}
                    showBorder={i > 0}
                    urgencyOverride="overdue"
                  />
                ))}
              </>
            )}

            {/* Future items */}
            {future.slice(0, 12).map((a, i) => {
              const hoursUntil = (new Date(a.due_at!).getTime() - now) / 3600000;
              const prevHoursUntil = i > 0 ? (new Date(future[i - 1].due_at!).getTime() - now) / 3600000 : null;
              const urg = urgencyLabel(hoursUntil);
              const prevUrg = prevHoursUntil !== null ? urgencyLabel(prevHoursUntil) : null;
              const showGroupHeader = !prevUrg || prevUrg.label !== urg.label;

              return (
                <div key={a.id}>
                  {showGroupHeader && (
                    <div className="border-t border-border/40 bg-muted/40 px-4 py-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${urg.text}`}>
                        {urg.label}
                      </span>
                    </div>
                  )}
                  <AssignmentRow
                    assignment={a}
                    courseNameMap={courseNameMap}
                    now={now}
                    onToggle={toggleOverride}
                    showBorder={!showGroupHeader}
                  />
                </div>
              );
            })}

            {future.length > 12 && (
              <Link href="/assignments">
                <div className="border-t border-border/40 px-4 py-2.5 text-center">
                  <span className="text-xs text-muted-foreground hover:text-foreground">
                    +{future.length - 12} more assignments
                  </span>
                </div>
              </Link>
            )}
          </div>
        )}
      </section>

      {/* ---- Courses ------------------------------------------------- */}
      {gradeData.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Courses</h2>
          <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
            {gradeData.map((course, i) => {
              const gc = gradeColor(course.score);
              const pending = pendingByCourse[course.courseId] || 0;
              return (
                <Link key={course.courseId} href={`/course/${course.courseId}`}>
                  <div className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/30 ${i > 0 ? "border-t border-border/40" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{course.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{letterGradeFromScore(course.score)}</span>
                        {pending > 0 && (
                          <>
                            <span className="text-border">·</span>
                            <span>{pending} pending</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden w-24 sm:block">
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${gc.bar} transition-all duration-500`}
                            style={{ width: `${course.score}%` }}
                          />
                        </div>
                      </div>
                      <span className={`w-12 text-right text-sm font-bold tabular-nums ${gc.text}`}>
                        {course.score}%
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- Charts -------------------------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2">
        <WorkloadChart data={weeklyBuckets} />
        <CompletionRing data={completionData} completionPct={stats.completionPct} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Assignment row                                                     */
/* ------------------------------------------------------------------ */

function AssignmentRow({
  assignment: a,
  courseNameMap,
  now,
  onToggle,
  showBorder,
  urgencyOverride,
}: {
  assignment: Assignment;
  courseNameMap: Record<number, string>;
  now: number;
  onToggle: (e: React.MouseEvent, id: number) => void;
  showBorder: boolean;
  urgencyOverride?: "overdue";
}) {
  const hoursUntil = (new Date(a.due_at!).getTime() - now) / 3600000;
  const relTime = formatRelativeTime(a.due_at!, now);
  const isOverdue = urgencyOverride === "overdue" || hoursUntil <= 0;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/30 ${showBorder ? "border-t border-border/30" : ""}`}>
      <button
        onClick={(e) => onToggle(e, a.id)}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 transition-colors hover:border-emerald-500 hover:bg-emerald-500/10"
        title="Mark as done"
      />
      <Link href={`/assignment/${a.id}?courseId=${a.course_id}`} className="flex min-w-0 flex-1 items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{a.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{courseNameMap[a.course_id]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-right">
          {a.points_possible != null && (
            <span className="hidden text-xs text-muted-foreground sm:inline">{a.points_possible} pts</span>
          )}
          <div className="w-20 text-right">
            {hoursUntil > 24 ? (
              <p className="text-xs text-muted-foreground">{formatDueShort(a.due_at!)}</p>
            ) : (
              <>
                <p className={`text-sm font-semibold tabular-nums ${isOverdue ? "text-red-500" : "text-foreground"}`}>
                  {relTime}
                </p>
                <p className="text-[11px] text-muted-foreground">{formatDueTime(a.due_at!)}</p>
              </>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
