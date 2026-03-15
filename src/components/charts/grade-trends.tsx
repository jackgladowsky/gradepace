"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  CartesianGrid,
  Cell,
} from "recharts";

const COURSE_COLORS = [
  "oklch(0.65 0.19 155)", // emerald
  "oklch(0.65 0.18 250)", // blue
  "oklch(0.70 0.16 75)",  // amber
  "oklch(0.65 0.20 25)",  // red
  "oklch(0.65 0.18 300)", // purple
  "oklch(0.65 0.15 200)", // cyan
  "oklch(0.65 0.18 30)",  // orange
  "oklch(0.65 0.15 340)", // pink
];

export interface GradedAssignment {
  name: string;
  date: string; // ISO date string
  scorePercent: number;
  score: number;
  pointsPossible: number;
}

export interface CourseTrendData {
  courseId: number;
  courseName: string;
  assignments: GradedAssignment[];
  runningAverages: { date: string; label: string; average: number }[];
  stats: {
    highest: number;
    lowest: number;
    average: number;
    trend: "improving" | "declining" | "stable";
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function trendLabel(trend: "improving" | "declining" | "stable") {
  if (trend === "improving") return "Improving";
  if (trend === "declining") return "Declining";
  return "Stable";
}

function trendColor(trend: "improving" | "declining" | "stable") {
  if (trend === "improving") return "text-emerald-600 dark:text-emerald-400";
  if (trend === "declining") return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function trendArrow(trend: "improving" | "declining" | "stable") {
  if (trend === "improving") return "\u2191";
  if (trend === "declining") return "\u2193";
  return "\u2192";
}

// -- Multi-Course Overlay Chart --

export function GradeTrendOverlay({ courses }: { courses: CourseTrendData[] }) {
  const [visible, setVisible] = useState<Set<number>>(
    () => new Set(courses.map((c) => c.courseId))
  );

  if (courses.length === 0) return null;

  // Build unified timeline data: merge all dates, for each date store the running average per course
  const allPoints: { date: string; dateMs: number; [key: string]: number | string }[] = [];
  const dateSet = new Set<string>();

  for (const course of courses) {
    for (const pt of course.runningAverages) {
      dateSet.add(pt.date);
    }
  }

  const sortedDates = Array.from(dateSet).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // For each date, fill in the latest running average for each course
  const latestAvg: Record<number, number> = {};
  const courseAvgMap: Record<number, Map<string, number>> = {};
  for (const course of courses) {
    courseAvgMap[course.courseId] = new Map();
    for (const pt of course.runningAverages) {
      courseAvgMap[course.courseId].set(pt.date, pt.average);
    }
  }

  for (const date of sortedDates) {
    const point: Record<string, number | string> = {
      date,
      dateMs: new Date(date).getTime(),
      label: formatDate(date),
    };
    for (const course of courses) {
      const val = courseAvgMap[course.courseId].get(date);
      if (val !== undefined) {
        latestAvg[course.courseId] = val;
      }
      if (latestAvg[course.courseId] !== undefined) {
        point[`course_${course.courseId}`] = latestAvg[course.courseId];
      }
    }
    allPoints.push(point as typeof allPoints[number]);
  }

  function toggleCourse(courseId: number) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 card-lift">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Grade Trends Over Time
      </h3>
      <p className="mb-4 text-[11px] text-muted-foreground">
        Running average grade % after each graded assignment
      </p>

      {/* Course toggles */}
      <div className="mb-4 flex flex-wrap gap-2">
        {courses.map((course, i) => {
          const color = COURSE_COLORS[i % COURSE_COLORS.length];
          const isVisible = visible.has(course.courseId);
          return (
            <button
              key={course.courseId}
              onClick={() => toggleCourse(course.courseId)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                isVisible
                  ? "border-border/80 bg-accent/50"
                  : "border-border/30 opacity-40"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {course.courseName}
            </button>
          );
        })}
      </div>

      {allPoints.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={allPoints}
            margin={{ left: -10, right: 10, top: 5, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              opacity={0.5}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={35}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
              labelStyle={{ color: "var(--foreground)", fontWeight: 500 }}
              formatter={(value: unknown, name: unknown) => {
                const v = typeof value === "number" ? value : 0;
                const n = typeof name === "string" ? name : "";
                const course = courses.find(
                  (c) => `course_${c.courseId}` === n
                );
                return [`${v.toFixed(1)}%`, course?.courseName ?? n];
              }}
            />
            {courses.map((course, i) => {
              if (!visible.has(course.courseId)) return null;
              return (
                <Line
                  key={course.courseId}
                  type="monotone"
                  dataKey={`course_${course.courseId}`}
                  stroke={COURSE_COLORS[i % COURSE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted-foreground">No graded assignments yet</p>
        </div>
      )}
    </div>
  );
}

// -- Grade Distribution (dot plot per course) --

export function GradeDistribution({ courses }: { courses: CourseTrendData[] }) {
  if (courses.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 card-lift">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Grade Distribution
      </h3>
      <p className="mb-4 text-[11px] text-muted-foreground">
        Individual assignment scores per course
      </p>
      <div className="space-y-6">
        {courses.map((course, ci) => {
          const color = COURSE_COLORS[ci % COURSE_COLORS.length];
          const data = course.assignments.map((a) => ({
            x: a.scorePercent,
            y: 1,
            name: a.name,
            score: a.score,
            possible: a.pointsPossible,
          }));

          if (data.length === 0) return null;

          return (
            <div key={course.courseId}>
              <p className="mb-2 text-xs font-medium">{course.courseName}</p>
              <ResponsiveContainer width="100%" height={60}>
                <ScatterChart margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={[0, 110]}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis dataKey="y" hide domain={[0, 2]} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                    formatter={(_: unknown, __: unknown, props: { payload?: { name: string; score: number; possible: number } }) => {
                      const p = props?.payload;
                      if (!p) return ["", ""];
                      return [`${p.score}/${p.possible}`, p.name];
                    }}
                  />
                  <Scatter data={data}>
                    {data.map((_, i) => (
                      <Cell key={i} fill={color} opacity={0.8} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- Stats Summary --

export function TrendStats({ courses }: { courses: CourseTrendData[] }) {
  if (courses.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 card-lift">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Performance Summary
      </h3>
      <div className="space-y-3">
        {courses.map((course, ci) => {
          const { stats } = course;
          const color = COURSE_COLORS[ci % COURSE_COLORS.length];

          return (
            <div
              key={course.courseId}
              className="flex items-center gap-4 rounded-lg border border-border/30 px-4 py-3"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{course.courseName}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    High{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {stats.highest.toFixed(1)}%
                    </span>
                  </span>
                  <span>
                    Low{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {stats.lowest.toFixed(1)}%
                    </span>
                  </span>
                  <span>
                    Avg{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {stats.average.toFixed(1)}%
                    </span>
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className={`text-xs font-medium ${trendColor(stats.trend)}`}>
                  {trendArrow(stats.trend)} {trendLabel(stats.trend)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
