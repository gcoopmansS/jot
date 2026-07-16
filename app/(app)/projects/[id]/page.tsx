"use client";

import { AppHeader } from "@/components/app-header/app-header";
import { NoteCard } from "@/components/note-card/note-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import type { Note, Project, Meeting, NoteTopic } from "@/lib/types";

/**
 * Project detail page - shows all notes for a specific project.
 *
 * Displays both meeting notes and general notes organized by their
 * topics. Each note appears as a card.
 */
export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // Fetch the project
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      const projects = await response.json();
      const found = projects.find((p: Project) => p.id === projectId);
      if (!found) throw new Error("Project not found");
      return found;
    },
  });

  // Fetch all notes for this project
  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ["notes", "project", projectId],
    queryFn: async () => {
      const response = await fetch("/api/notes");
      if (!response.ok) throw new Error("Failed to fetch notes");
      const allNotes = await response.json();

      // Filter notes that belong to this project (via meeting or topic)
      const meetingsResponse = await fetch("/api/meetings");
      const meetings: Meeting[] = await meetingsResponse.json();
      const projectMeetingIds = meetings
        .filter((m) => m.project_id === projectId)
        .map((m) => m.id);

      const topicsResponse = await fetch("/api/topics");
      const topics: NoteTopic[] = await topicsResponse.json();
      const projectTopicIds = topics
        .filter((t) => t.project_id === projectId)
        .map((t) => t.id);

      return allNotes.filter(
        (note: Note) =>
          (note.meeting_id && projectMeetingIds.includes(note.meeting_id)) ||
          (note.topic_id && projectTopicIds.includes(note.topic_id)),
      );
    },
  });

  // Fetch meetings and topics for grouping
  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["meetings", projectId],
    queryFn: async () => {
      const response = await fetch("/api/meetings");
      if (!response.ok) throw new Error("Failed to fetch meetings");
      const allMeetings = await response.json();
      return allMeetings.filter((m: Meeting) => m.project_id === projectId);
    },
  });

  const { data: topics = [] } = useQuery<NoteTopic[]>({
    queryKey: ["topics", projectId],
    queryFn: async () => {
      const response = await fetch("/api/topics");
      if (!response.ok) throw new Error("Failed to fetch topics");
      const allTopics = await response.json();
      return allTopics.filter((t: NoteTopic) => t.project_id === projectId);
    },
  });

  if (projectLoading) {
    return (
      <>
        <AppHeader title="Loading..." />
        <div className="flex-1 px-10 py-6">
          <LoadingPage />
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <AppHeader title="Project Not Found" />
        <div className="flex-1 px-10 py-6">
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Project not found.
          </p>
        </div>
      </>
    );
  }

  // Group notes by meeting and topic
  const meetingNotes = notes.filter((n) => n.meeting_id);
  const topicNotes = notes.filter((n) => n.topic_id);

  return (
    <>
      <AppHeader title={project.name} />
      <div className="flex-1 px-10 py-6">
        {notesLoading ? (
          <LoadingPage />
        ) : notes.length === 0 ? (
          <div className="max-w-3xl mx-auto">
            <EmptyState
              icon={FolderOpen}
              title="No notes in this project yet"
              description={`Create a note and file it to "${project.name}" to see it here.`}
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Meeting notes section */}
            {meetingNotes.length > 0 && (
              <div>
                <h2
                  className="text-sm uppercase tracking-wide mb-4"
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    color: "var(--ink-soft)",
                  }}
                >
                  Meeting Notes
                </h2>
                <div className="space-y-4">
                  {meetings.map((meeting) => {
                    const meetingNotesFiltered = meetingNotes.filter(
                      (n) => n.meeting_id === meeting.id,
                    );
                    if (meetingNotesFiltered.length === 0) return null;

                    return (
                      <div key={meeting.id}>
                        <h3
                          className="text-base font-medium mb-3 flex items-center gap-2"
                          style={{
                            fontFamily: "var(--font-space-grotesk)",
                            color: "var(--ink)",
                          }}
                        >
                          {meeting.name}
                          {meeting.recurring && (
                            <span
                              style={{ color: "var(--accent)" }}
                              title="Recurring meeting"
                            >
                              ↻
                            </span>
                          )}
                        </h3>
                        <div className="space-y-4">
                          {meetingNotesFiltered.map((note) => (
                            <NoteCard key={note.id} note={note} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Topic notes section */}
            {topicNotes.length > 0 && (
              <div>
                <h2
                  className="text-sm uppercase tracking-wide mb-4"
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    color: "var(--ink-soft)",
                  }}
                >
                  General Notes
                </h2>
                <div className="space-y-4">
                  {topics.map((topic) => {
                    const topicNotesFiltered = topicNotes.filter(
                      (n) => n.topic_id === topic.id,
                    );
                    if (topicNotesFiltered.length === 0) return null;

                    return (
                      <div key={topic.id}>
                        <h3
                          className="text-base font-medium mb-3"
                          style={{
                            fontFamily: "var(--font-space-grotesk)",
                            color: "var(--ink)",
                          }}
                        >
                          {topic.name}
                        </h3>
                        <div className="space-y-4">
                          {topicNotesFiltered.map((note) => (
                            <NoteCard key={note.id} note={note} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
