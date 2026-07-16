"use client";

import { AppHeader } from "@/components/app-header/app-header";
import { NoteCard } from "@/components/note-card/note-card";
import { useQuery } from "@tanstack/react-query";
import type { Note } from "@/lib/types";

/**
 * Everything page - shows all notes across all projects.
 *
 * A chronological or searchable view of every note the user has written,
 * regardless of project or filing status.
 */
export default function EverythingPage() {
  // Fetch all notes
  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: async () => {
      const response = await fetch("/api/notes");
      if (!response.ok) throw new Error("Failed to fetch notes");
      const allNotes = await response.json();
      // Sort by created_at descending (newest first)
      return allNotes.sort(
        (a: Note, b: Note) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
  });

  return (
    <>
      <AppHeader title="Everything" />
      <div className="flex-1 px-10 py-6">
        {isLoading ? (
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Loading notes...
          </p>
        ) : notes.length === 0 ? (
          <div
            className="text-sm text-center mt-12"
            style={{ color: "var(--ink-soft)" }}
          >
            No notes yet. Click + New note to start writing.
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
