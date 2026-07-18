"use client";

import { AppHeader } from "@/components/app-header/app-header";
import { NoteCard } from "@/components/note-card/note-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type {
  Note,
  NoteWithLocation,
  Project,
  Meeting,
  NoteTopic,
} from "@/lib/types";
import { AnimatePresence } from "framer-motion";
import { useMemo } from "react";

/**
 * Recent page - shows all notes across all projects, sorted by most recent first.
 *
 * A chronological view of recent activity, showing every note the user has written,
 * regardless of project or filing status.
 * Shows type badges and location tags since items are mixed.
 */
export default function EverythingPage() {
  // Fetch all notes
  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
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

  // Fetch projects for location enrichment
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  // Fetch meetings for location enrichment
  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["meetings"],
    queryFn: async () => {
      const response = await fetch("/api/meetings");
      if (!response.ok) throw new Error("Failed to fetch meetings");
      return response.json();
    },
  });

  // Fetch topics for location enrichment
  const { data: topics = [] } = useQuery<NoteTopic[]>({
    queryKey: ["topics"],
    queryFn: async () => {
      const response = await fetch("/api/topics");
      if (!response.ok) throw new Error("Failed to fetch topics");
      return response.json();
    },
  });

  // Enrich notes with location information
  const enrichedNotes = useMemo<NoteWithLocation[]>(() => {
    return notes.map((note) => {
      // Find the meeting or topic
      const meeting = note.meeting_id
        ? meetings.find((m) => m.id === note.meeting_id)
        : null;
      const topic = note.topic_id
        ? topics.find((t) => t.id === note.topic_id)
        : null;

      // Find the project
      const projectId = meeting?.project_id || topic?.project_id;
      const project = projectId
        ? projects.find((p) => p.id === projectId)
        : null;

      return {
        ...note,
        project_name: project?.name,
        location_name: meeting?.name || topic?.name,
      };
    });
  }, [notes, projects, meetings, topics]);

  const isLoading = notesLoading;

  return (
    <>
      <AppHeader title="Recent" />
      <div className="flex-1 px-4 sm:px-6 md:px-10 py-6">
        {isLoading ? (
          <LoadingPage />
        ) : enrichedNotes.length === 0 ? (
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
              {enrichedNotes.map((note) => (
                <NoteCard key={note.id} note={note} viewContext="mixed" />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  );
}
