import { getSession } from "@/lib/session";
import { getCourses, getAssignments, type CanvasAssignment } from "@/lib/canvas";
import { AssignmentsList } from "@/components/assignments-list";

function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*SEC\s+\S+/gi, "")
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "")
    .replace(/\s+\d{5}\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function AssignmentsPage() {
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

  // Serialize only what the client component needs
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

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Assignments</h1>
        <p className="mt-1 text-xs text-muted-foreground">{allAssignments.length} total across {courses.length} courses</p>
      </div>

      <AssignmentsList allAssignments={serialized} courseNameMap={courseNameMap} />
    </div>
  );
}
