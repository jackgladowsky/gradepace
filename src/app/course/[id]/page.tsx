import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getCourses, getAssignments, type CanvasAssignment } from "@/lib/canvas";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return "No due date";
  const date = new Date(dueAt);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getSubmissionStatus(assignment: CanvasAssignment) {
  const sub = assignment.submission;
  if (!sub) return null;
  if (sub.missing) return { label: "Missing", variant: "destructive" as const };
  if (sub.late) return { label: "Late", className: "bg-amber-100 text-amber-700" };
  if (sub.workflow_state === "graded") return { label: "Graded", className: "bg-emerald-100 text-emerald-700" };
  if (sub.submitted_at) return { label: "Submitted", className: "bg-blue-100 text-blue-700" };
  return null;
}

function getGradeColor(score: number | null | undefined) {
  if (score == null) return "text-muted-foreground";
  if (score >= 90) return "text-emerald-600";
  if (score >= 80) return "text-blue-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const courseId = parseInt(id, 10);

  const session = await getSession();
  if (!session.canvasToken || !session.canvasUrl) {
    redirect("/connect");
  }

  const { canvasUrl, canvasToken } = session;

  const courses = await getCourses(canvasUrl, canvasToken);
  const course = courses.find((c) => c.id === courseId);
  if (!course) {
    redirect("/");
  }

  const assignments = await getAssignments(canvasUrl, canvasToken, courseId);
  const enrollment = course.enrollments?.[0];
  const score = enrollment?.computed_current_score;
  const grade = enrollment?.computed_current_grade;

  const now = new Date();
  const upcoming = assignments
    .filter((a) => a.due_at && new Date(a.due_at) > now)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
  const past = assignments
    .filter((a) => !a.due_at || new Date(a.due_at) <= now)
    .sort((a, b) => {
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(b.due_at).getTime() - new Date(a.due_at).getTime();
    });

  function AssignmentRow({ assignment, index }: { assignment: CanvasAssignment; index: number }) {
    const status = getSubmissionStatus(assignment);
    const sub = assignment.submission;
    return (
      <Link href={`/assignment/${assignment.id}?courseId=${courseId}`}>
        <div className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 ${index > 0 ? "border-t" : ""}`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{assignment.name}</p>
              {status && (
                status.variant === "destructive" ? (
                  <Badge variant="destructive" className="h-auto py-0.5 text-[10px]">{status.label}</Badge>
                ) : (
                  <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}>
                    {status.label}
                  </span>
                )
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDueDate(assignment.due_at)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {sub?.score != null ? (
              <p className="text-sm font-semibold tabular-nums">
                {sub.score}<span className="text-muted-foreground font-normal">/{assignment.points_possible}</span>
              </p>
            ) : assignment.points_possible != null ? (
              <p className="text-xs text-muted-foreground">{assignment.points_possible} pts</p>
            ) : null}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <span className="text-sm font-semibold">{course.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Grade Header */}
        <div className="mb-8 flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card shadow-sm border">
            <div className="text-center">
              <p className={`text-2xl font-bold tabular-nums ${getGradeColor(score)}`}>
                {score != null ? `${score}%` : "—"}
              </p>
              {grade && score != null && (
                <p className="text-xs text-muted-foreground">{grade}</p>
              )}
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{course.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {course.course_code}
              {course.term?.name ? ` · ${course.term.name}` : ""}
            </p>
          </div>
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Upcoming</h2>
              <span className="text-xs text-muted-foreground">{upcoming.length}</span>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {upcoming.map((assignment, i) => (
                <AssignmentRow key={assignment.id} assignment={assignment} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Past</h2>
              <span className="text-xs text-muted-foreground">{past.length}</span>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {past.map((assignment, i) => (
                <AssignmentRow key={assignment.id} assignment={assignment} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
