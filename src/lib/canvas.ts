// Canvas API typed fetch wrappers

export interface CanvasProfile {
  id: number;
  name: string;
  short_name: string;
  avatar_url: string;
  primary_email: string;
}

export interface CanvasTerm {
  id: number;
  name: string;
  start_at: string | null;
  end_at: string | null;
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  enrollment_term_id: number;
  term?: CanvasTerm;
  enrollments?: {
    type: string;
    computed_current_score: number | null;
    computed_current_grade: string | null;
    computed_final_score: number | null;
    computed_final_grade: string | null;
  }[];
}

export interface CanvasSubmission {
  id: number;
  score: number | null;
  grade: string | null;
  submitted_at: string | null;
  workflow_state: string;
  late: boolean;
  missing: boolean;
}

export interface CanvasRubricCriterion {
  description: string;
  points: number;
  long_description?: string;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  points_possible: number | null;
  course_id: number;
  html_url: string;
  submission_types: string[];
  submission?: CanvasSubmission;
  rubric?: CanvasRubricCriterion[];
  has_submitted_submissions: boolean;
}

export interface CanvasEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  type: string;
  assignment?: {
    id: number;
    name: string;
    due_at: string;
  };
}

class CanvasAPIError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "CanvasAPIError";
  }
}

async function canvasFetch<T>(
  canvasUrl: string,
  token: string,
  path: string
): Promise<T> {
  // Normalize URL: remove trailing slash, ensure /api/v1 prefix
  const base = canvasUrl.replace(/\/+$/, "");
  const url = `${base}/api/v1${path}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 0 }, // always fresh
  });

  if (!res.ok) {
    throw new CanvasAPIError(
      res.status,
      `Canvas API error: ${res.status} ${res.statusText}`
    );
  }

  return res.json();
}

export async function validateToken(
  canvasUrl: string,
  token: string
): Promise<CanvasProfile> {
  return canvasFetch<CanvasProfile>(canvasUrl, token, "/users/self/profile");
}

export async function getCourses(
  canvasUrl: string,
  token: string
): Promise<CanvasCourse[]> {
  return canvasFetch<CanvasCourse[]>(
    canvasUrl,
    token,
    "/courses?enrollment_state=active&include[]=total_scores&include[]=term&per_page=50"
  );
}

export async function getAssignments(
  canvasUrl: string,
  token: string,
  courseId: number
): Promise<CanvasAssignment[]> {
  return canvasFetch<CanvasAssignment[]>(
    canvasUrl,
    token,
    `/courses/${courseId}/assignments?include[]=submission&include[]=rubric&order_by=due_at&per_page=100`
  );
}

export async function getUpcomingEvents(
  canvasUrl: string,
  token: string
): Promise<CanvasEvent[]> {
  return canvasFetch<CanvasEvent[]>(
    canvasUrl,
    token,
    "/users/self/upcoming_events"
  );
}

// Fetch a single assignment by ID (needs course context)
export async function getAssignment(
  canvasUrl: string,
  token: string,
  courseId: number,
  assignmentId: number
): Promise<CanvasAssignment> {
  return canvasFetch<CanvasAssignment>(
    canvasUrl,
    token,
    `/courses/${courseId}/assignments/${assignmentId}?include[]=submission&include[]=rubric`
  );
}
