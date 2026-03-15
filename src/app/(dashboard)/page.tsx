import { getSession } from "@/lib/session";
import { getCourses, getAssignments, type CanvasCourse, type CanvasAssignment } from "@/lib/canvas";
import { type WeekBucket } from "@/components/charts/workload-chart";
import { DashboardContent } from "@/components/dashboard-content";

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

function computeAverageGrade(courses: CanvasCourse[]) {
  let totalScore = 0, count = 0;
  for (const c of courses) {
    const score = c.enrollments?.[0]?.computed_current_score;
    if (score != null) { totalScore += score; count++; }
  }
  if (count === 0) return { averageGrade: null, letterGrade: null };
  const avg = Math.round((totalScore / count) * 10) / 10;
  return { averageGrade: avg, letterGrade: letterGradeFromScore(Math.round(avg)) };
}

function computeWeeklyBuckets(allAssignments: CanvasAssignment[]): WeekBucket[] {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
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

export default async function DashboardPage() {
  const session = await getSession();
  const { canvasUrl, canvasToken, userName } = session;

  const allCourses = await getCourses(canvasUrl!, canvasToken!);
  const coursesWithEnrollments = allCourses.filter((c) => c.enrollments && c.enrollments.length > 0);
  const maxTermId = Math.max(...coursesWithEnrollments.map((c) => c.enrollment_term_id || 0));
  const courses = coursesWithEnrollments.filter((c) => c.enrollment_term_id === maxTermId);

  const courseNameMap: Record<number, string> = {};
  courses.forEach((c) => { courseNameMap[c.id] = cleanCourseName(c.name); });

  const allAssignmentsArrays = await Promise.all(
    courses.map((c) => getAssignments(canvasUrl!, canvasToken!, c.id).catch(() => [] as CanvasAssignment[]))
  );
  const allAssignments = allAssignmentsArrays.flat();

  const termName = courses[0]?.term?.name;
  const { averageGrade, letterGrade } = computeAverageGrade(courses);
  const weeklyBuckets = computeWeeklyBuckets(allAssignments);

  const gradeData = courses
    .map((c) => ({
      name: cleanCourseName(c.name),
      score: c.enrollments?.[0]?.computed_current_score ?? 0,
      courseId: c.id,
    }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score);

  const serialize = (a: CanvasAssignment) => ({
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
    <DashboardContent
      userName={userName}
      termName={termName}
      averageGrade={averageGrade}
      letterGrade={letterGrade}
      gradeData={gradeData}
      weeklyBuckets={weeklyBuckets}
      allAssignments={allAssignments.map(serialize)}
      courseNameMap={courseNameMap}
    />
  );
}
