"use client";

import { useState, useMemo, useCallback } from "react";
import type { CanvasAssignment } from "@/lib/canvas";

const LETTER_GRADES = [
  { label: "A", min: 93 },
  { label: "A-", min: 90 },
  { label: "B+", min: 87 },
  { label: "B", min: 83 },
  { label: "B-", min: 80 },
  { label: "C+", min: 77 },
  { label: "C", min: 73 },
] as const;

interface AssignmentOverride {
  id: number;
  score: number | null; // null means "use calculated average"
}

interface GradeGoalCalculatorProps {
  assignments: CanvasAssignment[];
  currentScore: number | null;
  courseName: string;
}

function getDifficultyColor(pct: number) {
  if (pct <= 85) return "text-emerald-600 dark:text-emerald-400";
  if (pct <= 95) return "text-amber-600 dark:text-amber-400";
  return "text-red-500";
}

function getDifficultyBg(pct: number) {
  if (pct <= 85) return "bg-emerald-500";
  if (pct <= 95) return "bg-amber-500";
  return "bg-red-500";
}

function getDifficultyLabel(pct: number) {
  if (pct < 0) return "Impossible";
  if (pct <= 70) return "Very achievable";
  if (pct <= 85) return "Achievable";
  if (pct <= 95) return "Challenging";
  if (pct <= 100) return "Very difficult";
  return "Impossible";
}

export function GradeGoalCalculator({
  assignments,
  currentScore,
  courseName,
}: GradeGoalCalculatorProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>("A");
  const [overrides, setOverrides] = useState<AssignmentOverride[]>([]);

  const targetPct = LETTER_GRADES.find((g) => g.label === selectedGrade)?.min ?? 93;

  // Separate graded and ungraded assignments
  const { graded, ungraded, earnedPoints, gradedPossible } = useMemo(() => {
    const graded: CanvasAssignment[] = [];
    const ungraded: CanvasAssignment[] = [];
    let earnedPoints = 0;
    let gradedPossible = 0;

    for (const a of assignments) {
      if (a.points_possible == null || a.points_possible === 0) continue;
      const sub = a.submission;
      if (sub?.workflow_state === "graded" && sub.score != null) {
        graded.push(a);
        earnedPoints += sub.score;
        gradedPossible += a.points_possible;
      } else {
        ungraded.push(a);
      }
    }

    return { graded, ungraded, earnedPoints, gradedPossible };
  }, [assignments]);

  const totalPossible = useMemo(
    () =>
      assignments.reduce((sum, a) => sum + (a.points_possible ?? 0), 0),
    [assignments]
  );

  const remainingPoints = useMemo(
    () => ungraded.reduce((sum, a) => sum + (a.points_possible ?? 0), 0),
    [ungraded]
  );

  // Calculate how overrides affect remaining non-overridden assignments
  const calculation = useMemo(() => {
    const overrideMap = new Map(overrides.map((o) => [o.id, o.score]));

    // Points already "locked in" from overrides
    let overriddenPoints = 0;
    let overriddenPossible = 0;
    const freeAssignments: CanvasAssignment[] = [];

    for (const a of ungraded) {
      const overrideScore = overrideMap.get(a.id);
      if (overrideScore != null) {
        overriddenPoints += overrideScore;
        overriddenPossible += a.points_possible!;
      } else {
        freeAssignments.push(a);
      }
    }

    const freePoints = freeAssignments.reduce(
      (sum, a) => sum + (a.points_possible ?? 0),
      0
    );

    // target_score = (target_pct/100 * total_possible - earned - overridden) / free_points
    const neededTotal = (targetPct / 100) * totalPossible;
    const alreadyHave = earnedPoints + overriddenPoints;
    const neededFromFree = neededTotal - alreadyHave;

    let neededPct: number;
    if (freePoints === 0) {
      neededPct = alreadyHave >= neededTotal ? 0 : Infinity;
    } else {
      neededPct = (neededFromFree / freePoints) * 100;
    }

    const impossible = neededPct > 100;
    const alreadyAchieved = neededPct <= 0;

    return {
      neededPct,
      impossible,
      alreadyAchieved,
      freeAssignments,
      freePoints,
      neededFromFree,
    };
  }, [targetPct, totalPossible, earnedPoints, ungraded, overrides]);

  const handleOverride = useCallback((id: number, value: string, pointsPossible: number) => {
    if (value === "") {
      setOverrides((prev) => prev.filter((o) => o.id !== id));
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const clamped = Math.max(0, Math.min(num, pointsPossible));
    setOverrides((prev) => {
      const existing = prev.findIndex((o) => o.id === id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { id, score: clamped };
        return next;
      }
      return [...prev, { id, score: clamped }];
    });
  }, []);

  const getOverrideValue = useCallback(
    (id: number) => {
      const o = overrides.find((o) => o.id === id);
      return o?.score ?? null;
    },
    [overrides]
  );

  if (ungraded.length === 0) return null;

  const gaugeWidth = Math.max(0, Math.min(100, calculation.neededPct));

  return (
    <section className="mb-10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="mb-3 flex w-full items-center justify-between text-left"
      >
        <h2 className="text-sm font-semibold">What Do I Need?</h2>
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="rounded-xl border border-border/50 bg-card card-lift">
          {/* Target grade selector */}
          <div className="border-b border-border/50 px-4 py-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Target Grade</p>
            <div className="flex flex-wrap gap-1.5">
              {LETTER_GRADES.map((g) => (
                <button
                  key={g.label}
                  onClick={() => setSelectedGrade(g.label)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedGrade === g.label
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Targeting {targetPct}% or above
            </p>
          </div>

          {/* Result summary */}
          <div className="border-b border-border/50 px-4 py-4">
            {calculation.alreadyAchieved ? (
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  You've already achieved this grade!
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Even scoring 0 on remaining work, your current points are enough for{" "}
                  {selectedGrade}.
                </p>
              </div>
            ) : calculation.impossible ? (
              <div>
                <p className="text-sm font-medium text-red-500">
                  This grade is not achievable
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You would need {calculation.neededPct.toFixed(1)}% on remaining assignments,
                  which exceeds the maximum possible score.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-semibold tabular-nums ${getDifficultyColor(calculation.neededPct)}`}
                  >
                    {calculation.neededPct.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    needed on remaining work
                  </span>
                </div>
                <p
                  className={`mt-1 text-xs font-medium ${getDifficultyColor(calculation.neededPct)}`}
                >
                  {getDifficultyLabel(calculation.neededPct)}
                </p>

                {/* Gauge */}
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getDifficultyBg(calculation.neededPct)}`}
                      style={{ width: `${gaugeWidth}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Earned</p>
                <p className="text-sm font-medium tabular-nums">
                  {earnedPoints}/{gradedPossible}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Remaining</p>
                <p className="text-sm font-medium tabular-nums">
                  {remainingPoints} pts
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Total</p>
                <p className="text-sm font-medium tabular-nums">
                  {totalPossible} pts
                </p>
              </div>
            </div>
          </div>

          {/* Per-assignment breakdown */}
          <div className="px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Per-Assignment Breakdown
            </p>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Override individual scores to see how it affects the rest.
            </p>
            <div className="space-y-0">
              {ungraded.map((a, i) => {
                const pts = a.points_possible!;
                const overrideVal = getOverrideValue(a.id);
                const neededScore =
                  overrideVal != null
                    ? overrideVal
                    : calculation.alreadyAchieved
                      ? 0
                      : calculation.impossible
                        ? pts
                        : Math.min(pts, Math.max(0, (calculation.neededPct / 100) * pts));
                const isOverridden = overrideVal != null;

                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 py-2 ${i > 0 ? "border-t border-border/30" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{pts} pts possible</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`text-sm tabular-nums ${
                          isOverridden
                            ? "font-medium text-blue-600 dark:text-blue-400"
                            : calculation.impossible
                              ? "text-red-500"
                              : getDifficultyColor(calculation.neededPct)
                        }`}
                      >
                        {neededScore.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">/</span>
                      <input
                        type="number"
                        min={0}
                        max={pts}
                        step={0.5}
                        placeholder="--"
                        value={overrideVal ?? ""}
                        onChange={(e) => handleOverride(a.id, e.target.value, pts)}
                        className="h-7 w-16 rounded-md border border-input bg-transparent px-2 text-right text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {overrides.length > 0 && (
              <button
                onClick={() => setOverrides([])}
                className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear all overrides
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
