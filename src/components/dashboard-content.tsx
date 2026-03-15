"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { WorkloadChart, type WeekBucket } from "@/components/charts/workload-chart";
import { CompletionRing, type CompletionData } from "@/components/charts/completion-ring";
import { getOverrides } from "@/lib/assignment-overrides";

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

function urgencyStyle(hoursUntil: number) {
  if (hoursUntil <= 0) return { border: "border-l-red-500", text: "text-red-600 dark:text-red-400", label: "OVERDUE" };
  if (hoursUntil <= 24) return { border: "border-l-red-500", text: "text-red-600 dark:text-red-400", label: "DUE TODAY" };
  if (hoursUntil <= 48) return { border: "border-l-orange-500", text: "text-orange-600 dark:text-orange-400", label: "DUE TOMORROW" };
  if (hoursUntil <= 168) return { border: "border-l-amber-500", text: "text-amber-600 dark:text-amber-400", label: "DUE SOON" };
  return { border: "border-l-blue-500", text: "text-blue-600 dark:text-blue-400", label: "UP NEXT" };
}

function formatRelativeTime(dueAt: string, now: number): string {
  const due = new Date(dueAt).getTime();
  const diff = due - now;
  const absDiff = Math.abs(diff);
  const mins = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  if (diff < 0) {
    if (hours < 1) return `${mins}m overdue`;
    if (days === 0) return `${hours}h overdue`;
    return `${days}d overdue`;
  }
  if (mins < 60) return `in ${mins}m`;
  if (hours < 24) return `in ${hours}h`;
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function formatDueTime(dueAt: string): string {
  return new Date(dueAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDueShort(dueAt: string): string {
  const d = new Date(dueAt);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + formatDueTime(dueAt);
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

  /* --- Next up: first future unsubmitted assignment ----------------- */
  const nextUp = useMemo(() => {
    return allAssignments
      .filter((a) => a.due_at && new Date(a.due_at).getTime() > now - 86400000 && isUnsubmitted(a, isDone(a.id)))
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0] ?? null;
  }, [allAssignments, overrides, now]);

  /* --- Grouped upcoming --------------------------------------------- */
  const groups = useMemo(() => {
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    const today: Assignment[] = [];
    const tomorrow: Assignment[] = [];
    const thisWeek: Assignment[] = [];
    const later: Assignment[] = [];

    const future = allAssignments
      .filter((a) => a.due_at && new Date(a.due_at).getTime() > now)
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

    for (const a of future) {
      if (isDone(a.id)) continue;
      const sub = a.submission;
      if (sub?.submitted_at || sub?.workflow_state === "graded") continue;

      const d = new Date(a.due_at!);
      if (d <= todayEnd) today.push(a);
      else if (d <= tomorrowEnd) tomorrow.push(a);
      else if (d <= weekEnd) thisWeek.push(a);
      else later.push(a);
    }
    return { today, tomorrow, thisWeek, later };
  }, [allAssignments, overrides, now]);

  /* --- Pending per course ------------------------------------------- */
  const pendingByCourse = useMemo(() => {
    const map: Record<number, number> = {};
    for (const a of allAssignments) {
      if (!isUnsubmitted(a, isDone(a.id))) continue;
      map[a.course_id] = (map[a.course_id] || 0) + 1;
    }
    return map;
  }, [allAssignments, overrides]);

  /* --- Greeting & briefing ------------------------------------------ */
  const firstName = userName?.split(" ")[0] ?? "";
  const greeting = getGreeting();

  const briefing = useMemo(() => {
    const parts: string[] = [];
    if (groups.today.length > 0) parts.push(`${groups.today.length} due today`);
    if (stats.dueThisWeek > 0) parts.push(`${stats.dueThisWeek} this week`);
    if (averageGrade != null) parts.push(`${averageGrade}% average`);
    if (parts.length === 0) return "You're all caught up";
    return parts.join(" \u00b7 ");
  }, [groups, stats, averageGrade]);

  /* --- Completion data for ring ------------------------------------- */
  const completionData: CompletionData = {
    submitted: stats.submitted,
    graded: stats.graded,
    missing: stats.missing,
    late: stats.late,
    notYetDue: stats.notYetDue,
  };

  /* --- Up Next urgency ---------------------------------------------- */
  const nextUpMeta = useMemo(() => {
    if (!nextUp?.due_at) return null;
    const hoursUntil = (new Date(nextUp.due_at).getTime() - now) / 3600000;
    return {
      ...urgencyStyle(hoursUntil),
      relTime: formatRelativeTime(nextUp.due_at, now),
    };
  }, [nextUp, now]);

  const hasUpcoming = groups.today.length + groups.tomorrow.length + groups.thisWeek.length + groups.later.length > 0;

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">

      {/* ---- Greeting ------------------------------------------------ */}
      <div className="mb-10">
        <h1 className="font-display text-3xl italic tracking-tight text-foreground">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{briefing}</p>
        {termName && <p className="mt-0.5 text-xs text-muted-foreground/50">{termName}</p>}
      </div>

      {/* ---- Up Next ------------------------------------------------- */}
      {nextUp && nextUpMeta ? (
        <Link href={`/assignment/${nextUp.id}?courseId=${nextUp.course_id}`}>
          <div className={`card-lift mb-8 rounded-xl border border-border/50 border-l-4 ${nextUpMeta.border} bg-card p-5`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${nextUpMeta.text}`}>
                {nextUpMeta.label}
              </span>
              <span className={`text-sm font-semibold tabular-nums ${nextUpMeta.text}`}>
                {nextUpMeta.relTime}
              </span>
            </div>
            <p className="mt-2.5 text-lg font-semibold tracking-tight">{nextUp.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {courseNameMap[nextUp.course_id]}
              {nextUp.points_possible != null && ` \u00b7 ${nextUp.points_possible} pts`}
            </p>
          </div>
        </Link>
      ) : (
        <div className="card-lift mb-8 rounded-xl border border-border/50 border-l-4 border-l-emerald-500 bg-card p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10">
              <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">All caught up</p>
              <p className="text-xs text-muted-foreground">No upcoming assignments need your attention.</p>
            </div>
          </div>
        </div>
      )}

      {/* ---- Stats --------------------------------------------------- */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* GPA */}
        <div className="card-lift rounded-xl border border-border/50 bg-card px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">GPA</p>
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
        <div className="card-lift rounded-xl border border-border/50 bg-card px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Completed</p>
          <span className="mt-1 block text-2xl font-bold tabular-nums tracking-tight">
            {stats.completedCount}<span className="text-base font-medium text-muted-foreground">/{stats.totalCount}</span>
          </span>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${stats.completionPct}%` }}
            />
          </div>
        </div>

        {/* Due This Week */}
        <div className="card-lift rounded-xl border border-border/50 bg-card px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">This Week</p>
          <span className="mt-1 block text-2xl font-bold tabular-nums tracking-tight">{stats.dueThisWeek}</span>
          <p className="text-[11px] text-muted-foreground">assignments due</p>
        </div>

        {/* Missing */}
        <div className={`rounded-xl border bg-card px-4 py-3.5 card-lift ${
          stats.missing > 0 ? "border-red-500/20" : "border-border/50"
        }`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Missing</p>
          <span className={`mt-1 block text-2xl font-bold tabular-nums tracking-tight ${
            stats.missing > 0
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}>
            {stats.missing}
          </span>
          {stats.missing === 0 && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">all clear</p>
          )}
        </div>
      </div>

      {/* ---- Course Grades ------------------------------------------- */}
      {gradeData.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Courses</h2>
          <div className="grid grid-cols-2 gap-3">
            {gradeData.map((course) => {
              const gc = gradeColor(course.score);
              const pending = pendingByCourse[course.courseId] || 0;
              return (
                <Link key={course.courseId} href={`/course/${course.courseId}`}>
                  <div className="rounded-xl border border-border/50 bg-card px-4 py-3.5 card-lift">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium">{course.name}</p>
                      <span className={`shrink-0 text-lg font-bold tabular-nums ${gc.text}`}>
                        {course.score}%
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{letterGradeFromScore(course.score)}</span>
                      {pending > 0 && (
                        <>
                          <span className="text-border">·</span>
                          <span>{pending} pending</span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${gc.bar} transition-all duration-500`}
                        style={{ width: `${course.score}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ---- Charts -------------------------------------------------- */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <WorkloadChart data={weeklyBuckets} />
        <CompletionRing data={completionData} completionPct={stats.completionPct} />
      </section>

      {/* ---- Grouped Upcoming ---------------------------------------- */}
      <section>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</h2>

        {!hasUpcoming ? (
          <div className="rounded-xl border border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">Nothing coming up.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <UpcomingGroup
              label="Today"
              items={groups.today}
              courseNameMap={courseNameMap}
              labelClass="text-red-600 dark:text-red-400"
              countClass="bg-red-500/10 text-red-600 dark:text-red-400"
              borderClass="border-red-500/20"
              showTime
            />
            <UpcomingGroup
              label="Tomorrow"
              items={groups.tomorrow}
              courseNameMap={courseNameMap}
              labelClass="text-orange-600 dark:text-orange-400"
              countClass="bg-orange-500/10 text-orange-600 dark:text-orange-400"
              borderClass="border-orange-500/15"
              showTime
            />
            <UpcomingGroup
              label="This Week"
              items={groups.thisWeek}
              courseNameMap={courseNameMap}
              labelClass="text-muted-foreground"
              countClass="bg-muted text-muted-foreground"
              borderClass="border-border/50"
              showDate
            />
            <UpcomingGroup
              label="Later"
              items={groups.later}
              courseNameMap={courseNameMap}
              labelClass="text-muted-foreground"
              countClass="bg-muted text-muted-foreground"
              borderClass="border-border/50"
              showDate
              limit={8}
            />
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Upcoming group section                                             */
/* ------------------------------------------------------------------ */

function UpcomingGroup({
  label,
  items,
  courseNameMap,
  labelClass,
  countClass,
  borderClass,
  showTime,
  showDate,
  limit,
}: {
  label: string;
  items: Assignment[];
  courseNameMap: Record<number, string>;
  labelClass: string;
  countClass: string;
  borderClass: string;
  showTime?: boolean;
  showDate?: boolean;
  limit?: number;
}) {
  if (items.length === 0) return null;
  const visible = limit ? items.slice(0, limit) : items;
  const overflow = limit && items.length > limit ? items.length - limit : 0;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${labelClass}`}>{label}</span>
        <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${countClass}`}>
          {items.length}
        </span>
      </div>
      <div className={`rounded-xl border ${borderClass} bg-card card-lift`}>
        {visible.map((a, i) => (
          <Link key={a.id} href={`/assignment/${a.id}?courseId=${a.course_id}`}>
            <div className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/30 ${i > 0 ? "border-t border-border/50" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{courseNameMap[a.course_id]}</p>
              </div>
              <div className="shrink-0 text-right">
                {showTime && a.due_at && (
                  <p className="text-xs font-medium tabular-nums">{formatDueTime(a.due_at)}</p>
                )}
                {showDate && a.due_at && (
                  <p className="text-xs tabular-nums text-muted-foreground">{formatDueShort(a.due_at)}</p>
                )}
                {a.points_possible != null && (
                  <p className="text-[11px] text-muted-foreground">{a.points_possible} pts</p>
                )}
              </div>
            </div>
          </Link>
        ))}
        {overflow > 0 && (
          <Link href="/assignments">
            <div className="border-t border-border/50 px-4 py-2.5 text-center">
              <span className="text-xs font-medium text-muted-foreground hover:text-foreground">
                +{overflow} more
              </span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
