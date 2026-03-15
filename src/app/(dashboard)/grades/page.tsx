import { getSession } from "@/lib/session";
import { getCourses, getAssignments, type CanvasAssignment } from "@/lib/canvas";
import Link from "next/link";
import { GradeBars, type CourseGradeData } from "@/components/charts/grade-bars";

function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*SEC\s+\S+/gi, "")
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "")
    .replace(/\s+\d{5}\s+/g, " ")
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

function getGradeColor(score: number | null | undefined) {
  if (score == null) return "text-muted-foreground";
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 80) return "text-blue-600 dark:text-blue-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default async function GradesPage() {
  const session = await getSession();
  const { canvasUrl, canvasToken } = session;

  const allCourses = await getCourses(canvasUrl!, canvasToken!);
  const withEnrollments = allCourses.filter((c) => c.enrollments && c.enrollments.length > 0);
  const maxTermId = Math.max(...withEnrollments.map((c) => c.enrollment_term_id || 0));
  const courses = withEnrollments.filter((c) => c.enrollment_term_id === maxTermId);

  // Get graded assignments per course
  const assignmentArrays = await Promise.all(
    courses.map((c) => getAssignments(canvasUrl!, canvasToken!, c.id).catch(() => [] as CanvasAssignment[]))
  );

  // Compute overall average
  let totalScore = 0, courseCount = 0;
  for (const c of courses) {
    const score = c.enrollments?.[0]?.computed_current_score;
    if (score != null) { totalScore += score; courseCount++; }
  }
  const overallAvg = courseCount > 0 ? Math.round(totalScore / courseCount) : null;

  const gradeData: CourseGradeData[] = courses
    .map((c) => ({
      name: cleanCourseName(c.name),
      score: c.enrollments?.[0]?.computed_current_score ?? 0,
      courseId: c.id,
    }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score);

  const termName = courses[0]?.term?.name;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Grades</h1>
        {termName && <p className="mt-1 text-xs text-muted-foreground">{termName}</p>}
      </div>

      {/* Overall average */}
      <div className="mb-8 rounded-xl border border-border/50 bg-card px-6 py-5 card-lift">
        <p className="text-xs font-medium text-muted-foreground">Overall Average</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={`text-3xl font-semibold tabular-nums ${getGradeColor(overallAvg)}`}>
            {overallAvg != null ? `${overallAvg}%` : "--"}
          </span>
          {overallAvg != null && (
            <span className="text-sm text-muted-foreground">{letterGradeFromScore(overallAvg)}</span>
          )}
        </div>
      </div>

      {/* Grade chart */}
      <section className="mb-8">
        <GradeBars data={gradeData} />
      </section>

      {/* Per-course breakdown */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course Breakdown</h2>
        <div className="space-y-3">
          {courses.map((course, ci) => {
            const enrollment = course.enrollments?.[0];
            const score = enrollment?.computed_current_score;
            const grade = enrollment?.computed_current_grade;
            const assignments = assignmentArrays[ci];
            const graded = assignments.filter((a) => a.submission?.workflow_state === "graded");

            return (
              <Link key={course.id} href={`/course/${course.id}`}>
                <div className="rounded-xl border border-border/50 bg-card px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:bg-accent/50 dark:shadow-none dark:hover:bg-accent/30">
                  <div className="flex items-center justify-between gap-4">
                    <p className="truncate text-sm font-medium">{cleanCourseName(course.name)}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-lg font-semibold tabular-nums ${getGradeColor(score)}`}>
                        {score != null ? `${score}%` : "--"}
                      </span>
                      {grade && <span className="text-xs text-muted-foreground">{grade}</span>}
                    </div>
                  </div>
                  {/* Recent graded assignments */}
                  {graded.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {graded.slice(0, 3).map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-xs">
                          <Link href={`/assignment/${a.id}?courseId=${course.id}`} className="truncate text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>{a.name}</Link>
                          {a.submission?.score != null && (
                            <span className="shrink-0 tabular-nums font-medium">
                              {a.submission.score}<span className="text-muted-foreground font-normal">/{a.points_possible}</span>
                            </span>
                          )}
                        </div>
                      ))}
                      {graded.length > 3 && (
                        <p className="text-[11px] text-muted-foreground">+{graded.length - 3} more graded</p>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
