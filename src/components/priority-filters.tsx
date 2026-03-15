"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface PriorityFiltersProps {
  courses: { id: number; name: string }[];
}

export function PriorityFilters({ courses }: PriorityFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const courseFilter = searchParams.get("course") || "all";
  const hideSubmitted = searchParams.get("hideSubmitted") === "true";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "false") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={courseFilter}
        onChange={(e) => updateParams("course", e.target.value)}
        className="h-8 rounded-lg border border-border/50 bg-card px-2.5 text-xs text-foreground outline-none transition-colors focus:border-ring"
      >
        <option value="all">All courses</option>
        {courses.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.name}
          </option>
        ))}
      </select>

      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={hideSubmitted}
          onChange={(e) =>
            updateParams("hideSubmitted", e.target.checked ? "true" : "false")
          }
          className="h-3.5 w-3.5 rounded border-border accent-foreground"
        />
        Hide submitted
      </label>
    </div>
  );
}
