import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getCourses } from "@/lib/canvas";
import { NotesEditor } from "@/components/notes-editor";

function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*SEC\s+\S+/gi, "")
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "")
    .replace(/\s+\d{5}\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function NotesPage() {
  const session = await getSession();
  if (!session.canvasToken || !session.canvasUrl) {
    redirect("/connect");
  }

  const { canvasUrl, canvasToken } = session;

  let courses: { id: number; name: string }[] = [];
  try {
    const allCourses = await getCourses(canvasUrl, canvasToken);
    const withEnrollments = allCourses.filter(
      (c) => c.enrollments && c.enrollments.length > 0
    );
    const maxTermId = Math.max(
      ...withEnrollments.map((c) => c.enrollment_term_id || 0)
    );
    courses = withEnrollments
      .filter((c) => c.enrollment_term_id === maxTermId)
      .map((c) => ({ id: c.id, name: cleanCourseName(c.name) }));
  } catch {
    // If courses fail to load, we still show the notes page
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Notes</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Quick notes across all your courses
        </p>
      </div>

      <NotesEditor courses={courses} />
    </div>
  );
}
