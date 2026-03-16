"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export interface WeekBucket {
  label: string;
  count: number;
}

export function WorkloadChart({ data }: { data: WeekBucket[] }) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Weekly Workload</h3>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ left: -10, right: 5, top: 5, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={24}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.5 }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 11,
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 500 }}
            itemStyle={{ color: "var(--muted-foreground)" }}
            formatter={(value) => [`${value} assignment${value !== 1 ? "s" : ""}`, "Due"]}
          />
          <Bar
            dataKey="count"
            fill="var(--primary)"
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
