import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getCourses, getAssignments, type CanvasAssignment } from "@/lib/canvas";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CourseNotes } from "@/components/course-notes";

function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*SEC\s+\S+/gi, "")
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "")
    .replace(/\s+\d{5}\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return "No due date";
  const date = new Date(dueAt);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function getSubmissionStatus(assignment: CanvasAssignment) {
  const sub = assignment.submission;
  if (!sub) return null;
  if (sub.missing) return { label: "Missing", variant: "destructive" as const };
  if (sub.late) return { label: "Late", className: "text-amber-600 dark:text-amber-400" };
  if (sub.workflow_state === "graded") return { label: "Graded", className: "text-emerald-600 dark:text-emerald-400" };
  if (sub.submitted_at) return { label: "Submitted", className: "text-muted-foreground" };
  return null;
}

function getGradeColor(score: number | null | undefined) {
  if (score == null) return "text-muted-foreground";
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 80) return "text-foreground";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-500";
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

  // Build a simplified courses list for notes course selector
  const withEnrollments = courses.filter(
    (c) => c.enrollments && c.enrollments.length > 0
  );
  const maxTermId = Math.max(
    ...withEnrollments.map((c) => c.enrollment_term_id || 0)
  );
  const simpleCourses = withEnrollments
    .filter((c) => c.enrollment_term_id === maxTermId)
    .map((c) => ({ id: c.id, name: cleanCourseName(c.name) }));
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
                  <Badge variant="destructive" className="h-auto shrink-0 py-0 text-[10px]">{status.label}</Badge>
                ) : (
                  <span className={`shrink-0 text-[11px] font-medium ${status.className}`}>
                    {status.label}
                  </span>
                )
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDueDate(assignment.due_at)}
            </p>
          </div>
          <div className="shrink-0 text-right tabular-nums">
            {sub?.score != null ? (
              <p className="text-sm font-medium">
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
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Course header */}
      <div className="mb-10">
        <h1 className="text-xl font-semibold tracking-tight">{cleanCourseName(course.name)}</h1>
        <div className="mt-2 flex items-baseline gap-3">
          <span className={`text-3xl font-semibold tabular-nums ${getGradeColor(score)}`}>
            {score != null ? `${score}%` : "--"}
          </span>
          {grade && score != null && (
            <span className="text-sm text-muted-foreground">{grade}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {course.course_code}
          {course.term?.name ? ` · ${course.term.name}` : ""}
        </p>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Upcoming</h2>
            <span className="text-xs text-muted-foreground">{upcoming.length}</span>
          </div>
          <div className="rounded-xl border border-border/50 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
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
            <h2 className="text-sm font-semibold">Past</h2>
            <span className="text-xs text-muted-foreground">{past.length}</span>
          </div>
          <div className="rounded-xl border border-border/50 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
            {past.map((assignment, i) => (
              <AssignmentRow key={assignment.id} assignment={assignment} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      <CourseNotes
        courseId={courseId}
        courseName={cleanCourseName(course.name)}
        courses={simpleCourses}
      />
    </div>
  );
}
