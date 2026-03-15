"use client";

import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, LabelList } from "recharts";

function gradeColor(score: number | null) {
  if (score == null) return "var(--muted-foreground)";
  if (score >= 90) return "oklch(0.65 0.19 155)"; // emerald
  if (score >= 80) return "oklch(0.65 0.18 250)"; // blue
  if (score >= 70) return "oklch(0.70 0.16 75)";  // amber
  return "oklch(0.65 0.20 25)"; // red
}

export interface CourseGradeData {
  name: string;
  score: number;
  courseId: number;
}

export function GradeBars({ data }: { data: CourseGradeData[] }) {
  if (data.length === 0) return null;

  const chartHeight = Math.max(data.length * 44, 120);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 card-lift">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course Grades</h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 12, fill: "var(--foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((entry, i) => (
              <Cell key={i} fill={gradeColor(entry.score)} />
            ))}
            <LabelList
              dataKey="score"
              position="right"
              formatter={(v) => `${v}%`}
              style={{ fontSize: 12, fill: "var(--muted-foreground)", fontWeight: 500 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
