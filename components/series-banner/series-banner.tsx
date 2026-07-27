"use client";

import { useState } from "react";
import {
  Repeat,
  Clock,
  Users,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Meeting, Note } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCaptureOverlay } from "@/lib/capture-context";
import Link from "next/link";

/**
 * Series Banner - shown above the note list in Meeting detail views.
 *
 * Displays recurring meeting info and provides controls to:
 * - Mark a meeting as recurring (single click, no form)
 * - Edit cadence/attendees (optional enrichments)
 * - Expandable last session preview (inline, read-only)
 * - Quick add note directly to this meeting
 * - Mark as not recurring (preserves data)
 *
 * Design notes:
 * - Only shown for Meetings, never for Note topics (recurring is a Meeting-only concept)
 * - Uses --accent (teal) for recurring state, neutral for non-recurring
 * - "Mark as not recurring" is styled more quietly than other actions
 */

type SeriesBannerProps = {
  meeting: Meeting;
  lastNote?: Note | null;
  projectId: string;
};

/**
 * Strip markdown formatting for clean preview text
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^[\s]*-\s*\[[x\s]\]\s+/gim, "")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    .replace(/^[-*_]{3,}$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function SeriesBanner({
  meeting,
  lastNote,
  projectId,
}: SeriesBannerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { openCaptureWithContext } = useCaptureOverlay();
  const [isEditing, setIsEditing] = useState(false);
  const [isLastSessionExpanded, setIsLastSessionExpanded] = useState(false);
  const [cadenceInput, setCadenceInput] = useState(meeting.cadence || "");
  const [attendeesInput, setAttendeesInput] = useState(meeting.attendees || "");

  // Mutation to update meeting
  const updateMeetingMutation = useMutation({
    mutationFn: async (updates: Partial<Meeting>) => {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update meeting");
      return response.json();
    },
    onSuccess: (updatedMeeting) => {
      // Invalidate the meetings list query (used by sidebar)
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      // Optimistically update the specific meeting query used by this page
      queryClient.setQueryData(["meeting", meeting.id], updatedMeeting);
      // Close the edit form
      setIsEditing(false);
    },
  });

  const handleMarkRecurring = () => {
    updateMeetingMutation.mutate({ recurring: true });
  };

  const handleMarkNotRecurring = () => {
    updateMeetingMutation.mutate({ recurring: false });
  };

  const handleSaveDetails = () => {
    updateMeetingMutation.mutate({
      recurring: true,
      cadence: cadenceInput.trim() || null,
      attendees: attendeesInput.trim() || null,
    });
  };

  const handleCancel = () => {
    setCadenceInput(meeting.cadence || "");
    setAttendeesInput(meeting.attendees || "");
    setIsEditing(false);
  };

  // If not recurring: show simple banner with "Mark as recurring" action
  if (!meeting.recurring) {
    return (
      <div
        className="mb-6 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)] p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--paper)]">
              <Repeat className="h-4 w-4 text-[var(--ink-soft)]" />
            </div>
            <span
              className="text-sm text-[var(--ink-soft)]"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              One-off meeting so far
            </span>
          </div>
          <button
            onClick={handleMarkRecurring}
            className="cursor-pointer text-sm text-[var(--accent)] hover:underline"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            + Mark as recurring
          </button>
        </div>
      </div>
    );
  }

  // If recurring: show full banner with metadata and controls
  return (
    <div
      className="mb-6 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--paper-raised)] p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <Repeat className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div
          className="text-xs uppercase tracking-wide text-[var(--accent)]"
          style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
        >
          Recurring Meeting
        </div>
      </div>

      {/* Edit form (shown when editing) */}
      {isEditing ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1.5 block text-[11px] uppercase tracking-wide text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
              >
                Cadence (optional)
              </label>
              <Input
                value={cadenceInput}
                onChange={(e) => setCadenceInput(e.target.value)}
                placeholder="e.g., Every 3 weeks"
                className="text-sm"
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-[11px] uppercase tracking-wide text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
              >
                Attendees (optional)
              </label>
              <Input
                value={attendeesInput}
                onChange={(e) => setAttendeesInput(e.target.value)}
                placeholder="e.g., Team leads, PM"
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSaveDetails}
              variant="primary"
              size="sm"
              disabled={updateMeetingMutation.isPending}
            >
              {updateMeetingMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="sm"
              disabled={updateMeetingMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Metadata display */}
          {meeting.cadence || meeting.attendees ? (
            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-[var(--ink-soft)]">
              {meeting.cadence && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span style={{ fontFamily: "var(--font-ibm-plex-sans)" }}>
                    {meeting.cadence}
                  </span>
                </div>
              )}
              {meeting.attendees && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span style={{ fontFamily: "var(--font-ibm-plex-sans)" }}>
                    {meeting.attendees}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              className="mb-4 text-sm italic text-[var(--ink-soft)]"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              No cadence or attendees noted — totally optional
            </div>
          )}

          {/* Last session - expandable/collapsible preview */}
          {lastNote && (
            <div className="mb-4 border-t border-[var(--line)] pt-4">
              <button
                onClick={() => setIsLastSessionExpanded(!isLastSessionExpanded)}
                className="group flex w-full cursor-pointer items-center gap-2 text-sm transition-colors"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                {isLastSessionExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[var(--accent)]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[var(--accent)]" />
                )}
                <span className="text-[var(--accent)] group-hover:text-[var(--ink)]">
                  Last session
                </span>
                <span className="text-[var(--ink-soft)]">
                  (
                  {new Date(lastNote.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  )
                </span>
              </button>

              {/* Expandable preview */}
              {isLastSessionExpanded && (
                <div
                  className="mt-3 rounded-[var(--radius)] bg-[var(--paper-raised)] p-4"
                  style={{
                    border: "1px solid var(--line)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  {lastNote.title && (
                    <div
                      className="mb-2 font-semibold text-[var(--ink)]"
                      style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                    >
                      {lastNote.title}
                    </div>
                  )}
                  <div
                    className="text-sm text-[var(--ink-soft)] line-clamp-3"
                    style={{ fontFamily: "var(--font-source-serif)" }}
                  >
                    {stripMarkdown(lastNote.text)}
                  </div>
                  <Link
                    href={`/notes/${lastNote.id}`}
                    className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm text-[var(--accent)] transition-colors hover:text-[var(--ink)]"
                    style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                  >
                    View full note
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 border-t border-[var(--line)] pt-4">
            <button
              onClick={() => {
                openCaptureWithContext({
                  type: "meeting",
                  meetingId: meeting.id,
                  projectId: projectId,
                });
              }}
              className="flex cursor-pointer items-center gap-1.5 text-sm text-[var(--accent)] transition-colors hover:text-[var(--ink)]"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              <Plus className="h-4 w-4" />
              <span>Add note to this meeting</span>
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="cursor-pointer text-sm text-[var(--accent)] hover:underline"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              {meeting.cadence || meeting.attendees
                ? "Edit details"
                : "+ Add cadence / attendees"}
            </button>
            <button
              onClick={handleMarkNotRecurring}
              className="cursor-pointer text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] hover:underline"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Mark as not recurring
            </button>
          </div>
        </>
      )}
    </div>
  );
}
