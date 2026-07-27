"use client";

import { AppHeader } from "@/components/app-header/app-header";
import { NoteCard } from "@/components/note-card/note-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { Note, NoteTopic, Project } from "@/lib/types";
import { AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/lib/use-current-user";

/**
 * Topic detail page - shows all notes for a specific topic.
 *
 * When you click on a topic in the sidebar, this page displays
 * all notes that belong to that topic as cards.
 */
export default function TopicPage() {
  const params = useParams();
  const topicId = params.topicId as string;
  const projectId = params.id as string;
  const { data: currentUser } = useCurrentUser();

  // Fetch the project for breadcrumb
  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId, currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Fetch the topic
  const { data: topic, isLoading: topicLoading } = useQuery<NoteTopic>({
    queryKey: ["topic", topicId, currentUser?.id],
    queryFn: async () => {
      const response = await fetch("/api/topics");
      if (!response.ok) throw new Error("Failed to fetch topics");
      const topics = await response.json();
      const found = topics.find((t: NoteTopic) => t.id === topicId);
      if (!found) throw new Error("Topic not found");
      return found;
    },
    enabled: !!currentUser?.id,
  });

  // Fetch all notes for this topic
  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ["notes", "topic", topicId, currentUser?.id],
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
    enabled: !!currentUser?.id,
  });

  if (topicLoading) {
    return (
      <>
        <AppHeader title="Loading..." />
        <div className="flex-1 px-4 sm:px-6 md:px-10 py-6">
          <LoadingPage />
        </div>
      </>
    );
  }

  if (!topic) {
    return (
      <>
        <AppHeader title="Topic Not Found" />
        <div className="flex-1 px-4 sm:px-6 md:px-10 py-6">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            This topic doesn't exist or you don't have access to it.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader
        title={
          <>
            {project && (
              <span
                className="font-normal"
                style={{ color: "var(--ink-soft)" }}
              >
                {project.name} /{" "}
              </span>
            )}
            {topic.name}
          </>
        }
      />
      <div className="flex-1 px-4 sm:px-6 md:px-10 py-6">
        {notesLoading ? (
          <LoadingPage />
        ) : notes.length === 0 ? (
          <div className="max-w-3xl mx-auto">
            <EmptyState
              icon={BookOpen}
              title="No notes yet"
              description={`Create a note and categorize it to "${topic.name}" to see it here.`}
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <AnimatePresence>
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} viewContext="specific" />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  );
}
