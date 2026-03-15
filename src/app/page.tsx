import { getSession } from "@/lib/session";
import { getCourses, getAssignments, type CanvasCourse, type CanvasAssignment } from "@/lib/canvas";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { disconnect } from "@/app/connect/actions";

const COURSE_COLORS = [
  { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50", border: "border-blue-200" },
  { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50", border: "border-emerald-200" },
  { bg: "bg-violet-500", text: "text-violet-600", light: "bg-violet-50", border: "border-violet-200" },
  { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50", border: "border-amber-200" },
  { bg: "bg-rose-500", text: "text-rose-600", light: "bg-rose-50", border: "border-rose-200" },
  { bg: "bg-cyan-500", text: "text-cyan-600", light: "bg-cyan-50", border: "border-cyan-200" },
  { bg: "bg-pink-500", text: "text-pink-600", light: "bg-pink-50", border: "border-pink-200" },
  { bg: "bg-teal-500", text: "text-teal-600", light: "bg-teal-50", border: "border-teal-200" },
];

function getCourseColor(index: number) {
  return COURSE_COLORS[index % COURSE_COLORS.length];
}

function getGradeDisplay(score: number | null | undefined) {
  if (score == null) return { color: "text-muted-foreground", label: "N/A" };
  if (score >= 90) return { color: "text-emerald-600", label: `${score}%` };
  if (score >= 80) return { color: "text-blue-600", label: `${score}%` };
  if (score >= 70) return { color: "text-amber-600", label: `${score}%` };
  return { color: "text-red-600", label: `${score}%` };
}

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return { label: "No due date", urgent: false };
  const date = new Date(dueAt);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (days < 0) return { label: `${dateStr} at ${time}`, urgent: true, tag: "Past due" };
  if (days === 0) return { label: `Today at ${time}`, urgent: true, tag: "Due today" };
  if (days === 1) return { label: `Tomorrow at ${time}`, urgent: true, tag: "Due tomorrow" };
  if (days <= 3) return { label: `${dateStr} at ${time}`, urgent: true, tag: `${days} days` };
  if (days <= 7) return { label: `${dateStr} at ${time}`, urgent: false, tag: `${days} days` };
  return { label: `${dateStr} at ${time}`, urgent: false };
}

function getSubmissionStatus(assignment: CanvasAssignment) {
  const sub = assignment.submission;
  if (!sub) return null;
  if (sub.missing) return { label: "Missing", variant: "destructive" as const };
  if (sub.late) return { label: "Late", className: "bg-amber-100 text-amber-700 border-amber-200" };
  if (sub.workflow_state === "graded") return { label: "Graded", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (sub.submitted_at) return { label: "Submitted", className: "bg-blue-100 text-blue-700 border-blue-200" };
  return null;
}

export default async function Home() {
  const session = await getSession();

  if (!session.canvasToken || !session.canvasUrl) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="flex max-w-lg flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">StudyHub</h1>
            <p className="mt-2 text-base text-muted-foreground">
              A better Canvas dashboard. See your courses, grades, and assignments in one place — with AI-powered breakdowns.
            </p>
          </div>
          <Link
            href="/connect"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            Get Started
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
        <p className="text-muted-foreground">Failed to connect to Canvas. Your token may have expired.</p>
        <Link
          href="/connect"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
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

  const courseColorMap = new Map<number, typeof COURSE_COLORS[0]>();
  const courseNameMap = new Map<number, string>();
  courses.forEach((c, i) => {
    courseColorMap.set(c.id, getCourseColor(i));
    courseNameMap.set(c.id, c.name);
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight">
            StudyHub
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-7 items-center rounded-full bg-secondary px-3">
              <span className="text-xs font-medium text-secondary-foreground">
                {userName}
              </span>
            </div>
            <form action={disconnect}>
              <Button variant="ghost" size="sm" type="submit" className="text-xs text-muted-foreground">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Welcome + Term */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {userName?.split(" ")[0]}
          </h1>
          {termName && (
            <p className="mt-1 text-sm text-muted-foreground">{termName}</p>
          )}
        </div>

        {/* Course Cards */}
        <section className="mb-10">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, i) => {
              const enrollment = course.enrollments?.[0];
              const score = enrollment?.computed_current_score;
              const grade = enrollment?.computed_current_grade;
              const gradeDisplay = getGradeDisplay(score);
              const color = getCourseColor(i);
              return (
                <Link key={course.id} href={`/course/${course.id}`}>
                  <div className="group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                    <div className={`absolute inset-x-0 top-0 h-1 ${color.bg}`} />
                    <div className="flex items-start justify-between gap-3 pt-1">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-tight">
                          {course.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {course.course_code}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold tabular-nums ${gradeDisplay.color}`}>
                          {gradeDisplay.label}
                        </p>
                        {grade && score != null && (
                          <p className="text-xs text-muted-foreground">{grade}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Upcoming Assignments */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Coming Up</h2>
            <span className="text-xs text-muted-foreground">{upcoming.length} assignments</span>
          </div>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground">Nothing due — you&apos;re all caught up.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {upcoming.map((assignment, i) => {
                const status = getSubmissionStatus(assignment);
                const color = courseColorMap.get(assignment.course_id);
                const courseName = courseNameMap.get(assignment.course_id) || "";
                const due = formatDueDate(assignment.due_at);
                return (
                  <Link
                    key={assignment.id}
                    href={`/assignment/${assignment.id}?courseId=${assignment.course_id}`}
                  >
                    <div className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 ${i > 0 ? "border-t" : ""}`}>
                      <div className={`h-8 w-1 shrink-0 rounded-full ${color?.bg || "bg-gray-300"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {assignment.name}
                          </p>
                          {status && (
                            <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className || ""}`}>
                              {status.variant === "destructive" ? (
                                <Badge variant="destructive" className="h-auto py-0.5 text-[10px]">{status.label}</Badge>
                              ) : status.label}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {courseName}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-xs font-medium ${due.urgent ? "text-amber-600" : "text-muted-foreground"}`}>
                          {due.label}
                        </p>
                        {assignment.points_possible != null && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {assignment.points_possible} pts
                          </p>
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
