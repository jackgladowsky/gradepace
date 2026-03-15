import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getCourses } from "@/lib/canvas";
import { SidebarLayout } from "@/components/sidebar";

/** Strip Canvas noise from course names */
function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*SEC\s+\S+/gi, "")
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "")
    .replace(/\s+\d{5}\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.canvasToken || !session.canvasUrl) {
    redirect("/connect");
  }

  const { canvasUrl, canvasToken, userName } = session;

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
    // If courses fail to load, sidebar will just be empty
  }

  return (
    <SidebarLayout courses={courses} userName={userName ?? null}>
      {children}
    </SidebarLayout>
  );
}
