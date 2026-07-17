"use client";

import { AppHeader } from "@/components/app-header/app-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";
import { FolderOpen, Calendar, BookOpen, Repeat } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Project, Meeting, NoteTopic } from "@/lib/types";

/**
 * Project overview page - shows a summary/index of all meetings and topics in a project.
 *
 * Displays:
 * - Project name in header
 * - List of meetings with note counts (clickable to view that meeting)
 * - List of topics with note counts (clickable to view that topic)
 *
 * This is the landing page when clicking a project name in the sidebar,
 * and the redirect target when a meeting/topic is auto-deleted after
 * removing its last note.
 */
export default function ProjectOverviewPage() {
  const params = useParams();
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

  // Fetch meetings for this project
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery<
    Meeting[]
  >({
    queryKey: ["meetings", projectId],
    queryFn: async () => {
      const response = await fetch("/api/meetings");
      if (!response.ok) throw new Error("Failed to fetch meetings");
      const allMeetings = await response.json();
      return allMeetings.filter((m: Meeting) => m.project_id === projectId);
    },
  });

  // Fetch topics for this project
  const { data: topics = [], isLoading: topicsLoading } = useQuery<NoteTopic[]>(
    {
      queryKey: ["topics", projectId],
      queryFn: async () => {
        const response = await fetch("/api/topics");
        if (!response.ok) throw new Error("Failed to fetch topics");
        const allTopics = await response.json();
        return allTopics.filter((t: NoteTopic) => t.project_id === projectId);
      },
    },
  );

  // Fetch note counts
  const { data: noteCounts } = useQuery({
    queryKey: ["note-counts"],
    queryFn: async () => {
      const response = await fetch("/api/notes");
      if (!response.ok) throw new Error("Failed to fetch notes");
      const notes = await response.json();

      // Count notes by meeting
      const meetingCounts = notes
        .filter((n: any) => n.meeting_id)
        .reduce((acc: Record<string, number>, note: any) => {
          acc[note.meeting_id] = (acc[note.meeting_id] || 0) + 1;
          return acc;
        }, {});

      // Count notes by topic
      const topicCounts = notes
        .filter((n: any) => n.topic_id)
        .reduce((acc: Record<string, number>, note: any) => {
          acc[note.topic_id] = (acc[note.topic_id] || 0) + 1;
          return acc;
        }, {});

      return {
        byMeeting: meetingCounts,
        byTopic: topicCounts,
      };
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

  const totalMeetings = meetings.length;
  const totalTopics = topics.length;
  const hasContent = totalMeetings > 0 || totalTopics > 0;

  return (
    <>
      <AppHeader title={project.name} />
      <div className="flex-1 px-10 py-6">
        {meetingsLoading || topicsLoading ? (
          <LoadingPage />
        ) : !hasContent ? (
          <div className="max-w-3xl mx-auto">
            <EmptyState
              icon={FolderOpen}
              title="No meetings or notes yet"
              description={`Create a note and file it to "${project.name}" to get started.`}
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Meetings section */}
            {meetings.length > 0 && (
              <div>
                <h2
                  className="text-sm uppercase tracking-wide mb-4"
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    color: "var(--ink-soft)",
                  }}
                >
                  Meetings ({meetings.length})
                </h2>
                <div className="space-y-2">
                  {meetings.map((meeting) => {
                    const noteCount = noteCounts?.byMeeting[meeting.id] || 0;
                    return (
                      <Link
                        key={meeting.id}
                        href={`/projects/${projectId}/meetings/${meeting.id}`}
                        className="block rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)] p-4 transition-colors hover:border-[var(--accent)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar
                                className="h-4 w-4"
                                style={{ color: "var(--accent)" }}
                              />
                              <h3
                                className="text-base font-medium"
                                style={{
                                  fontFamily: "var(--font-space-grotesk)",
                                  color: "var(--ink)",
                                }}
                              >
                                {meeting.name}
                              </h3>
                              {meeting.recurring && (
                                <span title="Recurring meeting">
                                  <Repeat
                                    className="h-4 w-4"
                                    style={{ color: "var(--accent)" }}
                                  />
                                </span>
                              )}
                            </div>
                            {(meeting.cadence || meeting.attendees) && (
                              <div className="mt-2 space-y-1">
                                {meeting.cadence && (
                                  <p
                                    className="text-xs"
                                    style={{ color: "var(--ink-soft)" }}
                                  >
                                    <span className="font-medium">
                                      Cadence:
                                    </span>{" "}
                                    {meeting.cadence}
                                  </p>
                                )}
                                {meeting.attendees && (
                                  <p
                                    className="text-xs"
                                    style={{ color: "var(--ink-soft)" }}
                                  >
                                    <span className="font-medium">
                                      Attendees:
                                    </span>{" "}
                                    {meeting.attendees}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <div
                            className="text-right"
                            style={{
                              fontFamily: "var(--font-ibm-plex-mono)",
                              color: "var(--ink-soft)",
                            }}
                          >
                            <div
                              className="text-2xl font-semibold"
                              style={{ color: "var(--accent)" }}
                            >
                              {noteCount}
                            </div>
                            <div className="text-xs uppercase tracking-wide">
                              {noteCount === 1 ? "note" : "notes"}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Topics section */}
            {topics.length > 0 && (
              <div>
                <h2
                  className="text-sm uppercase tracking-wide mb-4"
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono)",
                    color: "var(--ink-soft)",
                  }}
                >
                  Notes ({topics.length}{" "}
                  {topics.length === 1 ? "topic" : "topics"})
                </h2>
                <div className="space-y-2">
                  {topics.map((topic) => {
                    const noteCount = noteCounts?.byTopic[topic.id] || 0;
                    return (
                      <Link
                        key={topic.id}
                        href={`/projects/${projectId}/topics/${topic.id}`}
                        className="block rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)] p-4 transition-colors hover:border-[var(--purple)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <BookOpen
                                className="h-4 w-4"
                                style={{ color: "var(--purple)" }}
                              />
                              <h3
                                className="text-base font-medium"
                                style={{
                                  fontFamily: "var(--font-space-grotesk)",
                                  color: "var(--ink)",
                                }}
                              >
                                {topic.name}
                              </h3>
                            </div>
                          </div>
                          <div
                            className="text-right"
                            style={{
                              fontFamily: "var(--font-ibm-plex-mono)",
                              color: "var(--ink-soft)",
                            }}
                          >
                            <div
                              className="text-2xl font-semibold"
                              style={{ color: "var(--purple)" }}
                            >
                              {noteCount}
                            </div>
                            <div className="text-xs uppercase tracking-wide">
                              {noteCount === 1 ? "note" : "notes"}
                            </div>
                          </div>
                        </div>
                      </Link>
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
