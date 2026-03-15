import { getSession } from "@/lib/session";
import { getCourses, getAssignments, type CanvasAssignment } from "@/lib/canvas";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PriorityFilters } from "@/components/priority-filters";

function cleanCourseName(name: string) {
  return name
    .replace(/\s*\[.*?\]\s*/g, "")
    .replace(/\s*SEC\s+\S+/gi, "")
    .replace(/\s+(Spring|Fall|Summer|Winter)\s+\d{4}/gi, "")
    .replace(/\s+\d{5}\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compute a 0-100 priority score for an unsubmitted assignment. */
function computePriorityScore(assignment: CanvasAssignment): number {
  const sub = assignment.submission;

  // Missing assignments always get max priority
  if (sub?.missing) return 100;

  // Already submitted => 0 priority
  if (sub?.submitted_at || sub?.workflow_state === "graded") return 0;

  // Time urgency (exponential decay)
  let urgency = 0;
  if (assignment.due_at) {
    const now = Date.now();
    const due = new Date(assignment.due_at).getTime();
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);

    if (hoursUntilDue <= 0) {
      // Past due but not marked missing — still urgent
      urgency = 95;
    } else if (hoursUntilDue <= 24) {
      urgency = 90;
    } else if (hoursUntilDue <= 72) {
      // 24-72 hours: linear from 90 to 70
      urgency = 90 - ((hoursUntilDue - 24) / 48) * 20;
    } else if (hoursUntilDue <= 168) {
      // 3-7 days: linear from 70 to 40
      urgency = 70 - ((hoursUntilDue - 72) / 96) * 30;
    } else if (hoursUntilDue <= 336) {
      // 1-2 weeks: linear from 40 to 20
      urgency = 40 - ((hoursUntilDue - 168) / 168) * 20;
    } else {
      // > 2 weeks: low urgency, floor at 5
      urgency = Math.max(5, 20 - ((hoursUntilDue - 336) / 336) * 15);
    }
  } else {
    // No due date — low priority
    urgency = 10;
  }

  // Points boost (0-10 points of boost for high-value assignments)
  const points = assignment.points_possible ?? 0;
  const pointsBoost = Math.min(10, (points / 100) * 10);

  return Math.min(100, Math.round(urgency + pointsBoost));
}

function getPriorityColor(score: number) {
  if (score >= 80) return { bg: "bg-red-500", text: "text-red-600 dark:text-red-400", ring: "border-red-500/30", label: "Urgent" };
  if (score >= 60) return { bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", ring: "border-orange-500/30", label: "Soon" };
  if (score >= 35) return { bg: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400", ring: "border-yellow-500/20", label: "Moderate" };
  return { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", ring: "border-emerald-500/20", label: "Low" };
}

function formatRelativeTime(dueAt: string | null) {
  if (!dueAt) return "No due date";
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const diff = due - now;
  const absDiff = Math.abs(diff);
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    if (days === 0) return `${hours}h overdue`;
    return `${days}d overdue`;
  }
  if (hours < 1) return "< 1 hour";
  if (hours < 24) return `in ${hours}h`;
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return "No due date";
  const date = new Date(dueAt);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Compute what fraction of time has elapsed from now until due. 0 = just assigned, 1 = due now. Capped at 1. */
function timeRemainingPct(dueAt: string | null): number {
  if (!dueAt) return 0;
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const diff = due - now;
  if (diff <= 0) return 100;
  // Use a 14-day window as "full range"
  const maxWindow = 14 * 24 * 60 * 60 * 1000;
  const elapsed = maxWindow - Math.min(diff, maxWindow);
  return Math.round((elapsed / maxWindow) * 100);
}

interface PriorityAssignment extends CanvasAssignment {
  priorityScore: number;
  isSubmitted: boolean;
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

  const courseNameMap = new Map<number, string>();
  courses.forEach((c) => courseNameMap.set(c.id, cleanCourseName(c.name)));

  const assignmentArrays = await Promise.all(
    courses.map((c) => getAssignments(canvasUrl!, canvasToken!, c.id).catch(() => [] as CanvasAssignment[]))
  );
  const allAssignments = assignmentArrays.flat();

  // Score and tag all assignments
  const scored: PriorityAssignment[] = allAssignments.map((a) => {
    const sub = a.submission;
    const isSubmitted = !!(sub?.submitted_at || sub?.workflow_state === "graded");
    return {
      ...a,
      priorityScore: computePriorityScore(a),
      isSubmitted,
    };
  });

  // Apply filters
  const courseFilter = params.course;
  const hideSubmitted = params.hideSubmitted === "true";

  let filtered = scored;
  if (courseFilter && courseFilter !== "all") {
    const cid = Number(courseFilter);
    filtered = filtered.filter((a) => a.course_id === cid);
  }
  if (hideSubmitted) {
    filtered = filtered.filter((a) => !a.isSubmitted);
  }

  // Sort: unsubmitted first (by score desc), then submitted at bottom
  const unsubmitted = filtered
    .filter((a) => !a.isSubmitted)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const submitted = filtered
    .filter((a) => a.isSubmitted)
    .sort((a, b) => {
      // Sort submitted by most recently due first
      if (!a.due_at && !b.due_at) return 0;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(b.due_at).getTime() - new Date(a.due_at).getTime();
    });

  const courseList = courses.map((c) => ({ id: c.id, name: courseNameMap.get(c.id) || c.name }));
  const urgentCount = unsubmitted.filter((a) => a.priorityScore >= 80).length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Priorities</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {unsubmitted.length} pending{urgentCount > 0 ? ` \u00b7 ${urgentCount} urgent` : ""}
        </p>
      </div>

      <div className="mb-6">
        <PriorityFilters courses={courseList} />
      </div>

      {/* Unsubmitted priority list */}
      {unsubmitted.length === 0 && submitted.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">No assignments to show.</p>
        </div>
      ) : (
        <>
          {unsubmitted.length > 0 && (
            <section className="mb-8">
              <div className="space-y-2.5">
                {unsubmitted.map((assignment) => {
                  const color = getPriorityColor(assignment.priorityScore);
                  const courseName = courseNameMap.get(assignment.course_id) || "";
                  const relTime = formatRelativeTime(assignment.due_at);
                  const dueDateStr = formatDueDate(assignment.due_at);
                  const timePct = timeRemainingPct(assignment.due_at);

                  return (
                    <Link
                      key={assignment.id}
                      href={`/assignment/${assignment.id}?courseId=${assignment.course_id}`}
                    >
                      <div
                        className={`group rounded-xl border ${color.ring} bg-card px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:bg-accent/30 dark:shadow-none`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Priority indicator */}
                          <div className="flex flex-col items-center gap-1 pt-0.5">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-lg ${color.bg}/10`}
                            >
                              <span className={`text-sm font-bold tabular-nums ${color.text}`}>
                                {assignment.priorityScore}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium">
                                {assignment.name}
                              </p>
                              {assignment.submission?.missing && (
                                <Badge
                                  variant="destructive"
                                  className="h-auto shrink-0 py-0 text-[10px]"
                                >
                                  Missing
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {courseName}
                            </p>

                            {/* Time remaining bar */}
                            <div className="mt-2.5 flex items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full transition-all ${color.bg}`}
                                  style={{ width: `${timePct}%` }}
                                />
                              </div>
                              <span className={`shrink-0 text-[11px] font-medium ${color.text}`}>
                                {relTime}
                              </span>
                            </div>
                          </div>

                          {/* Right side info */}
                          <div className="shrink-0 text-right">
                            <p className="text-[11px] text-muted-foreground">{dueDateStr}</p>
                            {assignment.points_possible != null && (
                              <p className="text-[11px] text-muted-foreground">
                                {assignment.points_possible} pts
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Submitted section */}
          {!hideSubmitted && submitted.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Submitted
                </h2>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                  {submitted.length}
                </span>
              </div>
              <div className="rounded-xl border border-border/50 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
                {submitted.map((assignment, i) => {
                  const courseName = courseNameMap.get(assignment.course_id) || "";
                  const sub = assignment.submission;
                  const isGraded = sub?.workflow_state === "graded";
                  return (
                    <Link
                      key={assignment.id}
                      href={`/assignment/${assignment.id}?courseId=${assignment.course_id}`}
                    >
                      <div
                        className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/30 ${
                          i > 0 ? "border-t border-border/50" : ""
                        }`}
                      >
                        {/* Checkmark */}
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10">
                          <svg
                            className="h-3 w-3 text-emerald-600 dark:text-emerald-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m4.5 12.75 6 6 9-13.5"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-muted-foreground">
                              {assignment.name}
                            </p>
                            {isGraded && (
                              <span className="shrink-0 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                Graded
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{courseName}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          {sub?.score != null ? (
                            <p className="text-xs font-medium tabular-nums">
                              {sub.score}
                              <span className="font-normal text-muted-foreground">
                                /{assignment.points_possible}
                              </span>
                            </p>
                          ) : assignment.points_possible != null ? (
                            <p className="text-[11px] text-muted-foreground">
                              {assignment.points_possible} pts
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
