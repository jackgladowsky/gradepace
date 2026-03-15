interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}

function StatCard({ label, value, sub, alert }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${alert ? "text-red-600 dark:text-red-400" : ""}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export interface StatsRowProps {
  averageGrade: number | null;
  letterGrade: string | null;
  completedCount: number;
  totalCount: number;
  dueThisWeek: number;
  missingCount: number;
}

export function StatsRow({ averageGrade, letterGrade, completedCount, totalCount, dueThisWeek, missingCount }: StatsRowProps) {
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Average Grade"
        value={averageGrade != null ? `${averageGrade}%` : "--"}
        sub={letterGrade ?? undefined}
      />
      <StatCard
        label="Completed"
        value={`${completedCount}/${totalCount}`}
        sub={`${completionPct}% done`}
      />
      <StatCard
        label="Due This Week"
        value={String(dueThisWeek)}
      />
      <StatCard
        label="Missing"
        value={String(missingCount)}
        alert={missingCount > 0}
      />
    </div>
  );
}
