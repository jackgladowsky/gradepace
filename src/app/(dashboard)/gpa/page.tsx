import { getSession } from "@/lib/session";
import { getCourses } from "@/lib/canvas";
import { GpaCalculator } from "@/components/gpa-calculator";

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

export interface CourseGradeInfo {
  id: number;
  name: string;
  score: number | null;
  letterGrade: string | null;
}

export default async function GpaPage() {
  const session = await getSession();
  const { canvasUrl, canvasToken } = session;

  const allCourses = await getCourses(canvasUrl!, canvasToken!);
  const withEnrollments = allCourses.filter(
    (c) => c.enrollments && c.enrollments.length > 0
  );
  const maxTermId = Math.max(
    ...withEnrollments.map((c) => c.enrollment_term_id || 0)
  );
  const courses = withEnrollments.filter(
    (c) => c.enrollment_term_id === maxTermId
  );

  const termName = courses[0]?.term?.name;

  const courseGrades: CourseGradeInfo[] = courses.map((c) => {
    const score = c.enrollments?.[0]?.computed_current_score ?? null;
    return {
      id: c.id,
      name: cleanCourseName(c.name),
      score,
      letterGrade: score != null ? letterGradeFromScore(score) : null,
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">GPA Calculator</h1>
        {termName && (
          <p className="mt-1 text-xs text-muted-foreground">{termName}</p>
        )}
      </div>

      <GpaCalculator courses={courseGrades} />
    </div>
  );
}
