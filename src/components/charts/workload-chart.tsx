"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export interface WeekBucket {
  label: string;
  count: number;
}

export function WorkloadChart({ data }: { data: WeekBucket[] }) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Workload</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.5 }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 500 }}
            itemStyle={{ color: "var(--muted-foreground)" }}
            formatter={(value) => [`${value} assignment${value !== 1 ? "s" : ""}`, "Due"]}
          />
          <Bar
            dataKey="count"
            fill="var(--primary)"
            radius={[6, 6, 0, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
