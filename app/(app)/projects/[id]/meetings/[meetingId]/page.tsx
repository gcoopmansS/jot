"use client";

import { AppHeader } from "@/components/app-header/app-header";
import { NoteCard } from "@/components/note-card/note-card";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { Note, Meeting } from "@/lib/types";

/**
 * Meeting detail page - shows all notes for a specific meeting.
 *
 * When you click on a meeting in the sidebar, this page displays
 * all notes that belong to that meeting as cards.
 */
export default function MeetingPage() {
  const params = useParams();
  const meetingId = params.meetingId as string;

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
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Loading meeting...
          </p>
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
            {meeting.name}
            {meeting.recurring && (
              <span
                className="ml-2 text-sm"
                style={{ color: "var(--accent)" }}
                title="Recurring meeting"
              >
                ↻
              </span>
            )}
          </>
        }
      />
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
            <p className="text-sm">No notes for this meeting yet.</p>
            <p className="text-xs mt-2">
              Create a note and categorize it to "{meeting.name}" to see it
              here.
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
