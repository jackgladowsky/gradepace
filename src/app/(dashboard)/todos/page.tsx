"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  type ChecklistItem,
  getChecklistFromStorage,
  getAllChecklistMeta,
} from "@/components/assignment-checklist";

interface AssignmentChecklist {
  assignmentId: number;
  courseId: number;
  courseName: string;
  assignmentName: string;
  dueAt: string | null;
  items: ChecklistItem[];
}

function formatDueDate(dueAt: string | null) {
  if (!dueAt) return null;
  return new Date(dueAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TodosPage() {
  const [checklists, setChecklists] = useState<AssignmentChecklist[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const loadChecklists = useCallback(() => {
    const meta = getAllChecklistMeta();
    const result: AssignmentChecklist[] = [];

    for (const [assignmentId, info] of Object.entries(meta)) {
      const items = getChecklistFromStorage(Number(assignmentId));
      if (items.length > 0) {
        result.push({
          assignmentId: Number(assignmentId),
          courseId: info.courseId,
          courseName: info.courseName,
          assignmentName: info.assignmentName,
          dueAt: info.dueAt,
          items,
        });
      }
    }

    // Sort: assignments with incomplete items first, then by due date
    result.sort((a, b) => {
      const aIncomplete = a.items.some((it) => !it.done);
      const bIncomplete = b.items.some((it) => !it.done);
      if (aIncomplete !== bIncomplete) return aIncomplete ? -1 : 1;
      if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return 0;
    });

    setChecklists(result);
  }, []);

  useEffect(() => {
    loadChecklists();
  }, [loadChecklists]);

  const toggleItem = useCallback(
    (assignmentId: number, itemId: string) => {
      // Update localStorage directly
      const items = getChecklistFromStorage(assignmentId);
      const updated = items.map((it) =>
        it.id === itemId ? { ...it, done: !it.done } : it
      );
      localStorage.setItem(
        `studyhub_checklist_${assignmentId}`,
        JSON.stringify(updated)
      );
      loadChecklists();
    },
    [loadChecklists]
  );

  // Get unique course names for filtering
  const courseNames = Array.from(new Set(checklists.map((c) => c.courseName))).sort();

  const filtered =
    courseFilter === "all"
      ? checklists
      : checklists.filter((c) => c.courseName === courseFilter);

  // Group by course
  const grouped: Record<string, AssignmentChecklist[]> = {};
  for (const cl of filtered) {
    if (!grouped[cl.courseName]) grouped[cl.courseName] = [];
    grouped[cl.courseName].push(cl);
  }

  const totalItems = filtered.reduce((sum, cl) => sum + cl.items.length, 0);
  const doneItems = filtered.reduce(
    (sum, cl) => sum + cl.items.filter((it) => it.done).length,
    0
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-lg font-semibold tracking-tight">Todos</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {totalItems > 0
            ? `${doneItems}/${totalItems} tasks complete across ${filtered.length} assignment${filtered.length !== 1 ? "s" : ""}`
            : "No checklist items yet. Visit an assignment to create a checklist."}
        </p>
      </div>

      {/* Course filter */}
      {courseNames.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          <button
            onClick={() => setCourseFilter("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              courseFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {courseNames.map((name) => (
            <button
              key={name}
              onClick={() => setCourseFilter(name)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                courseFilter === name
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Grouped checklists */}
      {Object.entries(grouped).map(([course, assignments]) => (
        <div key={course} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {course}
          </h2>

          <div className="space-y-4">
            {assignments.map((cl) => {
              const done = cl.items.filter((it) => it.done).length;
              const total = cl.items.length;
              const pct = Math.round((done / total) * 100);
              const allDone = done === total;

              return (
                <div key={cl.assignmentId} className="rounded-lg border">
                  {/* Assignment header */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/50">
                    <div className="min-w-0">
                      <Link
                        href={`/assignment/${cl.assignmentId}?courseId=${cl.courseId}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {cl.assignmentName}
                      </Link>
                      {cl.dueAt && (
                        <p className="text-xs text-muted-foreground">
                          Due {formatDueDate(cl.dueAt)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium tabular-nums ${
                        allDone ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      }`}
                    >
                      {done}/{total}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 w-full bg-muted">
                    <div
                      className={`h-full transition-all duration-300 ${
                        allDone ? "bg-green-500" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Items (only incomplete, plus done ones collapsed) */}
                  <div className="divide-y divide-border/50">
                    {cl.items
                      .filter((it) => !it.done)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-4 py-2"
                        >
                          <button
                            onClick={() => toggleItem(cl.assignmentId, item.id)}
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-muted-foreground/40 transition-colors hover:border-primary"
                          />
                          <span className="text-sm">{item.text}</span>
                        </div>
                      ))}
                    {cl.items.filter((it) => it.done).length > 0 && (
                      <div className="px-4 py-2">
                        <details>
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            {cl.items.filter((it) => it.done).length} completed
                          </summary>
                          <div className="mt-1 space-y-0">
                            {cl.items
                              .filter((it) => it.done)
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-3 py-1.5"
                                >
                                  <button
                                    onClick={() =>
                                      toggleItem(cl.assignmentId, item.id)
                                    }
                                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-primary bg-primary text-primary-foreground transition-colors"
                                  >
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={3}
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m4.5 12.75 6 6 9-13.5"
                                      />
                                    </svg>
                                  </button>
                                  <span className="text-sm text-muted-foreground line-through">
                                    {item.text}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {courseFilter !== "all"
              ? "No checklists for this course yet."
              : "No checklists created yet."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Open an assignment and create a checklist to get started.
          </p>
        </div>
      )}
    </div>
  );
}
