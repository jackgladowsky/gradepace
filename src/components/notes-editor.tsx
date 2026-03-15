"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Note {
  id: string;
  title: string;
  content: string;
  courseId: number | null;
  courseName: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Course {
  id: number;
  name: string;
}

const STORAGE_KEY = "studyhub_notes";

function generateId() {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function titleFromContent(content: string): string {
  const firstLine = content.split("\n")[0].trim();
  if (firstLine.length === 0) return "Untitled note";
  return firstLine.length > 60 ? firstLine.slice(0, 60) + "..." : firstLine;
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface NotesEditorProps {
  courses: Course[];
  filterCourseId?: number;
}

export function NotesEditor({ courses, filterCourseId }: NotesEditorProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    filterCourseId ?? null
  );
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes from localStorage on mount
  useEffect(() => {
    const all = loadNotes();
    setNotes(all);
    setLoaded(true);
  }, []);

  const displayedNotes = sortNotes(
    filterCourseId != null
      ? notes.filter((n) => n.courseId === filterCourseId)
      : notes
  );

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  const persistNotes = useCallback(
    (updated: Note[]) => {
      setNotes(updated);
      saveNotes(updated);
    },
    []
  );

  // Auto-save debounced
  const debouncedSave = useCallback(
    (noteId: string, newTitle: string, newContent: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setNotes((prev) => {
          const updated = prev.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  title: newTitle || titleFromContent(newContent),
                  content: newContent,
                  updatedAt: new Date().toISOString(),
                }
              : n
          );
          saveNotes(updated);
          return updated;
        });
      }, 400);
    },
    []
  );

  function createNote() {
    const now = new Date().toISOString();
    const courseName =
      selectedCourseId != null
        ? courses.find((c) => c.id === selectedCourseId)?.name ?? null
        : null;
    const note: Note = {
      id: generateId(),
      title: "Untitled note",
      content: "",
      courseId: selectedCourseId,
      courseName,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [note, ...notes];
    persistNotes(updated);
    setActiveNoteId(note.id);
    setTitle("");
    setContent("");
  }

  function openNote(note: Note) {
    setActiveNoteId(note.id);
    setTitle(note.title === "Untitled note" ? "" : note.title);
    setContent(note.content);
    setSelectedCourseId(note.courseId);
  }

  function deleteNote(noteId: string) {
    const updated = notes.filter((n) => n.id !== noteId);
    persistNotes(updated);
    if (activeNoteId === noteId) {
      setActiveNoteId(null);
      setTitle("");
      setContent("");
    }
  }

  function togglePin(noteId: string) {
    const updated = notes.map((n) =>
      n.id === noteId
        ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() }
        : n
    );
    persistNotes(updated);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (activeNoteId) debouncedSave(activeNoteId, value, content);
  }

  function handleContentChange(value: string) {
    setContent(value);
    if (activeNoteId) debouncedSave(activeNoteId, title, value);
  }

  function handleCourseChange(courseIdStr: string) {
    const courseId = courseIdStr === "" ? null : parseInt(courseIdStr, 10);
    const courseName =
      courseId != null
        ? courses.find((c) => c.id === courseId)?.name ?? null
        : null;
    setSelectedCourseId(courseId);
    if (activeNoteId) {
      setNotes((prev) => {
        const updated = prev.map((n) =>
          n.id === activeNoteId
            ? { ...n, courseId, courseName, updatedAt: new Date().toISOString() }
            : n
        );
        saveNotes(updated);
        return updated;
      });
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading notes...</p>
      </div>
    );
  }

  // Editor view when a note is active
  if (activeNote) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => {
              setActiveNoteId(null);
              setTitle("");
              setContent("");
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <span className="text-sm text-muted-foreground">Back to notes</span>
          <div className="flex-1" />
          <button
            onClick={() => togglePin(activeNote.id)}
            className={`rounded-md p-1.5 transition-colors hover:bg-accent ${
              activeNote.pinned
                ? "text-amber-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={activeNote.pinned ? "Unpin" : "Pin"}
          >
            <svg className="h-4 w-4" fill={activeNote.pinned ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 3.487.27-.27a1.5 1.5 0 0 1 2.122 0l.707.707a1.5 1.5 0 0 1 0 2.122l-.27.27m-2.829-2.829-5.657 5.657a3 3 0 0 0-.879 2.121V14.5h3.035a3 3 0 0 0 2.122-.879l5.657-5.657m-2.829-2.829L20.14 5.36m-6.107 6.107L12 21" />
            </svg>
          </button>
          <button
            onClick={() => deleteNote(activeNote.id)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Delete note"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>

        {/* Course selector */}
        {!filterCourseId && (
          <div className="mb-3">
            <select
              value={selectedCourseId ?? ""}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">No course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Title */}
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title (optional)"
          className="mb-3 border-none bg-transparent px-0 text-base font-semibold shadow-none ring-0 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-transparent"
        />

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start typing..."
          className="min-h-[300px] w-full resize-none rounded-lg border border-input bg-transparent p-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          autoFocus
        />

        <p className="mt-2 text-[11px] text-muted-foreground">
          Last saved {formatTimestamp(activeNote.updatedAt)}
        </p>
      </div>
    );
  }

  // Notes list view
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {displayedNotes.length} {displayedNotes.length === 1 ? "note" : "notes"}
        </span>
        <Button variant="ghost" size="sm" onClick={createNote}>
          <svg className="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New note
        </Button>
      </div>

      {displayedNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">No notes yet.</p>
          <button
            onClick={createNote}
            className="mt-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create your first note
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card card-lift">
          {displayedNotes.map((note, i) => (
            <button
              key={note.id}
              onClick={() => openNote(note)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                i > 0 ? "border-t border-border/50" : ""
              }`}
            >
              {note.pinned && (
                <svg className="h-3.5 w-3.5 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 3.487.27-.27a1.5 1.5 0 0 1 2.122 0l.707.707a1.5 1.5 0 0 1 0 2.122l-.27.27m-2.829-2.829-5.657 5.657a3 3 0 0 0-.879 2.121V14.5h3.035a3 3 0 0 0 2.122-.879l5.657-5.657m-2.829-2.829L20.14 5.36m-6.107 6.107L12 21" />
                </svg>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{note.title}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  {note.courseName && !filterCourseId && (
                    <span className="truncate text-[11px] text-muted-foreground">
                      {note.courseName}
                    </span>
                  )}
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatTimestamp(note.updatedAt)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
