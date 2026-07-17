"use client";

import { AppHeader } from "@/components/app-header/app-header";
import { NoteCard } from "@/components/note-card/note-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { SeriesBanner } from "@/components/series-banner/series-banner";
import { Calendar, Repeat } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { Note, Meeting, Project } from "@/lib/types";
import { AnimatePresence } from "framer-motion";

/**
 * Meeting detail page - shows all notes for a specific meeting.
 *
 * When you click on a meeting in the sidebar, this page displays
 * all notes that belong to that meeting as cards.
 */
export default function MeetingPage() {
  const params = useParams();
  const meetingId = params.meetingId as string;
  const projectId = params.id as string;

  // Fetch the project for breadcrumb
  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      return response.json();
    },
  });

  // Fetch the meeting
  const { data: meeting, isLoading: meetingLoading } = useQuery<Meeting>({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      const response = await fetch("/api/meetings");
      if (!response.ok) throw new Error("Failed to fetch meetings");
      const meetings = await response.json();
      const found = meetings.find((m: Meeting) => m.id === meetingId);
      if (!found) throw new Error("Meeting not found");
      return found;
    },
  });

  // Fetch all notes for this meeting
  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ["notes", "meeting", meetingId],
    queryFn: async () => {
      const response = await fetch("/api/notes");
      if (!response.ok) throw new Error("Failed to fetch notes");
      const allNotes = await response.json();

      // Filter notes that belong to this meeting
      return allNotes
        .filter((note: Note) => note.meeting_id === meetingId)
        .sort(
          (a: Note, b: Note) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    },
  });

  if (meetingLoading) {
    return (
      <>
        <AppHeader title="Loading..." />
        <div className="flex-1 px-10 py-6">
          <LoadingPage />
        </div>
      </>
    );
  }

  if (!meeting) {
    return (
      <>
        <AppHeader title="Meeting Not Found" />
        <div className="flex-1 px-10 py-6">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            This meeting doesn't exist or you don't have access to it.
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
            <span className="inline-flex items-center gap-2">
              {meeting.name}
              {meeting.recurring && (
                <Repeat
                  className="h-4 w-4"
                  style={{ color: "var(--accent)" }}
                />
              )}
            </span>
          </>
        }
      />
      <div className="flex-1 px-10 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Series banner - shown for all meetings to handle recurring state */}
          <SeriesBanner
            meeting={meeting}
            lastNote={notes.length > 0 ? notes[0] : null}
            projectId={projectId}
          />

          {notesLoading ? (
            <LoadingPage />
          ) : notes.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No notes yet"
              description={`Create a note and categorize it to "${meeting.name}" to see it here.`}
            />
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} viewContext="specific" />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
