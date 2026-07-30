"use client";

import { useState, useCallback } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutocompleteInput } from "@/components/capture/autocomplete-input";

/**
 * Strip markdown formatting characters from text for clean previews.
 * This is the SAME logic used in the real NoteCard component.
 */
function stripMarkdown(text: string): string {
  return (
    text
      // Remove headings (# ## ###)
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold (**text** or __text__)
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      // Remove italic (*text* or _text_)
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      // Remove inline code (`code`)
      .replace(/`(.+?)`/g, "$1")
      // Remove links [text](url) → text
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      // Remove blockquote markers (>)
      .replace(/^>\s+/gm, "")
      // Remove task list markers (- [ ] and - [x])
      .replace(/^[\s]*-\s*\[[x\s]\]\s+/gim, "")
      // Remove list markers (-, *, +, 1.)
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Remove horizontal rules (---, ***, ___)
      .replace(/^[-*_]{3,}$/gm, "")
      // Clean up multiple spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Mini NoteCard for the demo - matches the real app's design
 */
function DemoNoteCard({
  note,
  meeting,
  topic,
  showLocation = true,
}: {
  note: DemoNote;
  meeting?: DemoMeeting;
  topic?: DemoTopic;
  showLocation?: boolean;
}) {
  const cleanText = stripMarkdown(note.text);
  const snippet =
    cleanText.length > 150 ? cleanText.slice(0, 150) + "..." : cleanText;

  const formattedDate = new Date(note.createdAt)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    .toUpperCase();

  return (
    <div
      className="bg-[var(--paper-raised)] border border-[var(--line)] rounded-[var(--radius)] p-4 hover:border-[var(--accent)] transition-colors cursor-default"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Header: badges and metadata */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={note.type === "meeting" ? "meeting" : "general"}>
            {note.type}
          </Badge>
          {showLocation && (meeting || topic) && (
            <span
              className="text-xs text-[var(--ink-soft)]"
              style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              {meeting?.name || topic?.name}
            </span>
          )}
        </div>
        <span
          className="text-xs text-[var(--ink-soft)] whitespace-nowrap"
          style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
        >
          {formattedDate}
        </span>
      </div>

      {/* Title */}
      {note.title && (
        <h3
          className="font-semibold text-[var(--ink)] mb-2 text-sm"
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          {note.title}
        </h3>
      )}

      {/* Snippet */}
      <p
        className="text-sm text-[var(--ink-soft)] leading-relaxed"
        style={{ fontFamily: "var(--font-source-serif)" }}
      >
        {snippet}
      </p>
    </div>
  );
}

/**
 * Interactive demo of the Jot capture flow for the landing page.
 *
 * This is a self-contained demo that:
 * - Reuses real UI components (rich text editor, note cards, categorize bar, etc.)
 * - Runs entirely on local React state (no API calls, no database)
 * - Resets on page refresh
 * - Is clearly labeled as a demo to avoid confusion with the real app
 *
 * Seed data: Multiple projects with meetings, topics, and notes to show a realistic populated view.
 */

type DemoNote = {
  id: string;
  text: string;
  title?: string;
  type: "meeting" | "general";
  projectId?: string;
  topicId?: string;
  meetingId?: string;
  isUnsorted: boolean;
  createdAt: Date;
};

type DemoProject = {
  id: string;
  name: string;
};

type DemoTopic = {
  id: string;
  name: string;
  projectId: string;
};

type DemoMeeting = {
  id: string;
  name: string;
  projectId: string;
};

// Seed data - multiple projects with notes to show a realistic view
const SEED_PROJECTS: DemoProject[] = [
  { id: "demo-project-1", name: "Client Migration" },
  { id: "demo-project-2", name: "Internal Tooling" },
];

const SEED_MEETINGS: DemoMeeting[] = [
  { id: "demo-meeting-1", name: "Kickoff call", projectId: "demo-project-1" },
  { id: "demo-meeting-2", name: "Weekly sync", projectId: "demo-project-1" },
  { id: "demo-meeting-3", name: "Team standup", projectId: "demo-project-2" },
  { id: "demo-meeting-4", name: "Design review", projectId: "demo-project-2" },
];

const SEED_TOPICS: DemoTopic[] = [
  { id: "demo-topic-1", name: "Requirements", projectId: "demo-project-1" },
  {
    id: "demo-topic-2",
    name: "Architecture notes",
    projectId: "demo-project-2",
  },
  { id: "demo-topic-4", name: "Risk analysis", projectId: "demo-project-1" },
];

const SEED_NOTES: DemoNote[] = [
  {
    id: "demo-note-1",
    text: "Discussed initial timeline and key stakeholders. **Next steps:** set up shared workspace and schedule technical deep-dive for next week.",
    title: "Project kickoff",
    type: "meeting",
    projectId: "demo-project-1",
    meetingId: "demo-meeting-1",
    isUnsorted: false,
    createdAt: new Date("2024-07-10T14:30:00"),
  },
  {
    id: "demo-note-2",
    text: "Follow-up on database schema. Team is aligned on the migration approach. Need to finalize the rollback plan by Friday.",
    type: "meeting",
    projectId: "demo-project-1",
    meetingId: "demo-meeting-2",
    isUnsorted: false,
    createdAt: new Date("2024-07-12T10:00:00"),
  },
  {
    id: "demo-note-3",
    text: "Three main risks identified: **1)** Timeline dependency on external vendor, **2)** Data validation gaps in legacy system, **3)** Resource constraints during holiday season.",
    title: "Migration risks",
    type: "general",
    projectId: "demo-project-1",
    topicId: "demo-topic-4",
    isUnsorted: false,
    createdAt: new Date("2024-07-11T16:20:00"),
  },
  {
    id: "demo-note-4",
    text: "Current authentication flow has performance bottleneck. Discussed caching strategy and rate limiting approach.",
    type: "meeting",
    projectId: "demo-project-2",
    meetingId: "demo-meeting-3",
    isUnsorted: false,
    createdAt: new Date("2024-07-13T09:15:00"),
  },
  {
    id: "demo-note-5",
    text: "New dashboard prototype looks promising. **Decision:** proceed with user testing next sprint.",
    type: "meeting",
    projectId: "demo-project-2",
    meetingId: "demo-meeting-4",
    isUnsorted: false,
    createdAt: new Date("2024-07-14T15:00:00"),
  },
];

export function InteractiveDemo() {
  // Core state
  const [notes, setNotes] = useState<DemoNote[]>(SEED_NOTES);
  const [projects, setProjects] = useState<DemoProject[]>(SEED_PROJECTS);
  const [topics, setTopics] = useState<DemoTopic[]>(SEED_TOPICS);
  const [meetings, setMeetings] = useState<DemoMeeting[]>(SEED_MEETINGS);

  // Active view state - default to Team standup
  const [activeMeetingId, setActiveMeetingId] = useState<string | undefined>(
    "demo-meeting-3",
  );
  const [activeTopicId, setActiveTopicId] = useState<string | undefined>();

  // Capture flow state
  const [showCapture, setShowCapture] = useState(false);
  const [captureText, setCaptureText] = useState("");
  const [showCategorize, setShowCategorize] = useState(false);

  // Categorize form state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteType, setNoteType] = useState<"meeting" | "general" | null>(null);
  const [projectInput, setProjectInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >();
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>();
  const [selectedMeetingId, setSelectedMeetingId] = useState<
    string | undefined
  >();

  // Open capture overlay
  const handleNewNote = useCallback(() => {
    setCaptureText("");
    setShowCapture(true);
    setShowCategorize(false);
  }, []);

  // Finish writing and show categorize bar
  const handleFinishCapture = useCallback(() => {
    if (captureText.trim()) {
      // Keep capture overlay open, just show categorize bar
      setShowCategorize(true);
      // Extract first line as suggested title
      const firstLine = captureText.split("\n")[0].slice(0, 50);
      setNoteTitle(firstLine);
    } else {
      // Empty note, just close
      setShowCapture(false);
    }
  }, [captureText]);

  // Cancel capture
  const handleCancelCapture = useCallback(() => {
    setShowCapture(false);
    setShowCategorize(false);
    setCaptureText("");
  }, []);

  // Back to editing from categorize bar
  const handleBackToEditing = useCallback(() => {
    setShowCategorize(false);
  }, []);

  // Reset categorize state
  const resetCategorize = useCallback(() => {
    setShowCategorize(false);
    setShowCapture(false);
    setCaptureText("");
    setNoteTitle("");
    setNoteType(null);
    setProjectInput("");
    setTopicInput("");
    setSelectedProjectId(undefined);
    setSelectedTopicId(undefined);
    setSelectedMeetingId(undefined);
  }, []);

  // Save note with categorization
  const handleSaveNote = useCallback(() => {
    if (!captureText.trim() || !noteType) return;

    const newNote: DemoNote = {
      id: `demo-note-${Date.now()}`,
      text: captureText,
      title: noteTitle || undefined,
      type: noteType,
      projectId: selectedProjectId,
      topicId: noteType === "general" ? selectedTopicId : undefined,
      meetingId: noteType === "meeting" ? selectedMeetingId : undefined,
      isUnsorted: false,
      createdAt: new Date(),
    };

    // Create project if needed
    if (projectInput && !selectedProjectId) {
      const newProject: DemoProject = {
        id: `demo-project-${Date.now()}`,
        name: projectInput,
      };
      setProjects((prev) => [...prev, newProject]);
      newNote.projectId = newProject.id;

      // Create topic/meeting if needed - look up by name first!
      if (noteType === "general" && topicInput) {
        const existingTopic = topics.find(
          (t) =>
            t.projectId === newProject.id &&
            t.name.toLowerCase() === topicInput.toLowerCase(),
        );
        if (existingTopic) {
          newNote.topicId = existingTopic.id;
        } else {
          const newTopic: DemoTopic = {
            id: `demo-topic-${Date.now()}`,
            name: topicInput,
            projectId: newProject.id,
          };
          setTopics((prev) => [...prev, newTopic]);
          newNote.topicId = newTopic.id;
        }
      } else if (noteType === "meeting" && topicInput) {
        const existingMeeting = meetings.find(
          (m) =>
            m.projectId === newProject.id &&
            m.name.toLowerCase() === topicInput.toLowerCase(),
        );
        if (existingMeeting) {
          newNote.meetingId = existingMeeting.id;
        } else {
          const newMeeting: DemoMeeting = {
            id: `demo-meeting-${Date.now()}`,
            name: topicInput,
            projectId: newProject.id,
          };
          setMeetings((prev) => [...prev, newMeeting]);
          newNote.meetingId = newMeeting.id;
        }
      }
    } else if (selectedProjectId) {
      // Project exists, maybe create topic/meeting - look up by name first!
      if (noteType === "general" && topicInput && !selectedTopicId) {
        const existingTopic = topics.find(
          (t) =>
            t.projectId === selectedProjectId &&
            t.name.toLowerCase() === topicInput.toLowerCase(),
        );
        if (existingTopic) {
          newNote.topicId = existingTopic.id;
        } else {
          const newTopic: DemoTopic = {
            id: `demo-topic-${Date.now()}`,
            name: topicInput,
            projectId: selectedProjectId,
          };
          setTopics((prev) => [...prev, newTopic]);
          newNote.topicId = newTopic.id;
        }
      } else if (noteType === "meeting" && topicInput && !selectedMeetingId) {
        const existingMeeting = meetings.find(
          (m) =>
            m.projectId === selectedProjectId &&
            m.name.toLowerCase() === topicInput.toLowerCase(),
        );
        if (existingMeeting) {
          newNote.meetingId = existingMeeting.id;
        } else {
          const newMeeting: DemoMeeting = {
            id: `demo-meeting-${Date.now()}`,
            name: topicInput,
            projectId: selectedProjectId,
          };
          setMeetings((prev) => [...prev, newMeeting]);
          newNote.meetingId = newMeeting.id;
        }
      }
    }

    setNotes((prev) => [...prev, newNote]);
    resetCategorize();
  }, [
    captureText,
    noteTitle,
    noteType,
    projectInput,
    topicInput,
    selectedProjectId,
    selectedTopicId,
    selectedMeetingId,
    topics,
    meetings,
    resetCategorize,
  ]);

  // Skip categorization (keep in unsorted)
  const handleSkipCategorize = useCallback(() => {
    if (!captureText.trim()) return;

    const newNote: DemoNote = {
      id: `demo-note-${Date.now()}`,
      text: captureText,
      title: noteTitle || undefined,
      type: "general",
      isUnsorted: true,
      createdAt: new Date(),
    };

    setNotes((prev) => [...prev, newNote]);
    resetCategorize();
  }, [captureText, noteTitle, resetCategorize]);

  // Get project-filtered topics/meetings
  const availableTopics = topics.filter(
    (t) => !selectedProjectId || t.projectId === selectedProjectId,
  );
  const availableMeetings = meetings.filter(
    (m) => !selectedProjectId || m.projectId === selectedProjectId,
  );

  // Group notes by project/location
  const unsortedNotes = notes.filter((n) => n.isUnsorted);
  const filedNotes = notes.filter((n) => !n.isUnsorted);

  return (
    <div className="relative">
      {/* Demo container */}
      <div className="bg-[var(--paper-raised)] rounded-[var(--radius)] border-2 border-[var(--accent)] relative overflow-hidden">
        {/* Mini app shell - header with new note button */}
        <div className="border-b border-[var(--line)] bg-[var(--paper-raised)] px-6 py-4 flex items-center justify-between">
          <h2
            className="text-lg font-semibold text-[var(--ink)]"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Try Jot
          </h2>
          <button
            onClick={handleNewNote}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--ink)] text-[var(--paper)] rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors text-sm font-medium cursor-pointer"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            <Plus className="h-4 w-4" />
            New note
          </button>
        </div>

        {/* Main demo area: sidebar + content. Stacked on narrow viewports
            (fixed-width sidebar + flex-1 content squeezed the content pane
            to near-nothing below md) - sidebar gets a capped height on
            mobile instead of sharing the row with content. */}
        <div className="flex flex-col md:flex-row" style={{ height: "500px" }}>
          {/* Sidebar */}
          <div
            className="w-full md:w-56 flex-shrink-0 max-h-40 md:max-h-none border-b md:border-b-0 md:border-r border-[var(--line)] bg-[var(--paper)] overflow-y-auto"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            <nav className="p-4 space-y-4">
              {/* Unsorted */}
              {unsortedNotes.length > 0 && (
                <div>
                  <button className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-[var(--paper-raised)] transition-colors text-left cursor-pointer">
                    <span className="text-sm text-[var(--ink)]">Unsorted</span>
                    <Badge variant="count">{unsortedNotes.length}</Badge>
                  </button>
                </div>
              )}

              {/* Projects section */}
              {projects.filter((p) =>
                filedNotes.some((n) => n.projectId === p.id),
              ).length > 0 && (
                <>
                  <div className="px-3 pt-2">
                    <div
                      className="text-xs uppercase tracking-wide text-[var(--ink-soft)] font-medium"
                      style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                    >
                      Projects
                    </div>
                  </div>

                  {/* Project list */}
                  <div className="space-y-4">
                    {projects.map((project) => {
                      const projectNotes = filedNotes.filter(
                        (n) => n.projectId === project.id,
                      );
                      if (projectNotes.length === 0) return null;

                      const projectMeetings = meetings.filter(
                        (m) =>
                          m.projectId === project.id &&
                          projectNotes.some((n) => n.meetingId === m.id),
                      );
                      const projectTopics = topics.filter(
                        (t) =>
                          t.projectId === project.id &&
                          projectNotes.some((n) => n.topicId === t.id),
                      );

                      return (
                        <div key={project.id}>
                          {/* Project name */}
                          <button className="w-full flex items-center gap-2 px-3 py-1 text-left cursor-pointer">
                            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 rotate-90 text-[var(--ink-soft)]" />
                            <span className="text-sm font-medium text-[var(--ink)]">
                              {project.name}
                            </span>
                          </button>

                          {/* Meetings subsection */}
                          {projectMeetings.length > 0 && (
                            <div className="mt-2">
                              <div className="px-3 py-1">
                                <div
                                  className="text-xs uppercase tracking-wide text-[var(--ink-soft)]"
                                  style={{
                                    fontFamily: "var(--font-ibm-plex-mono)",
                                  }}
                                >
                                  Meetings
                                </div>
                              </div>
                              <div className="space-y-1 mt-1">
                                {projectMeetings.map((meeting) => {
                                  const meetingNotes = projectNotes.filter(
                                    (n) => n.meetingId === meeting.id,
                                  );
                                  const isActive =
                                    activeMeetingId === meeting.id;
                                  return (
                                    <button
                                      key={meeting.id}
                                      onClick={() => {
                                        setActiveMeetingId(meeting.id);
                                        setActiveTopicId(undefined);
                                      }}
                                      className={`w-full flex items-center justify-between px-6 py-2 rounded transition-colors text-left cursor-pointer ${
                                        isActive
                                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                                          : "hover:bg-[var(--paper-raised)] text-[var(--ink)]"
                                      }`}
                                    >
                                      <span className="text-sm truncate font-medium">
                                        {meeting.name}
                                      </span>
                                      <Badge variant="count">
                                        {meetingNotes.length}
                                      </Badge>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Notes (topics) subsection */}
                          {projectTopics.length > 0 && (
                            <div className="mt-2">
                              <div className="px-3 py-1">
                                <div
                                  className="text-xs uppercase tracking-wide text-[var(--ink-soft)]"
                                  style={{
                                    fontFamily: "var(--font-ibm-plex-mono)",
                                  }}
                                >
                                  Notes
                                </div>
                              </div>
                              <div className="space-y-1 mt-1">
                                {projectTopics.map((topic) => {
                                  const topicNotes = projectNotes.filter(
                                    (n) => n.topicId === topic.id,
                                  );
                                  const isActive = activeTopicId === topic.id;
                                  return (
                                    <button
                                      key={topic.id}
                                      onClick={() => {
                                        setActiveTopicId(topic.id);
                                        setActiveMeetingId(undefined);
                                      }}
                                      className={`w-full flex items-center justify-between px-6 py-2 rounded transition-colors text-left cursor-pointer ${
                                        isActive
                                          ? "bg-[var(--purple-soft)] text-[var(--purple)]"
                                          : "hover:bg-[var(--paper-raised)] text-[var(--ink)]"
                                      }`}
                                    >
                                      <span className="text-sm truncate font-medium">
                                        {topic.name}
                                      </span>
                                      <Badge variant="count">
                                        {topicNotes.length}
                                      </Badge>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Empty state in sidebar */}
              {notes.length === 0 && (
                <div className="px-3 py-8 text-center">
                  <p className="text-xs text-[var(--ink-soft)]">No notes yet</p>
                </div>
              )}
            </nav>
          </div>

          {/* Main content area */}
          <div className="flex-1 min-w-0 min-h-0 overflow-y-auto relative">
            <div className="p-6">
              {activeMeetingId ? (
                <div>
                  {/* Meeting header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <h2
                        className="text-2xl font-semibold text-[var(--ink)]"
                        style={{ fontFamily: "var(--font-space-grotesk)" }}
                      >
                        {meetings.find((m) => m.id === activeMeetingId)?.name}
                      </h2>
                      <Badge variant="meeting">Meeting</Badge>
                    </div>
                    <p
                      className="text-sm text-[var(--ink-soft)]"
                      style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                    >
                      {
                        projects.find(
                          (p) =>
                            p.id ===
                            meetings.find((m) => m.id === activeMeetingId)
                              ?.projectId,
                        )?.name
                      }
                    </p>
                  </div>

                  {/* Meeting notes */}
                  <div className="space-y-3">
                    {notes
                      .filter((n) => n.meetingId === activeMeetingId)
                      .map((note) => {
                        const meeting = meetings.find(
                          (m) => m.id === note.meetingId,
                        );
                        return (
                          <DemoNoteCard
                            key={note.id}
                            note={note}
                            meeting={meeting}
                          />
                        );
                      })}
                  </div>
                </div>
              ) : activeTopicId ? (
                <div>
                  {/* Topic header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <h2
                        className="text-2xl font-semibold text-[var(--ink)]"
                        style={{ fontFamily: "var(--font-space-grotesk)" }}
                      >
                        {topics.find((t) => t.id === activeTopicId)?.name}
                      </h2>
                      <Badge variant="general">General</Badge>
                    </div>
                    <p
                      className="text-sm text-[var(--ink-soft)]"
                      style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                    >
                      {
                        projects.find(
                          (p) =>
                            p.id ===
                            topics.find((t) => t.id === activeTopicId)
                              ?.projectId,
                        )?.name
                      }
                    </p>
                  </div>

                  {/* Topic notes */}
                  <div className="space-y-3">
                    {notes
                      .filter((n) => n.topicId === activeTopicId)
                      .map((note) => {
                        const topic = topics.find((t) => t.id === note.topicId);
                        return (
                          <DemoNoteCard
                            key={note.id}
                            note={note}
                            topic={topic}
                          />
                        );
                      })}
                  </div>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-16">
                  <p
                    className="text-[var(--ink-soft)] mb-2"
                    style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                  >
                    Click &quot;+ New note&quot; to start
                  </p>
                  <p
                    className="text-sm text-[var(--ink-soft)]"
                    style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                  >
                    Try the capture flow, rich text editor, and categorization
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Unsorted section */}
                  {unsortedNotes.length > 0 && (
                    <div>
                      <h3
                        className="text-sm uppercase tracking-wide text-[var(--ink-soft)] mb-3"
                        style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                      >
                        Unsorted
                      </h3>
                      <div className="space-y-3">
                        {unsortedNotes.map((note) => (
                          <DemoNoteCard
                            key={note.id}
                            note={note}
                            showLocation={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filed notes by project */}
                  {projects.map((project) => {
                    const projectNotes = filedNotes.filter(
                      (n) => n.projectId === project.id,
                    );
                    if (projectNotes.length === 0) return null;

                    return (
                      <div key={project.id}>
                        <h3
                          className="text-sm font-medium text-[var(--ink)] mb-3"
                          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                        >
                          {project.name}
                        </h3>
                        <div className="space-y-3">
                          {projectNotes.map((note) => {
                            const meeting = meetings.find(
                              (m) => m.id === note.meetingId,
                            );
                            const topic = topics.find(
                              (t) => t.id === note.topicId,
                            );
                            return (
                              <DemoNoteCard
                                key={note.id}
                                note={note}
                                meeting={meeting}
                                topic={topic}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Capture overlay - contained within demo */}
      <AnimatePresence>
        {showCapture && (
          <motion.div
            className="absolute inset-1 bg-[var(--paper-raised)] rounded-[var(--radius)] z-20 flex flex-col overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Close button */}
            <button
              onClick={handleCancelCapture}
              className="absolute top-4 right-4 text-2xl text-[var(--ink-soft)] hover:bg-[var(--paper)] rounded-[var(--radius)] w-10 h-10 flex items-center justify-center transition-colors z-10 cursor-pointer"
              aria-label="Close"
            >
              ×
            </button>

            {/* Editor */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl">
                <RichTextEditor
                  content={captureText}
                  onChange={setCaptureText}
                  placeholder="Start writing..."
                  onSave={handleFinishCapture}
                  autofocus
                />
              </div>
            </div>

            {/* Hint - only show when categorize bar is not visible */}
            {!showCategorize && (
              <div className="pb-6 text-center">
                <p
                  className="text-sm text-[var(--ink-soft)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  Press <Kbd>⌘</Kbd> <Kbd>Enter</Kbd> when done
                </p>
                <Button
                  onClick={handleFinishCapture}
                  className="mt-3"
                  disabled={!captureText.trim()}
                >
                  Done writing
                </Button>
              </div>
            )}

            {/* Categorize bar - overlays the editor from bottom */}
            <AnimatePresence>
              {showCategorize && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-[var(--paper-raised)] border-t-2 border-[var(--accent)]"
                  style={{ boxShadow: "0 -12px 32px rgba(27,37,33,0.16)" }}
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{
                    duration: 0.3,
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                >
                  <div className="px-6 py-4 max-h-80 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3
                        className="text-base font-semibold text-[var(--ink)]"
                        style={{ fontFamily: "var(--font-space-grotesk)" }}
                      >
                        What&apos;s this note about?
                      </h3>
                      <button
                        onClick={handleBackToEditing}
                        className="text-[var(--ink-soft)] hover:text-[var(--ink)] text-xs underline cursor-pointer"
                        style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                      >
                        Back to editing
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Title */}
                      <div>
                        <label
                          className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1"
                          style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                        >
                          Title (optional)
                        </label>
                        <input
                          type="text"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="Give it a name"
                          className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-[var(--radius)] bg-[var(--paper)] focus:outline-none focus:border-[var(--accent)] transition-colors text-[var(--ink)]"
                          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                        />
                      </div>

                      {/* Type */}
                      <div>
                        <label
                          className="block text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1"
                          style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                        >
                          Type
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setNoteType("meeting")}
                            className={`flex-1 py-2 px-3 text-sm rounded-[var(--radius)] font-medium transition-colors cursor-pointer ${
                              noteType === "meeting"
                                ? "bg-[var(--accent)] text-white"
                                : "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--accent)]"
                            }`}
                            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                          >
                            Meeting
                          </button>
                          <button
                            onClick={() => setNoteType("general")}
                            className={`flex-1 py-2 px-3 text-sm rounded-[var(--radius)] font-medium transition-colors cursor-pointer ${
                              noteType === "general"
                                ? "bg-[var(--purple)] text-white"
                                : "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--purple)]"
                            }`}
                            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                          >
                            General
                          </button>
                        </div>
                      </div>

                      {/* Project */}
                      <div>
                        <AutocompleteInput
                          value={projectInput}
                          onChange={(value) => {
                            setProjectInput(value);
                            const match = projects.find(
                              (p) =>
                                p.name.toLowerCase() === value.toLowerCase(),
                            );
                            setSelectedProjectId(match?.id);
                          }}
                          options={projects.map((p) => ({
                            id: p.id,
                            name: p.name,
                          }))}
                          placeholder="Type to create or select"
                          label="Project (optional)"
                        />
                      </div>

                      {/* Topic/Meeting name */}
                      {noteType && (
                        <div>
                          <AutocompleteInput
                            value={topicInput}
                            onChange={(value) => {
                              setTopicInput(value);
                              if (noteType === "meeting") {
                                const match = meetings.find(
                                  (m) =>
                                    m.name.toLowerCase() ===
                                    value.toLowerCase(),
                                );
                                setSelectedMeetingId(match?.id);
                              } else {
                                const match = topics.find(
                                  (t) =>
                                    t.name.toLowerCase() ===
                                    value.toLowerCase(),
                                );
                                setSelectedTopicId(match?.id);
                              }
                            }}
                            options={
                              noteType === "meeting"
                                ? availableMeetings.map((m) => ({
                                    id: m.id,
                                    name: m.name,
                                  }))
                                : availableTopics.map((t) => ({
                                    id: t.id,
                                    name: t.name,
                                  }))
                            }
                            placeholder="Type to create or select"
                            label={`${noteType === "meeting" ? "Meeting" : "Topic"} (optional)`}
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-4 pt-2">
                        <Button
                          onClick={handleSaveNote}
                          disabled={!noteType}
                          className="text-sm"
                        >
                          Save note
                        </Button>
                        <button
                          onClick={handleSkipCategorize}
                          className="text-[var(--ink-soft)] hover:text-[var(--ink)] text-xs underline cursor-pointer"
                          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                        >
                          Keep in Unsorted
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
