"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export interface CompletionData {
  submitted: number;
  graded: number;
  missing: number;
  late: number;
  notYetDue: number;
}

const SEGMENTS = [
  { key: "graded", label: "Graded", color: "oklch(0.65 0.19 155)" },
  { key: "submitted", label: "Submitted", color: "oklch(0.65 0.18 250)" },
  { key: "late", label: "Late", color: "oklch(0.70 0.16 75)" },
  { key: "missing", label: "Missing", color: "oklch(0.65 0.20 25)" },
  { key: "notYetDue", label: "Not yet due", color: "var(--muted)" },
] as const;

export function CompletionRing({ data, completionPct }: { data: CompletionData; completionPct: number }) {
  const chartData = SEGMENTS
    .map((s) => ({ name: s.label, value: data[s.key], color: s.color }))
    .filter((d) => d.value > 0);

  if (chartData.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignment Completion</h3>
      <div className="flex items-center gap-6">
        <div className="relative h-[140px] w-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tabular-nums">{completionPct}%</span>
            <span className="text-[10px] text-muted-foreground">done</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-muted-foreground">{d.name}</span>
              <span className="text-xs font-medium tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
