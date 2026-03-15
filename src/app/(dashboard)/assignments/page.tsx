import { getSession } from "@/lib/session";
import { getCourses, getAssignments, type CanvasAssignment } from "@/lib/canvas";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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

export default async function AssignmentsPage() {
  const session = await getSession();
  const { canvasUrl, canvasToken } = session;

  const allCourses = await getCourses(canvasUrl!, canvasToken!);
  const withEnrollments = allCourses.filter((c) => c.enrollments && c.enrollments.length > 0);
  const maxTermId = Math.max(...withEnrollments.map((c) => c.enrollment_term_id || 0));
  const courses = withEnrollments.filter((c) => c.enrollment_term_id === maxTermId);

  const courseNameMap = new Map<number, string>();
  courses.forEach((c) => courseNameMap.set(c.id, cleanCourseName(c.name)));

  const assignmentArrays = await Promise.all(
    courses.map((c) => getAssignments(canvasUrl!, canvasToken!, c.id).catch(() => [] as CanvasAssignment[]))
  );
  const allAssignments = assignmentArrays.flat();

  const now = new Date();
  const upcoming = allAssignments
    .filter((a) => a.due_at && new Date(a.due_at) > now)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

  const missing = allAssignments.filter((a) => a.submission?.missing);

  const past = allAssignments
    .filter((a) => {
      if (!a.due_at) return false;
      if (new Date(a.due_at) > now) return false;
      if (a.submission?.missing) return false;
      return true;
    })
    .sort((a, b) => new Date(b.due_at!).getTime() - new Date(a.due_at!).getTime());

  function AssignmentRow({ assignment, showBorder }: { assignment: CanvasAssignment; showBorder: boolean }) {
    const status = getSubmissionStatus(assignment);
    const courseName = courseNameMap.get(assignment.course_id) || "";
    const sub = assignment.submission;
    return (
      <Link href={`/assignment/${assignment.id}?courseId=${assignment.course_id}`}>
        <div className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/30 ${showBorder ? "border-t border-border/50" : ""}`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{assignment.name}</p>
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
        </div>
      </Link>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Assignments</h1>
        <p className="mt-1 text-xs text-muted-foreground">{allAssignments.length} total across {courses.length} courses</p>
      </div>

      {/* Missing */}
      {missing.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Missing</h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/10 px-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">
              {missing.length}
            </span>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
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
          <div className="rounded-xl border border-border/50 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
            {upcoming.map((a, i) => (
              <AssignmentRow key={a.id} assignment={a} showBorder={i > 0} />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Past</h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
              {past.length}
            </span>
          </div>
          <div className="rounded-xl border border-border/50 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
            {past.map((a, i) => (
              <AssignmentRow key={a.id} assignment={a} showBorder={i > 0} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
