import { getSession } from "@/lib/session";
import { getCourses, getAssignments, type CanvasAssignment } from "@/lib/canvas";
import {
  GradeTrendOverlay,
  GradeDistribution,
  TrendStats,
  type CourseTrendData,
  type GradedAssignment,
} from "@/components/charts/grade-trends";

function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*SEC\s+\S+/gi, "")
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "")
    .replace(/\s+\d{5}\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCourseTrend(
  courseId: number,
  courseName: string,
  assignments: CanvasAssignment[]
): CourseTrendData {
  // Filter to graded assignments with a score and a date
  const graded = assignments.filter(
    (a) =>
      a.submission?.workflow_state === "graded" &&
      a.submission?.score != null &&
      a.points_possible != null &&
      a.points_possible > 0 &&
      (a.submission?.submitted_at || a.due_at)
  );

  // Sort by submission date (or due date as fallback)
  graded.sort((a, b) => {
    const dateA = a.submission?.submitted_at || a.due_at || "";
    const dateB = b.submission?.submitted_at || b.due_at || "";
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  const gradedAssignments: GradedAssignment[] = graded.map((a) => ({
    name: a.name,
    date: a.submission?.submitted_at || a.due_at || "",
    scorePercent:
      a.points_possible! > 0
        ? (a.submission!.score! / a.points_possible!) * 100
        : 0,
    score: a.submission!.score!,
    pointsPossible: a.points_possible!,
  }));

  // Compute running averages
  let totalScore = 0;
  let totalPossible = 0;
  const runningAverages = graded.map((a) => {
    totalScore += a.submission!.score!;
    totalPossible += a.points_possible!;
    const avg = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    const date = a.submission?.submitted_at || a.due_at || "";
    return {
      date,
      label: a.name,
      average: Math.round(avg * 10) / 10,
    };
  });

  // Compute stats
  const percents = gradedAssignments.map((a) => a.scorePercent);
  const highest = percents.length > 0 ? Math.max(...percents) : 0;
  const lowest = percents.length > 0 ? Math.min(...percents) : 0;
  const average =
    percents.length > 0
      ? percents.reduce((s, v) => s + v, 0) / percents.length
      : 0;

  // Trend: compare last 5 average vs overall average
  let trend: "improving" | "declining" | "stable" = "stable";
  if (percents.length >= 5) {
    const last5 = percents.slice(-5);
    const last5Avg = last5.reduce((s, v) => s + v, 0) / last5.length;
    const diff = last5Avg - average;
    if (diff > 2) trend = "improving";
    else if (diff < -2) trend = "declining";
  }

  return {
    courseId,
    courseName,
    assignments: gradedAssignments,
    runningAverages,
    stats: { highest, lowest, average, trend },
  };
}

export default async function TrendsPage() {
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

  const assignmentArrays = await Promise.all(
    courses.map((c) =>
      getAssignments(canvasUrl!, canvasToken!, c.id).catch(
        () => [] as CanvasAssignment[]
      )
    )
  );

  const trendData: CourseTrendData[] = courses
    .map((course, i) =>
      buildCourseTrend(
        course.id,
        cleanCourseName(course.name),
        assignmentArrays[i]
      )
    )
    .filter((d) => d.assignments.length > 0);

  const termName = courses[0]?.term?.name;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Grade Trends</h1>
        {termName && (
          <p className="mt-1 text-xs text-muted-foreground">{termName}</p>
        )}
      </div>

      {trendData.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No graded assignments yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <GradeTrendOverlay courses={trendData} />
          <TrendStats courses={trendData} />
          <GradeDistribution courses={trendData} />
        </div>
      )}
    </div>
  );
}
