import { getSession } from "@/lib/session";
import { getCourses, getAssignments, type CanvasCourse, type CanvasAssignment } from "@/lib/canvas";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { disconnect } from "@/app/connect/actions";
import { RefreshButton } from "@/components/refresh-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatsRow } from "@/components/charts/stats-row";
import { GradeBars, type CourseGradeData } from "@/components/charts/grade-bars";
import { WorkloadChart, type WeekBucket } from "@/components/charts/workload-chart";
import { CompletionRing, type CompletionData } from "@/components/charts/completion-ring";

/** Strip Canvas noise from course names: section numbers, term codes, CRNs, brackets */
function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")        // [VTL-1-OL], [BOS-1-TR]
    .replace(/\s*SEC\s+\S+/gi, "")         // SEC 01, SEC V30
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "") // Spring 2026
    .replace(/\s+\d{5}\s+/g, " ")          // 5-digit CRNs like 36744
    .replace(/\s+/g, " ")
    .trim();
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

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return { label: "No due date", urgent: false };
  const date = new Date(dueAt);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (days < 0) return { label: `${dateStr}, ${time}`, urgent: true, tag: "Past due" };
  if (days === 0) return { label: `Today, ${time}`, urgent: true, tag: "Today" };
  if (days === 1) return { label: `Tomorrow, ${time}`, urgent: true, tag: "Tomorrow" };
  if (days <= 7) return { label: `${dateStr}, ${time}`, urgent: days <= 3, tag: `${days}d` };
  return { label: `${dateStr}, ${time}`, urgent: false };
}

function getSubmissionStatus(assignment: CanvasAssignment) {
  const sub = assignment.submission;
  if (!sub) return null;
  if (sub.missing) return { label: "Missing", variant: "destructive" as const };
  if (sub.late) return { label: "Late", className: "text-amber-600 dark:text-amber-400" };
  if (sub.workflow_state === "graded") return { label: "Graded", className: "text-emerald-600 dark:text-emerald-400" };
  if (sub.submitted_at) return { label: "Done", className: "text-muted-foreground" };
  return null;
}

// ── Analytics computation ─────────────────────────────────────────

function computeAverageGrade(courses: CanvasCourse[]) {
  let totalScore = 0;
  let count = 0;
  for (const c of courses) {
    const score = c.enrollments?.[0]?.computed_current_score;
    if (score != null) {
      totalScore += score;
      count++;
    }
  }
  if (count === 0) return { averageGrade: null, letterGrade: null };
  const avg = Math.round(totalScore / count);
  return { averageGrade: avg, letterGrade: letterGradeFromScore(avg) };
}

function computeCompletionStats(allAssignments: CanvasAssignment[]) {
  const now = new Date();
  let submitted = 0;
  let graded = 0;
  let missing = 0;
  let late = 0;
  let notYetDue = 0;

  for (const a of allAssignments) {
    const sub = a.submission;
    if (sub?.missing) { missing++; continue; }
    if (sub?.late) { late++; continue; }
    if (sub?.workflow_state === "graded") { graded++; continue; }
    if (sub?.submitted_at) { submitted++; continue; }
    if (a.due_at && new Date(a.due_at) > now) { notYetDue++; continue; }
    // No submission and past due but not flagged missing — count as not yet due
    notYetDue++;
  }

  const completedCount = submitted + graded + late;
  const totalCount = allAssignments.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return { submitted, graded, missing, late, notYetDue, completedCount, totalCount, completionPct };
}

function computeDueThisWeek(allAssignments: CanvasAssignment[]) {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return allAssignments.filter((a) => {
    if (!a.due_at) return false;
    const d = new Date(a.due_at);
    return d > now && d <= weekEnd;
  }).length;
}

function computeWeeklyBuckets(allAssignments: CanvasAssignment[]): WeekBucket[] {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  // Set to Monday of current week
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - ((dayOfWeek + 6) % 7));

  const buckets: WeekBucket[] = [];
  for (let i = 0; i < 5; i++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(weekStart.getDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const count = allAssignments.filter((a) => {
      if (!a.due_at) return false;
      const d = new Date(a.due_at);
      return d >= weekStart && d < weekEnd;
    }).length;

    const monthDay = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    buckets.push({ label: i === 0 ? "This week" : monthDay, count });
  }

  return buckets;
}

function computeGradeData(courses: CanvasCourse[]): CourseGradeData[] {
  return courses
    .map((c) => {
      const score = c.enrollments?.[0]?.computed_current_score;
      return {
        name: cleanCourseName(c.name),
        score: score ?? 0,
        courseId: c.id,
      };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score);
}

export default async function Home() {
  const session = await getSession();

  if (!session.canvasToken || !session.canvasUrl) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">StudyHub</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            A better Canvas dashboard with AI-powered assignment breakdowns.
          </p>
          <Link
            href="/connect"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Connect Canvas
          </Link>
        </div>
      </div>
    );
  }

  const { canvasUrl, canvasToken, userName } = session;

  let allCourses: CanvasCourse[];
  try {
    allCourses = await getCourses(canvasUrl, canvasToken);
  } catch {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-muted-foreground">Failed to connect to Canvas. Your token may have expired.</p>
        <Link
          href="/connect"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          Reconnect
        </Link>
      </div>
    );
  }

  const coursesWithEnrollments = allCourses.filter(
    (c) => c.enrollments && c.enrollments.length > 0
  );
  const maxTermId = Math.max(
    ...coursesWithEnrollments.map((c) => c.enrollment_term_id || 0)
  );
  const courses = coursesWithEnrollments.filter(
    (c) => c.enrollment_term_id === maxTermId
  );

  const courseNameMap = new Map<number, string>();
  courses.forEach((c) => {
    courseNameMap.set(c.id, cleanCourseName(c.name));
  });

  const allAssignmentsArrays = await Promise.all(
    courses.map((c) =>
      getAssignments(canvasUrl, canvasToken, c.id).catch(() => [] as CanvasAssignment[])
    )
  );
  const allAssignments = allAssignmentsArrays.flat();

  const now = new Date();
  const upcoming = allAssignments
    .filter((a) => {
      if (!a.due_at) return false;
      return new Date(a.due_at) > now;
    })
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
    .slice(0, 15);

  const termName = courses[0]?.term?.name;

  // ── Analytics ──────────────────────────────────────────
  const { averageGrade, letterGrade } = computeAverageGrade(courses);
  const completionStats = computeCompletionStats(allAssignments);
  const dueThisWeek = computeDueThisWeek(allAssignments);
  const weeklyBuckets = computeWeeklyBuckets(allAssignments);
  const gradeData = computeGradeData(courses);
  const completionData: CompletionData = {
    submitted: completionStats.submitted,
    graded: completionStats.graded,
    missing: completionStats.missing,
    late: completionStats.late,
    notYetDue: completionStats.notYetDue,
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <span className="text-base font-bold tracking-tighter">StudyHub</span>
          <div className="flex items-center gap-1">
            <RefreshButton />
            <ThemeToggle />
            <form action={disconnect}>
              <Button variant="ghost" size="sm" type="submit" className="text-xs text-muted-foreground">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight">
            {userName?.split(" ")[0]}&apos;s dashboard
          </h1>
          {termName && (
            <p className="mt-1 text-xs text-muted-foreground">{termName}</p>
          )}
        </div>

        {/* 1. Stats Row */}
        <section className="mb-6">
          <StatsRow
            averageGrade={averageGrade}
            letterGrade={letterGrade}
            completedCount={completionStats.completedCount}
            totalCount={completionStats.totalCount}
            dueThisWeek={dueThisWeek}
            missingCount={completionStats.missing}
          />
        </section>

        {/* 2. Course Grades */}
        <section className="mb-6">
          <GradeBars data={gradeData} />
        </section>

        {/* 3 & 4. Workload + Completion side by side on desktop */}
        <section className="mb-14 grid gap-6 sm:grid-cols-2">
          <WorkloadChart data={weeklyBuckets} />
          <CompletionRing data={completionData} completionPct={completionStats.completionPct} />
        </section>

        {/* 5. Upcoming Assignments */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
              {upcoming.length}
            </span>
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed py-10 text-center">
              <p className="text-sm text-muted-foreground">Nothing coming up.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
              {upcoming.map((assignment, i) => {
                const status = getSubmissionStatus(assignment);
                const courseName = courseNameMap.get(assignment.course_id) || "";
                const due = formatDueDate(assignment.due_at);
                return (
                  <Link
                    key={assignment.id}
                    href={`/assignment/${assignment.id}?courseId=${assignment.course_id}`}
                  >
                    <div className={`group flex items-center gap-4 px-5 py-4 transition-all duration-150 hover:bg-accent/30 ${i > 0 ? "border-t border-border/50" : ""}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{assignment.name}</p>
                          {status && (
                            status.variant === "destructive" ? (
                              <Badge variant="destructive" className="h-auto shrink-0 py-0 text-[10px]">{status.label}</Badge>
                            ) : (
                              <span className={`shrink-0 text-[11px] font-medium ${status.className}`}>
                                {status.label}
                              </span>
                            )
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{courseName}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {due.tag && (
                          <p className={`text-xs font-medium tabular-nums ${due.urgent ? "text-foreground" : "text-muted-foreground"}`}>
                            {due.tag}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">{due.label}</p>
                        {assignment.points_possible != null && (
                          <p className="text-[11px] text-muted-foreground">{assignment.points_possible} pts</p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
