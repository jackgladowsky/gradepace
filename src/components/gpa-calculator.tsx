"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import type { CourseGradeInfo } from "@/app/(dashboard)/gpa/page";

const LETTER_GRADES = [
  "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F",
] as const;

const GRADE_POINTS: Record<string, number> = {
  "A": 4.0,
  "A-": 3.7,
  "B+": 3.3,
  "B": 3.0,
  "B-": 2.7,
  "C+": 2.3,
  "C": 2.0,
  "C-": 1.7,
  "D+": 1.3,
  "D": 1.0,
  "F": 0.0,
};

function getGradeColor(letterGrade: string | null) {
  if (!letterGrade) return "text-muted-foreground";
  if (letterGrade.startsWith("A")) return "text-emerald-600 dark:text-emerald-400";
  if (letterGrade.startsWith("B")) return "text-blue-600 dark:text-blue-400";
  if (letterGrade.startsWith("C")) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function computeGpa(
  courses: CourseGradeInfo[],
  credits: Record<number, number>,
  gradeOverrides: Record<number, string>
) {
  let totalPoints = 0;
  let totalCredits = 0;

  for (const course of courses) {
    const letterGrade = gradeOverrides[course.id] || course.letterGrade;
    if (!letterGrade || !(letterGrade in GRADE_POINTS)) continue;

    const creditHours = credits[course.id] ?? 3;
    totalPoints += GRADE_POINTS[letterGrade] * creditHours;
    totalCredits += creditHours;
  }

  if (totalCredits === 0) return null;
  return totalPoints / totalCredits;
}

const STORAGE_KEY = "studyhub-gpa-credits";

interface GpaCalculatorProps {
  courses: CourseGradeInfo[];
}

export function GpaCalculator({ courses }: GpaCalculatorProps) {
  const [credits, setCredits] = useState<Record<number, number>>({});
  const [whatIfGrades, setWhatIfGrades] = useState<Record<number, string>>({});
  const [mounted, setMounted] = useState(false);

  // Load credit hours from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCredits(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  // Persist credit hours to localStorage
  const updateCredits = useCallback(
    (courseId: number, value: number) => {
      setCredits((prev) => {
        const next = { ...prev, [courseId]: value };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    []
  );

  const currentGpa = computeGpa(courses, credits, {});
  const whatIfGpa = computeGpa(courses, credits, whatIfGrades);

  const hasWhatIf = Object.values(whatIfGrades).some((v) => v !== "");
  const gpaDiff = currentGpa != null && whatIfGpa != null && hasWhatIf
    ? whatIfGpa - currentGpa
    : null;

  if (!mounted) {
    // Avoid hydration mismatch from localStorage
    return null;
  }

  return (
    <>
      {/* Current GPA card */}
      <div className="mb-6 rounded-xl border border-border/50 bg-card px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Current GPA
            </p>
            <span className="text-3xl font-semibold tabular-nums text-foreground">
              {currentGpa != null ? currentGpa.toFixed(2) : "--"}
            </span>
          </div>
          {hasWhatIf && (
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">
                What-If GPA
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums text-foreground">
                  {whatIfGpa != null ? whatIfGpa.toFixed(2) : "--"}
                </span>
                {gpaDiff != null && (
                  <span
                    className={`text-sm font-medium tabular-nums ${
                      gpaDiff > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : gpaDiff < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {gpaDiff > 0 ? "+" : ""}
                    {gpaDiff.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Course list */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Courses
        </h2>
        <div className="rounded-xl border border-border/50 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
          {courses.map((course, i) => {
            const effectiveGrade =
              whatIfGrades[course.id] || course.letterGrade;
            const gradePoints =
              effectiveGrade && effectiveGrade in GRADE_POINTS
                ? GRADE_POINTS[effectiveGrade]
                : null;
            const creditHours = credits[course.id] ?? 3;

            return (
              <div
                key={course.id}
                className={`px-5 py-4 ${
                  i > 0 ? "border-t border-border/50" : ""
                }`}
              >
                {/* Course name + current grade */}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {course.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${getGradeColor(
                          course.letterGrade
                        )}`}
                      >
                        {course.letterGrade ?? "--"}
                      </span>
                      {course.score != null && (
                        <span className="text-xs text-muted-foreground">
                          ({course.score}%)
                        </span>
                      )}
                      {gradePoints != null && (
                        <span className="text-xs text-muted-foreground">
                          {gradePoints.toFixed(1)} pts
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-3">
                  {/* Credit hours */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-muted-foreground whitespace-nowrap">
                      Credits
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={6}
                      value={creditHours}
                      onChange={(e) =>
                        updateCredits(
                          course.id,
                          Math.max(1, Math.min(6, parseInt(e.target.value) || 3))
                        )
                      }
                      className="h-7 w-14 px-2 text-xs tabular-nums"
                    />
                  </div>

                  {/* What-if grade selector */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-muted-foreground whitespace-nowrap">
                      What-if
                    </label>
                    <select
                      value={whatIfGrades[course.id] ?? ""}
                      onChange={(e) =>
                        setWhatIfGrades((prev) => ({
                          ...prev,
                          [course.id]: e.target.value,
                        }))
                      }
                      className="h-7 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    >
                      <option value="">Current</option>
                      {LETTER_GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g} ({GRADE_POINTS[g].toFixed(1)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Reset button */}
      {hasWhatIf && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setWhatIfGrades({})}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Reset what-if grades
          </button>
        </div>
      )}
    </>
  );
}
