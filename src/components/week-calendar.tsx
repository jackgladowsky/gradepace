"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { getOverrides, setOverride as setOverrideStorage } from "@/lib/assignment-overrides";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CalendarAssignment {
  id: number;
  name: string;
  due_at: string | null;
  points_possible: number | null;
  course_id: number;
  submission?: {
    submitted_at: string | null;
    workflow_state: string;
    late: boolean;
    missing: boolean;
  };
}

interface WeekCalendarProps {
  assignments: CalendarAssignment[];
  courseMap: Record<number, string>; // courseId -> cleaned name
}

/* ------------------------------------------------------------------ */
/*  Color palette (works in light & dark)                              */
/* ------------------------------------------------------------------ */

const COURSE_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500", border: "border-blue-200 dark:border-blue-800" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", border: "border-emerald-200 dark:border-emerald-800" },
  { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500", border: "border-violet-200 dark:border-violet-800" },
  { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500", border: "border-amber-200 dark:border-amber-800" },
  { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500", border: "border-rose-200 dark:border-rose-800" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500", border: "border-cyan-200 dark:border-cyan-800" },
  { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500", border: "border-orange-200 dark:border-orange-800" },
  { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500", border: "border-pink-200 dark:border-pink-800" },
  { bg: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500", border: "border-teal-200 dark:border-teal-800" },
  { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500", border: "border-indigo-200 dark:border-indigo-800" },
];

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const startMonth = MONTH_NAMES[monday.getMonth()];
  const endMonth = MONTH_NAMES[sunday.getMonth()];
  if (startMonth === endMonth) {
    return `${startMonth} ${monday.getDate()} - ${sunday.getDate()}, ${monday.getFullYear()}`;
  }
  return `${startMonth} ${monday.getDate()} - ${endMonth} ${sunday.getDate()}, ${sunday.getFullYear()}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/* ------------------------------------------------------------------ */
/*  Submission status badge                                            */
/* ------------------------------------------------------------------ */

function submissionLabel(a: CalendarAssignment, markedDone: boolean): { label: string; className: string } | null {
  if (markedDone) return { label: "Done", className: "text-emerald-600 dark:text-emerald-400" };
  const sub = a.submission;
  if (!sub) return null;
  if (sub.missing) return { label: "Missing", className: "text-red-600 dark:text-red-400" };
  if (sub.late) return { label: "Late", className: "text-amber-600 dark:text-amber-400" };
  if (sub.workflow_state === "graded") return { label: "Graded", className: "text-emerald-600 dark:text-emerald-400" };
  if (sub.submitted_at) return { label: "Done", className: "text-muted-foreground" };
  return null;
}

/* ------------------------------------------------------------------ */
/*  Mini month calendar                                                */
/* ------------------------------------------------------------------ */

function MiniMonth({
  monday,
  assignmentDates,
  onDayClick,
  selectedDay,
}: {
  monday: Date;
  assignmentDates: Set<string>;
  onDayClick: (date: Date) => void;
  selectedDay: Date | null;
}) {
  // Show the month that contains the majority of the week
  const midWeek = addDays(monday, 3);
  const year = midWeek.getFullYear();
  const month = midWeek.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const startDow = (firstOfMonth.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 card-lift">
      <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">
        {MONTH_NAMES[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[10px] font-medium text-muted-foreground/60">{d}</span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />;
          const date = new Date(year, month, day);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          const hasAssignment = assignmentDates.has(key);
          const isToday = isSameDay(date, today);
          const isSelected = selectedDay && isSameDay(date, selectedDay);
          return (
            <button
              key={key}
              onClick={() => onDayClick(date)}
              className={`relative flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-colors ${
                isSelected
                  ? "bg-foreground text-background font-semibold"
                  : isToday
                    ? "bg-accent font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              {day}
              {hasAssignment && (
                <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${isSelected ? "bg-background" : "bg-foreground/40"}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function WeekCalendar({ assignments, courseMap }: WeekCalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { markedDone: boolean }>>({});

  useEffect(() => {
    setOverrides(getOverrides());
  }, []);

  const toggleOverride = useCallback((e: React.MouseEvent, assignmentId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const current = overrides[String(assignmentId)]?.markedDone ?? false;
    setOverrideStorage(assignmentId, !current);
    setOverrides(getOverrides());
  }, [overrides]);

  const isDone = (id: number) => overrides[String(id)]?.markedDone ?? false;

  const monday = useMemo(() => addDays(getMonday(today), weekOffset * 7), [today, weekOffset]);

  // Build stable color map from courseIds
  const courseColorMap = useMemo(() => {
    const ids = [...new Set(assignments.map((a) => a.course_id))].sort((a, b) => a - b);
    const map: Record<number, (typeof COURSE_COLORS)[0]> = {};
    ids.forEach((id, i) => {
      map[id] = COURSE_COLORS[i % COURSE_COLORS.length];
    });
    return map;
  }, [assignments]);

  // Group assignments by date key
  const assignmentsByDate = useMemo(() => {
    const map: Record<string, CalendarAssignment[]> = {};
    for (const a of assignments) {
      if (!a.due_at) continue;
      const d = new Date(a.due_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    // Sort each day's assignments by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
    }
    return map;
  }, [assignments]);

  // All dates that have assignments (for mini calendar dots)
  const assignmentDates = useMemo(() => new Set(Object.keys(assignmentsByDate)), [assignmentsByDate]);

  // Build week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return { date, key, dayName: DAY_NAMES[i], dayNum: date.getDate(), isToday: isSameDay(date, today) };
    });
  }, [monday, today]);

  const selectedDay = expandedDay ? (() => {
    const parts = expandedDay.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  })() : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-xs text-muted-foreground">{formatDateRange(monday)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
            Next
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Week grid */}
        <div className="min-w-0 flex-1">
          {/* Desktop: 7-column grid */}
          <div className="hidden md:grid md:grid-cols-7 md:gap-px md:overflow-hidden md:rounded-xl md:border md:border-border/50 md:bg-border/50">
            {weekDays.map((day) => {
              const dayAssignments = assignmentsByDate[day.key] || [];
              const isExpanded = expandedDay === day.key;
              return (
                <button
                  key={day.key}
                  onClick={() => setExpandedDay(isExpanded ? null : day.key)}
                  className={`flex min-h-[140px] flex-col bg-card p-2 text-left transition-colors hover:bg-accent/20 ${
                    isExpanded ? "ring-2 ring-inset ring-foreground/20" : ""
                  }`}
                >
                  {/* Day header */}
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      day.isToday ? "bg-foreground text-background" : "text-muted-foreground"
                    }`}>
                      {day.dayNum}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">{day.dayName}</span>
                  </div>
                  {/* Assignment pills */}
                  <div className="flex flex-1 flex-col gap-1">
                    {dayAssignments.slice(0, 4).map((a) => {
                      const color = courseColorMap[a.course_id] || COURSE_COLORS[0];
                      const status = submissionLabel(a, isDone(a.id));
                      return (
                        <div
                          key={a.id}
                          className={`rounded-md border px-1.5 py-1 ${color.bg} ${color.border}`}
                        >
                          <p className={`truncate text-[11px] font-medium ${color.text}`}>{a.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {a.due_at && formatTime(a.due_at)}
                            {a.points_possible != null && ` \u00b7 ${a.points_possible}pts`}
                            {status && (
                              <span className={`ml-1 ${status.className}`}>{status.label}</span>
                            )}
                          </p>
                        </div>
                      );
                    })}
                    {dayAssignments.length > 4 && (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        +{dayAssignments.length - 4} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mobile: stacked days */}
          <div className="flex flex-col gap-2 md:hidden">
            {weekDays.map((day) => {
              const dayAssignments = assignmentsByDate[day.key] || [];
              const isExpanded = expandedDay === day.key;
              return (
                <div key={day.key}>
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : day.key)}
                    className={`flex w-full items-center gap-3 rounded-lg border border-border/50 px-4 py-3 text-left transition-colors hover:bg-accent/20 ${
                      day.isToday ? "border-foreground/20 bg-accent/30" : "bg-card"
                    } ${isExpanded ? "ring-2 ring-foreground/20" : ""}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      day.isToday ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                    }`}>
                      {day.dayNum}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">{day.dayName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {dayAssignments.length > 0
                          ? `${dayAssignments.length} assignment${dayAssignments.length > 1 ? "s" : ""}`
                          : "No assignments"}
                      </span>
                    </div>
                    <svg
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {isExpanded && dayAssignments.length > 0 && (
                    <div className="mt-1 space-y-1 pl-4">
                      {dayAssignments.map((a) => {
                        const color = courseColorMap[a.course_id] || COURSE_COLORS[0];
                        const status = submissionLabel(a, isDone(a.id));
                        return (
                          <div key={a.id} className={`rounded-lg border px-3 py-2 ${color.bg} ${color.border}`}>
                            <p className={`text-sm font-medium ${color.text}`}>{a.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {courseMap[a.course_id] || "Unknown course"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {a.due_at && formatTime(a.due_at)}
                              {a.points_possible != null && ` \u00b7 ${a.points_possible} pts`}
                              {status && (
                                <span className={`ml-1 font-medium ${status.className}`}>{status.label}</span>
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day detail panel (desktop) */}
          {expandedDay && (assignmentsByDate[expandedDay] || []).length > 0 && (
            <div className="mt-4 hidden rounded-xl border border-border/50 bg-card p-4 card-lift md:block">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {(() => {
                    const parts = expandedDay.split("-");
                    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
                  })()}
                </h3>
                <button
                  onClick={() => setExpandedDay(null)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                {(assignmentsByDate[expandedDay] || []).map((a) => {
                  const color = courseColorMap[a.course_id] || COURSE_COLORS[0];
                  const status = submissionLabel(a, isDone(a.id));
                  return (
                    <div key={a.id} className={`rounded-lg border px-4 py-3 ${color.bg} ${color.border}`}>
                      <div className="flex items-start gap-3">
                        {(() => {
                          const markedDone = isDone(a.id);
                          const sub = a.submission;
                          const canOverride = !!(sub?.missing || sub?.late || (!sub?.submitted_at && sub?.workflow_state !== "graded"));
                          const showToggle = canOverride || markedDone;
                          if (!showToggle) return null;
                          return (
                            <button
                              onClick={(e) => toggleOverride(e, a.id)}
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                markedDone
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-muted-foreground/30 hover:border-muted-foreground/60"
                              }`}
                              title={markedDone ? "Undo mark as done" : "Mark as done"}
                            >
                              {markedDone && (
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              )}
                            </button>
                          );
                        })()}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`font-medium ${isDone(a.id) ? "line-through text-muted-foreground" : color.text}`}>{a.name}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{courseMap[a.course_id] || "Unknown course"}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              {a.due_at && <p className="text-xs font-medium tabular-nums">{formatTime(a.due_at)}</p>}
                              {a.points_possible != null && (
                                <p className="text-xs text-muted-foreground">{a.points_possible} pts</p>
                              )}
                            </div>
                          </div>
                          {status && (
                            <p className={`mt-1.5 text-xs font-medium ${status.className}`}>{status.label}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: mini month + legend */}
        <div className="flex flex-col gap-4 lg:w-52">
          <MiniMonth
            monday={monday}
            assignmentDates={assignmentDates}
            onDayClick={(date) => {
              const targetMonday = getMonday(date);
              const diff = Math.round((targetMonday.getTime() - getMonday(today).getTime()) / (7 * 24 * 60 * 60 * 1000));
              setWeekOffset(diff);
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              setExpandedDay(key);
            }}
            selectedDay={selectedDay}
          />

          {/* Course color legend */}
          <div className="rounded-xl border border-border/50 bg-card p-3 card-lift">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Courses</p>
            <div className="space-y-1.5">
              {Object.entries(courseColorMap).map(([courseId, color]) => (
                <div key={courseId} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.dot}`} />
                  <span className="truncate text-xs text-muted-foreground">
                    {courseMap[Number(courseId)] || `Course ${courseId}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
