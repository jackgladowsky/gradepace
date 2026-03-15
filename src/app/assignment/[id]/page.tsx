import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getAssignment, getCourses } from "@/lib/canvas";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import AnalyzeButton from "./analyze-button";

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return "No due date";
  return new Date(dueAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { id } = await params;
  const { courseId: courseIdParam } = await searchParams;
  const assignmentId = parseInt(id, 10);
  const courseId = parseInt(courseIdParam || "0", 10);

  const session = await getSession();
  if (!session.canvasToken || !session.canvasUrl) {
    redirect("/connect");
  }

  if (!courseId) {
    redirect("/");
  }

  const { canvasUrl, canvasToken } = session;

  const [assignment, courses] = await Promise.all([
    getAssignment(canvasUrl, canvasToken, courseId, assignmentId),
    getCourses(canvasUrl, canvasToken),
  ]);

  const course = courses.find((c) => c.id === courseId);
  const courseName = course?.name || "Unknown Course";
  const sub = assignment.submission;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <Link href={`/course/${courseId}`} className="text-muted-foreground transition-colors hover:text-foreground">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <span className="text-sm text-muted-foreground">{courseName}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Title Block */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{assignment.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              {formatDueDate(assignment.due_at)}
            </span>
            {assignment.points_possible != null && (
              <span className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                {assignment.points_possible} points
              </span>
            )}
            {sub?.score != null && (
              <Badge variant="default" className="rounded-lg px-2.5 py-1 text-xs">
                Score: {sub.score}/{assignment.points_possible}
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {assignment.description && (
          <section className="mb-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h2>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div
                className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-sm prose-headings:font-semibold prose-p:text-sm prose-p:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: assignment.description }}
              />
            </div>
          </section>
        )}

        {/* Rubric */}
        {assignment.rubric && assignment.rubric.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rubric</h2>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {assignment.rubric.map((criterion, i) => (
                <div key={i} className={`flex items-start justify-between gap-4 px-5 py-3 ${i > 0 ? "border-t" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{criterion.description}</p>
                    {criterion.long_description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{criterion.long_description}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium tabular-nums text-secondary-foreground">
                    {criterion.points} pts
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI Analyze */}
        <section className="mb-6">
          <AnalyzeButton
            assignmentId={assignment.id}
            courseId={courseId}
            courseName={courseName}
            assignmentName={assignment.name}
            dueAt={assignment.due_at}
            pointsPossible={assignment.points_possible}
            description={assignment.description}
            rubric={assignment.rubric}
          />
        </section>

        {/* Canvas Link */}
        <a
          href={assignment.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Open in Canvas
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </main>
    </div>
  );
}
