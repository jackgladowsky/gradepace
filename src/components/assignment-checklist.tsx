"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ChecklistData {
  assignmentId: number;
  courseId: number;
  courseName: string;
  assignmentName: string;
  dueAt: string | null;
  items: ChecklistItem[];
}

function storageKey(assignmentId: number) {
  return `studyhub_checklist_${assignmentId}`;
}

export function getChecklistFromStorage(assignmentId: number): ChecklistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(assignmentId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveChecklist(assignmentId: number, items: ChecklistItem[]) {
  localStorage.setItem(storageKey(assignmentId), JSON.stringify(items));
}

// Save metadata for the todos overview page
function saveChecklistMeta(
  assignmentId: number,
  courseId: number,
  courseName: string,
  assignmentName: string,
  dueAt: string | null
) {
  const metaKey = "studyhub_checklist_meta";
  let meta: Record<string, { courseId: number; courseName: string; assignmentName: string; dueAt: string | null }> = {};
  try {
    const raw = localStorage.getItem(metaKey);
    if (raw) meta = JSON.parse(raw);
  } catch {
    // ignore
  }
  meta[String(assignmentId)] = { courseId, courseName, assignmentName, dueAt };
  localStorage.setItem(metaKey, JSON.stringify(meta));
}

export function getAllChecklistMeta(): Record<
  string,
  { courseId: number; courseName: string; assignmentName: string; dueAt: string | null }
> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("studyhub_checklist_meta");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

interface AssignmentChecklistProps {
  assignmentId: number;
  courseId: number;
  courseName: string;
  assignmentName: string;
  dueAt: string | null;
  pointsPossible: number | null;
  description: string | null;
  rubric?: { description: string; points: number; long_description?: string }[];
}

export default function AssignmentChecklist({
  assignmentId,
  courseId,
  courseName,
  assignmentName,
  dueAt,
  pointsPossible,
  description,
  rubric,
}: AssignmentChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newText, setNewText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getChecklistFromStorage(assignmentId);
    setItems(stored);
    saveChecklistMeta(assignmentId, courseId, courseName, assignmentName, dueAt);
  }, [assignmentId, courseId, courseName, assignmentName, dueAt]);

  const persist = useCallback(
    (newItems: ChecklistItem[]) => {
      setItems(newItems);
      saveChecklist(assignmentId, newItems);
    },
    [assignmentId]
  );

  const addItem = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const item: ChecklistItem = {
        id: crypto.randomUUID(),
        text: trimmed,
        done: false,
      };
      persist([...items, item]);
    },
    [items, persist]
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addItem(newText);
    setNewText("");
    inputRef.current?.focus();
  };

  const toggleItem = useCallback(
    (id: string) => {
      persist(items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
    },
    [items, persist]
  );

  const deleteItem = useCallback(
    (id: string) => {
      persist(items.filter((it) => it.id !== id));
    },
    [items, persist]
  );

  const generateChecklist = useCallback(async () => {
    setGenerating(true);
    setGenError(null);

    try {
      const res = await fetch("/api/ai/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName,
          name: assignmentName,
          dueAt,
          pointsPossible,
          description,
          rubric,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed: ${res.status}`);
      }

      const data = await res.json();
      const steps: string[] = data.steps || [];

      if (steps.length === 0) {
        throw new Error("No steps generated");
      }

      // Merge with existing items (don't replace)
      const newItems: ChecklistItem[] = steps.map((text) => ({
        id: crypto.randomUUID(),
        text,
        done: false,
      }));

      persist([...items, ...newItems]);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to generate checklist");
    } finally {
      setGenerating(false);
    }
  }, [courseName, assignmentName, dueAt, pointsPossible, description, rubric, items, persist]);

  const doneCount = items.filter((it) => it.done).length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <section className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          My Checklist
          {totalCount > 0 && (
            <span className="ml-2 normal-case tracking-normal">
              {doneCount}/{totalCount} complete
            </span>
          )}
        </h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={generateChecklist}
          disabled={generating}
          className="text-xs"
        >
          {generating ? "Generating..." : "Generate checklist"}
        </Button>
      </div>

      {genError && <p className="mb-2 text-sm text-destructive">{genError}</p>}

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Items */}
      {totalCount > 0 && (
        <div className="mb-3 rounded-lg border divide-y">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-2.5 group"
            >
              <button
                onClick={() => toggleItem(item.id)}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  item.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40 hover:border-primary"
                }`}
              >
                {item.done && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm ${
                  item.done ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {item.text}
              </span>
              <button
                onClick={() => deleteItem(item.id)}
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                title="Delete"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {totalCount === 0 && !genError && (
        <div className="mb-3 rounded-lg border border-dashed py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Break this assignment into subtasks, or generate a checklist with AI
          </p>
        </div>
      )}

      {/* Add item form */}
      <form onSubmit={handleAddSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a task..."
          className="text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={!newText.trim()}>
          Add
        </Button>
      </form>
    </section>
  );
}
