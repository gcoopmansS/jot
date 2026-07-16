"use client";

import { AppHeader } from "@/components/app-header/app-header";
import { NoteCard } from "@/components/note-card/note-card";
import { Note } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

/**
 * Unsorted notes page - the inbox for notes that haven't been filed yet.
 *
 * Shows all notes with is_unsorted = true.
 * This is where notes go when the user skips the "What's this about?" prompt.
 */
export default function UnsortedPage() {
  // Fetch unsorted notes using TanStack Query
  const {
    data: notes,
    isLoading,
    error,
  } = useQuery<Note[]>({
    queryKey: ["notes", "unsorted"],
    queryFn: async () => {
      const response = await fetch("/api/notes?is_unsorted=true");
      if (!response.ok) {
        throw new Error("Failed to fetch unsorted notes");
      }
      return response.json();
    },
  });

  return (
    <>
      <AppHeader title="Unsorted" />
      <div className="flex-1 px-10 py-6">
        {/* Loading state */}
        {isLoading && (
          <div className="text-sm text-[#5B655F] text-center mt-12">
            Loading...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-sm text-red-600 text-center mt-12">
            Failed to load unsorted notes. Please try again.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && notes && notes.length === 0 && (
          <div className="text-sm text-[#5B655F] text-center mt-12">
            No unsorted notes. Everything is filed!
          </div>
        )}

        {/* Notes list */}
        {!isLoading && !error && notes && notes.length > 0 && (
          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
