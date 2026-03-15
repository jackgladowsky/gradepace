import { getSession } from "@/lib/session";
import { getCourses, getAssignments, type CanvasAssignment } from "@/lib/canvas";
import { PriorityFilters } from "@/components/priority-filters";
import { PrioritiesList } from "@/components/priorities-list";

function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*SEC\s+\S+/gi, "")
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "")
    .replace(/\s+\d{5}\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function PrioritiesPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; hideSubmitted?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const { canvasUrl, canvasToken } = session;

  const allCourses = await getCourses(canvasUrl!, canvasToken!);
  const withEnrollments = allCourses.filter((c) => c.enrollments && c.enrollments.length > 0);
  const maxTermId = Math.max(...withEnrollments.map((c) => c.enrollment_term_id || 0));
  const courses = withEnrollments.filter((c) => c.enrollment_term_id === maxTermId);

  const courseNameMap: Record<number, string> = {};
  courses.forEach((c) => { courseNameMap[c.id] = cleanCourseName(c.name); });

  const assignmentArrays = await Promise.all(
    courses.map((c) => getAssignments(canvasUrl!, canvasToken!, c.id).catch(() => [] as CanvasAssignment[]))
  );
  const allAssignments = assignmentArrays.flat();

  const serialized = allAssignments.map((a) => ({
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
  }));

  const courseList = courses.map((c) => ({ id: c.id, name: courseNameMap[c.id] || c.name }));

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Priorities</h1>
      </div>

      <div className="mb-6">
        <PriorityFilters courses={courseList} />
      </div>

      <PrioritiesList
        allAssignments={serialized}
        courseNameMap={courseNameMap}
        courseFilter={params.course}
        hideSubmitted={params.hideSubmitted === "true"}
      />
    </div>
  );
}
