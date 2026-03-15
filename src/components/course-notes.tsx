"use client";

import { NotesEditor } from "@/components/notes-editor";

interface CourseNotesProps {
  courseId: number;
  courseName: string;
  courses: { id: number; name: string }[];
}

export function CourseNotes({ courseId, courses }: CourseNotesProps) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Notes</h2>
      </div>
      <NotesEditor courses={courses} filterCourseId={courseId} />
    </section>
  );
}
