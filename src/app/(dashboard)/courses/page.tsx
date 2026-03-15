import { getSession } from "@/lib/session";
import { getCourses, getAssignments, type CanvasAssignment } from "@/lib/canvas";
import Link from "next/link";

function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*SEC\s+\S+/gi, "")
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "")
    .replace(/\s+\d{5}\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getGradePill(score: number | null | undefined) {
  if (score == null) return { bg: "bg-muted", text: "text-muted-foreground", label: "--" };
  if (score >= 90) return { bg: "bg-emerald-500/10 dark:bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400", label: `${score}%` };
  if (score >= 80) return { bg: "bg-blue-500/10 dark:bg-blue-500/15", text: "text-blue-700 dark:text-blue-400", label: `${score}%` };
  if (score >= 70) return { bg: "bg-amber-500/10 dark:bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", label: `${score}%` };
  return { bg: "bg-red-500/10 dark:bg-red-500/15", text: "text-red-700 dark:text-red-400", label: `${score}%` };
}

export default async function CoursesPage() {
  const session = await getSession();
  const { canvasUrl, canvasToken } = session;

  const allCourses = await getCourses(canvasUrl!, canvasToken!);
  const withEnrollments = allCourses.filter((c) => c.enrollments && c.enrollments.length > 0);
  const maxTermId = Math.max(...withEnrollments.map((c) => c.enrollment_term_id || 0));
  const courses = withEnrollments.filter((c) => c.enrollment_term_id === maxTermId);

  // Get assignment counts per course
  const assignmentArrays = await Promise.all(
    courses.map((c) => getAssignments(canvasUrl!, canvasToken!, c.id).catch(() => [] as CanvasAssignment[]))
  );

  const courseStats = courses.map((course, i) => {
    const assignments = assignmentArrays[i];
    const now = new Date();
    const upcoming = assignments.filter((a) => a.due_at && new Date(a.due_at) > now).length;
    const missing = assignments.filter((a) => a.submission?.missing).length;
    const enrollment = course.enrollments?.[0];
    return {
      ...course,
      name: cleanCourseName(course.name),
      score: enrollment?.computed_current_score,
      grade: enrollment?.computed_current_grade,
      totalAssignments: assignments.length,
      upcoming,
      missing,
    };
  });

  const termName = courses[0]?.term?.name;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Courses</h1>
        {termName && <p className="mt-1 text-xs text-muted-foreground">{termName}</p>}
      </div>

      <div className="space-y-3">
        {courseStats.map((course) => {
          const pill = getGradePill(course.score);
          return (
            <Link key={course.id} href={`/course/${course.id}`}>
              <div className="group rounded-xl border border-border/50 bg-card px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:bg-accent/50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-none dark:hover:bg-accent/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{course.name}</p>
                    <p className="text-xs text-muted-foreground">{course.course_code}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${pill.bg} ${pill.text}`}>
                      {pill.label}
                    </span>
                    {course.grade && course.score != null && (
                      <span className="text-[11px] text-muted-foreground">{course.grade}</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
                  <span>{course.totalAssignments} assignments</span>
                  {course.upcoming > 0 && <span>{course.upcoming} upcoming</span>}
                  {course.missing > 0 && <span className="text-red-500">{course.missing} missing</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
