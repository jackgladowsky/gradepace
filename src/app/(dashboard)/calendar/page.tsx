import { getSession } from "@/lib/session";
import { getCourses, getAssignments, type CanvasAssignment } from "@/lib/canvas";
import { WeekCalendar, type CalendarAssignment } from "@/components/week-calendar";

function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*SEC\s+\S+/gi, "")
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "")
    .replace(/\s+\d{5}\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function CalendarPage() {
  const session = await getSession();
  const { canvasUrl, canvasToken } = session;

  const allCourses = await getCourses(canvasUrl!, canvasToken!);
  const coursesWithEnrollments = allCourses.filter((c) => c.enrollments && c.enrollments.length > 0);
  const maxTermId = Math.max(...coursesWithEnrollments.map((c) => c.enrollment_term_id || 0));
  const courses = coursesWithEnrollments.filter((c) => c.enrollment_term_id === maxTermId);

  const courseMap: Record<number, string> = {};
  courses.forEach((c) => {
    courseMap[c.id] = cleanCourseName(c.name);
  });

  const allAssignmentsArrays = await Promise.all(
    courses.map((c) => getAssignments(canvasUrl!, canvasToken!, c.id).catch(() => [] as CanvasAssignment[]))
  );

  const assignments: CalendarAssignment[] = allAssignmentsArrays.flat().map((a) => ({
    id: a.id,
    name: a.name,
    due_at: a.due_at,
    points_possible: a.points_possible,
    course_id: a.course_id,
    submission: a.submission
      ? {
          submitted_at: a.submission.submitted_at,
          workflow_state: a.submission.workflow_state,
          late: a.submission.late,
          missing: a.submission.missing,
        }
      : undefined,
  }));

  return <WeekCalendar assignments={assignments} courseMap={courseMap} />;
}
