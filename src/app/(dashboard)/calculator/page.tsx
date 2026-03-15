import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getCourses, getAssignments, type CanvasAssignment } from "@/lib/canvas";
import { GradeGoalCalculator } from "@/components/grade-goal-calculator";

function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*SEC\s+\S+/gi, "")
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "")
    .replace(/\s+\d{5}\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function CalculatorPage() {
  const session = await getSession();
  if (!session.canvasToken || !session.canvasUrl) {
    redirect("/connect");
  }

  const { canvasUrl, canvasToken } = session;

  const allCourses = await getCourses(canvasUrl, canvasToken);
  const withEnrollments = allCourses.filter((c) => c.enrollments && c.enrollments.length > 0);
  const maxTermId = Math.max(...withEnrollments.map((c) => c.enrollment_term_id || 0));
  const courses = withEnrollments.filter((c) => c.enrollment_term_id === maxTermId);

  const assignmentArrays = await Promise.all(
    courses.map((c) =>
      getAssignments(canvasUrl, canvasToken, c.id).catch(() => [] as CanvasAssignment[])
    )
  );

  const termName = courses[0]?.term?.name;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Grade Calculator</h1>
        {termName && <p className="mt-1 text-xs text-muted-foreground">{termName}</p>}
        <p className="mt-2 text-sm text-muted-foreground">
          Find out what you need to score on remaining assignments to reach your target grade.
        </p>
      </div>

      <div className="space-y-2">
        {courses.map((course, ci) => {
          const enrollment = course.enrollments?.[0];
          const score = enrollment?.computed_current_score;
          const assignments = assignmentArrays[ci];
          const ungradedCount = assignments.filter(
            (a) =>
              a.points_possible != null &&
              a.points_possible > 0 &&
              (a.submission?.workflow_state !== "graded" || a.submission?.score == null)
          ).length;

          if (ungradedCount === 0) return null;

          return (
            <div
              key={course.id}
              className="rounded-xl border border-border/50 bg-card px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none"
            >
              <div className="mb-1 flex items-center justify-between gap-4">
                <p className="truncate text-sm font-medium">{cleanCourseName(course.name)}</p>
                <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                  {score != null ? `${score}%` : "--"}
                </span>
              </div>
              <GradeGoalCalculator
                assignments={assignments}
                currentScore={score ?? null}
                courseName={cleanCourseName(course.name)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
