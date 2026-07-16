"use client";

import { AppHeader } from "@/components/app-header/app-header";
import { NoteCard } from "@/components/note-card/note-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Note } from "@/lib/types";
import { AnimatePresence } from "framer-motion";

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
          <LoadingPage />
        ) : notes.length === 0 ? (
          <div className="max-w-3xl mx-auto">
            <EmptyState
              icon={FileText}
              title="No notes yet"
              description="You haven't captured anything. Click + New note or press ⌘N to start writing."
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <AnimatePresence>
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  );
}
