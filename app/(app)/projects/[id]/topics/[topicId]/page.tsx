"use client";

import { AppHeader } from "@/components/app-header/app-header";
import { NoteCard } from "@/components/note-card/note-card";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { Note, NoteTopic } from "@/lib/types";

/**
 * Topic detail page - shows all notes for a specific topic.
 *
 * When you click on a topic in the sidebar, this page displays
 * all notes that belong to that topic as cards.
 */
export default function TopicPage() {
  const params = useParams();
  const topicId = params.topicId as string;

  // Fetch the topic
  const { data: topic, isLoading: topicLoading } = useQuery<NoteTopic>({
    queryKey: ["topic", topicId],
    queryFn: async () => {
      const response = await fetch("/api/topics");
      if (!response.ok) throw new Error("Failed to fetch topics");
      const topics = await response.json();
      const found = topics.find((t: NoteTopic) => t.id === topicId);
      if (!found) throw new Error("Topic not found");
      return found;
    },
  });

  // Fetch all notes for this topic
  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ["notes", "topic", topicId],
    queryFn: async () => {
      const response = await fetch("/api/notes");
      if (!response.ok) throw new Error("Failed to fetch notes");
      const allNotes = await response.json();

      // Filter notes that belong to this topic
      return allNotes
        .filter((note: Note) => note.topic_id === topicId)
        .sort(
          (a: Note, b: Note) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    },
  });

  if (topicLoading) {
    return (
      <>
        <AppHeader title="Loading..." />
        <div className="flex-1 px-10 py-6">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Loading topic...
          </p>
        </div>
      </>
    );
  }

  if (!topic) {
    return (
      <>
        <AppHeader title="Topic Not Found" />
        <div className="flex-1 px-10 py-6">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            This topic doesn't exist or you don't have access to it.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title={topic.name} />
      <div className="flex-1 px-10 py-6">
        {notesLoading ? (
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Loading notes...
          </p>
        ) : notes.length === 0 ? (
          <div
            className="text-center py-12"
            style={{ color: "var(--ink-soft)" }}
          >
            <p className="text-sm">No notes in this topic yet.</p>
            <p className="text-xs mt-2">
              Create a note and categorize it to "{topic.name}" to see it here.
            </p>
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
