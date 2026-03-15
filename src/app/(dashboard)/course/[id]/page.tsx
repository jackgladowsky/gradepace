import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getCourses, getAssignments } from "@/lib/canvas";
import { GradeGoalCalculator } from "@/components/grade-goal-calculator";
import { CourseAssignments } from "@/components/course-assignments";

function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*SEC\s+\S+/gi, "")
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "")
    .replace(/\s+\d{5}\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

  const serialize = (a: typeof assignments[0]) => ({
    id: a.id,
    name: a.name,
    due_at: a.due_at,
    points_possible: a.points_possible,
    course_id: a.course_id,
    submission: a.submission ? {
      score: a.submission.score,
      submitted_at: a.submission.submitted_at,
      workflow_state: a.submission.workflow_state,
      late: a.submission.late,
      missing: a.submission.missing,
    } : undefined,
  });

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

      {/* Grade Goal Calculator */}
      <GradeGoalCalculator
        assignments={assignments}
        currentScore={score ?? null}
        courseName={cleanCourseName(course.name)}
      />

      <CourseAssignments
        courseId={courseId}
        upcoming={upcoming.map(serialize)}
        past={past.map(serialize)}
      />
    </div>
  );
}
