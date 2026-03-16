"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
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
  courseMap: Record<number, string>;
}

/* ------------------------------------------------------------------ */
/*  Color palette                                                      */
/* ------------------------------------------------------------------ */

const COURSE_COLORS = [
  { dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
  { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  { dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
  { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  { dot: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400" },
  { dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
  { dot: "bg-pink-500", text: "text-pink-600 dark:text-pink-400" },
  { dot: "bg-teal-500", text: "text-teal-600 dark:text-teal-400" },
  { dot: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" },
];

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
    return `${startMonth} ${monday.getDate()} – ${sunday.getDate()}, ${monday.getFullYear()}`;
  }
  return `${startMonth} ${monday.getDate()} – ${endMonth} ${sunday.getDate()}, ${sunday.getFullYear()}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Submission status                                                  */
/* ------------------------------------------------------------------ */

function submissionStatus(a: CalendarAssignment, markedDone: boolean): { label: string; className: string } | null {
  if (markedDone) return { label: "Done", className: "text-emerald-500" };
  const sub = a.submission;
  if (!sub) return null;
  if (sub.missing) return { label: "Missing", className: "text-red-500" };
  if (sub.late) return { label: "Late", className: "text-amber-500" };
  if (sub.workflow_state === "graded") return { label: "Graded", className: "text-emerald-500" };
  if (sub.submitted_at) return { label: "Submitted", className: "text-muted-foreground" };
  return null;
}

/* ------------------------------------------------------------------ */
/*  Mini month (compact, inline)                                       */
/* ------------------------------------------------------------------ */

function MiniMonth({
  monday,
  assignmentDates,
  onDayClick,
  today,
}: {
  monday: Date;
  assignmentDates: Set<string>;
  onDayClick: (date: Date) => void;
  today: Date;
}) {
  const midWeek = addDays(monday, 3);
  const year = midWeek.getFullYear();
  const month = midWeek.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const startDow = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Which days are in the current week?
  const weekDayKeys = new Set<string>();
  for (let i = 0; i < 7; i++) weekDayKeys.add(dateKey(addDays(monday, i)));

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {MONTH_NAMES_FULL[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[9px] font-medium text-muted-foreground/50 pb-0.5">{d}</span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />;
          const date = new Date(year, month, day);
          const key = dateKey(date);
          const hasAssignment = assignmentDates.has(key);
          const isToday = isSameDay(date, today);
          const inWeek = weekDayKeys.has(key);
          return (
            <button
              key={key}
              onClick={() => onDayClick(date)}
              className={`relative flex h-5 w-5 items-center justify-center rounded text-[10px] transition-colors mx-auto ${
                isToday
                  ? "bg-primary text-primary-foreground font-bold"
                  : inWeek
                    ? "bg-accent/60 text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/40"
              }`}
            >
              {day}
              {hasAssignment && !isToday && (
                <span className="absolute -bottom-0.5 h-0.5 w-2 rounded-full bg-primary/60" />
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
      const key = dateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
    }
    return map;
  }, [assignments]);

  const assignmentDates = useMemo(() => new Set(Object.keys(assignmentsByDate)), [assignmentsByDate]);

  // Build week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      const key = dateKey(date);
      return {
        date,
        key,
        dayNameFull: DAY_NAMES_FULL[i],
        dayNameShort: DAY_NAMES_SHORT[i],
        dayNum: date.getDate(),
        month: MONTH_NAMES[date.getMonth()],
        isToday: isSameDay(date, today),
        isPast: date < today,
      };
    });
  }, [monday, today]);

  // Total assignments this week
  const weekTotal = weekDays.reduce((sum, day) => sum + (assignmentsByDate[day.key]?.length || 0), 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Calendar</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateRange(monday)}
            {weekTotal > 0 && (
              <span className="ml-2 text-foreground/60">· {weekTotal} assignment{weekTotal !== 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Prev
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              weekOffset === 0
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Next
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Main agenda */}
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
            {weekDays.map((day, dayIdx) => {
              const dayAssignments = assignmentsByDate[day.key] || [];
              const isEmpty = dayAssignments.length === 0;

              return (
                <div key={day.key} className={dayIdx > 0 ? "border-t border-border/40" : ""}>
                  {/* Day header row */}
                  <div className={`flex items-center gap-3 px-4 py-2.5 ${
                    day.isToday ? "bg-primary/8" : day.isPast ? "opacity-40" : ""
                  }`}>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums ${
                      day.isToday
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground"
                    }`}>
                      {day.dayNum}
                    </div>
                    <div className="flex-1">
                      <span className={`text-sm font-semibold ${day.isToday ? "text-foreground" : "text-muted-foreground"}`}>
                        {day.dayNameFull}
                      </span>
                      {day.isToday && (
                        <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-primary">Today</span>
                      )}
                    </div>
                    {!isEmpty && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {dayAssignments.length}
                      </span>
                    )}
                  </div>

                  {/* Assignments for this day */}
                  {dayAssignments.map((a) => {
                    const color = courseColorMap[a.course_id] || COURSE_COLORS[0];
                    const status = submissionStatus(a, isDone(a.id));
                    const done = isDone(a.id);

                    return (
                      <div
                        key={a.id}
                        className={`flex items-center gap-3 border-t border-border/20 px-4 py-3 transition-colors hover:bg-accent/20 ${
                          day.isPast && !day.isToday ? "opacity-40" : ""
                        }`}
                      >
                        {/* Mark done button */}
                        <button
                          onClick={(e) => toggleOverride(e, a.id)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ml-9 ${
                            done
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-muted-foreground/30 hover:border-emerald-500 hover:bg-emerald-500/10"
                          }`}
                          title={done ? "Undo" : "Mark as done"}
                        >
                          {done && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </button>

                        {/* Color dot */}
                        <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />

                        {/* Assignment info */}
                        <Link
                          href={`/assignment/${a.id}?courseId=${a.course_id}`}
                          className="flex min-w-0 flex-1 items-center gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                              {a.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {courseMap[a.course_id]}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-4 text-right">
                            {status && (
                              <span className={`text-[11px] font-bold uppercase tracking-wider ${status.className}`}>
                                {status.label}
                              </span>
                            )}
                            {a.points_possible != null && (
                              <span className="hidden text-xs text-muted-foreground sm:inline tabular-nums">
                                {a.points_possible} pts
                              </span>
                            )}
                            {a.due_at && (
                              <span className="w-20 text-right text-xs font-medium tabular-nums text-muted-foreground">
                                {formatTime(a.due_at)}
                              </span>
                            )}
                          </div>
                        </Link>
                      </div>
                    );
                  })}

                  {/* Empty day indicator */}
                  {isEmpty && !day.isPast && (
                    <div className="border-t border-border/20 px-4 py-2 pl-16">
                      <span className="text-xs text-muted-foreground/40">Nothing due</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mini month sidebar */}
        <div className="hidden w-36 shrink-0 lg:block">
          <MiniMonth
            monday={monday}
            assignmentDates={assignmentDates}
            onDayClick={(date) => {
              const targetMonday = getMonday(date);
              const diff = Math.round((targetMonday.getTime() - getMonday(today).getTime()) / (7 * 24 * 60 * 60 * 1000));
              setWeekOffset(diff);
            }}
            today={today}
          />

          {/* Course legend */}
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Courses</p>
            <div className="space-y-1">
              {Object.entries(courseColorMap).map(([courseId, color]) => (
                <Link
                  key={courseId}
                  href={`/course/${courseId}`}
                  className="flex items-center gap-1.5 rounded py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color.dot}`} />
                  <span className="truncate">{courseMap[Number(courseId)]}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
