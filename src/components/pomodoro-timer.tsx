"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

// --- Types ---

type TimerMode = "focus" | "shortBreak" | "longBreak";

interface Session {
  courseId: number | null;
  courseName: string;
  duration: number; // seconds
  completedAt: string; // ISO string
  mode: TimerMode;
}

interface TimerSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

// --- Constants ---

const DEFAULT_SETTINGS: TimerSettings = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const MODE_LABELS: Record<TimerMode, string> = {
  focus: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

const STORAGE_KEY = "studyhub-pomodoro-sessions";

// --- Helpers ---

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function playChime() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.15 + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.4);
    });
  } catch {
    // Audio not available
  }
}

// --- Component ---

interface PomodoroTimerProps {
  courses: { id: number; name: string }[];
}

export function PomodoroTimer({ courses }: PomodoroTimerProps) {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [settings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_SETTINGS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [focusCount, setFocusCount] = useState(0);

  // Track start time for drift-free countdown
  const startTimeRef = useRef<number | null>(null);
  const remainingAtStartRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  // Load sessions on mount
  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const totalDuration = settings[mode];
  const progress = 1 - remainingSeconds / totalDuration;

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const completeSession = useCallback(() => {
    playChime();
    setIsRunning(false);
    startTimeRef.current = null;

    if (mode === "focus") {
      const newSession: Session = {
        courseId: selectedCourseId,
        courseName: selectedCourse?.name || "No course",
        duration: settings.focus,
        completedAt: new Date().toISOString(),
        mode: "focus",
      };
      const updated = [newSession, ...loadSessions()];
      saveSessions(updated);
      setSessions(updated);

      const newFocusCount = focusCount + 1;
      setFocusCount(newFocusCount);

      // Auto-cycle: after 4 focus sessions, take a long break
      if (newFocusCount % 4 === 0) {
        setMode("longBreak");
        setRemainingSeconds(settings.longBreak);
      } else {
        setMode("shortBreak");
        setRemainingSeconds(settings.shortBreak);
      }
    } else {
      // After a break, go back to focus
      setMode("focus");
      setRemainingSeconds(settings.focus);
    }
  }, [mode, selectedCourseId, selectedCourse, settings, focusCount]);

  // Animation-frame-based countdown (drift-free)
  useEffect(() => {
    if (!isRunning) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      remainingAtStartRef.current = remainingSeconds;
    }

    function tick() {
      if (!startTimeRef.current) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newRemaining = Math.max(
        0,
        Math.round(remainingAtStartRef.current - elapsed)
      );
      setRemainingSeconds(newRemaining);

      if (newRemaining <= 0) {
        return; // will be handled by the effect below
      }
      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRunning, remainingSeconds]);

  // Detect timer completion
  useEffect(() => {
    if (remainingSeconds === 0 && isRunning) {
      completeSession();
    }
  }, [remainingSeconds, isRunning, completeSession]);

  function handleStart() {
    startTimeRef.current = null; // will be set fresh in the effect
    setIsRunning(true);
  }

  function handlePause() {
    setIsRunning(false);
    startTimeRef.current = null;
  }

  function handleReset() {
    setIsRunning(false);
    startTimeRef.current = null;
    setRemainingSeconds(settings[mode]);
  }

  function switchMode(newMode: TimerMode) {
    if (isRunning) return;
    setMode(newMode);
    setRemainingSeconds(settings[newMode]);
    startTimeRef.current = null;
  }

  // --- Today's stats ---
  const todayKey = getTodayKey();
  const todaySessions = sessions.filter(
    (s) => s.completedAt.slice(0, 10) === todayKey && s.mode === "focus"
  );
  const todayFocusMinutes = Math.round(
    todaySessions.reduce((sum, s) => sum + s.duration, 0) / 60
  );

  // --- SVG ring ---
  const size = 256;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Mode selector */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            disabled={isRunning}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === m
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground disabled:opacity-50"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/50"
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={
              mode === "focus"
                ? "text-primary transition-[stroke-dashoffset] duration-500"
                : "text-emerald-500 transition-[stroke-dashoffset] duration-500"
            }
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-light tabular-nums tracking-tight">
            {formatTime(remainingSeconds)}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {MODE_LABELS[mode]}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isRunning ? (
          <Button onClick={handleStart} size="lg" className="min-w-[100px]">
            {remainingSeconds < settings[mode] ? "Resume" : "Start"}
          </Button>
        ) : (
          <Button
            onClick={handlePause}
            variant="secondary"
            size="lg"
            className="min-w-[100px]"
          >
            Pause
          </Button>
        )}
        <Button onClick={handleReset} variant="ghost" size="lg">
          Reset
        </Button>
      </div>

      {/* Course selector */}
      <div className="w-full max-w-xs">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Studying for
        </label>
        <select
          value={selectedCourseId ?? ""}
          onChange={(e) =>
            setSelectedCourseId(e.target.value ? Number(e.target.value) : null)
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/50"
        >
          <option value="">No course selected</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Today's stats */}
      <div className="w-full rounded-xl border border-border/50 bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Today
        </h2>
        <div className="mb-4 flex gap-6">
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {todayFocusMinutes}
            </p>
            <p className="text-xs text-muted-foreground">minutes focused</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {todaySessions.length}
            </p>
            <p className="text-xs text-muted-foreground">sessions completed</p>
          </div>
        </div>

        {todaySessions.length > 0 ? (
          <div className="space-y-0">
            {todaySessions.slice(0, 10).map((s, i) => {
              const time = new Date(s.completedAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between py-2 ${
                    i > 0 ? "border-t border-border/50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{s.courseName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span>{Math.round(s.duration / 60)} min</span>
                    <span>{time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No sessions yet today. Start your first focus session!
          </p>
        )}
      </div>
    </div>
  );
}
