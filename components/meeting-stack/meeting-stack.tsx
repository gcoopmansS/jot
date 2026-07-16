"use client";

import { Repeat, Users, Clock } from "lucide-react";
import type { Note } from "@/lib/types";

/**
 * Recurring meeting stack visual - the signature visual moment.
 *
 * Shows when viewing a recurring meeting. Features:
 * - Stacked card effect suggesting a thread/history
 * - Meeting metadata (cadence, attendees)
 * - "Last session" preview of the most recent note
 * - Teal accent color to match Meeting type
 *
 * This is a distinctive visual element that makes the app feel intentional.
 */

type MeetingStackProps = {
  meetingName: string;
  cadence?: string | null;
  attendees?: string | null;
  lastNote?: Note | null;
};

export function MeetingStack({
  meetingName,
  cadence,
  attendees,
  lastNote,
}: MeetingStackProps) {
  return (
    <div className="relative mb-8">
      {/* Background stacked cards effect */}
      <div
        className="absolute inset-x-0 top-2 h-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)]"
        style={{ opacity: 0.4, transform: "scale(0.98)" }}
      />
      <div
        className="absolute inset-x-0 top-1 h-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)]"
        style={{ opacity: 0.7, transform: "scale(0.99)" }}
      />

      {/* Main card */}
      <div
        className="relative rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--paper-raised)] p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Header with recurring icon */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <Repeat className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <div
              className="text-xs uppercase tracking-wide text-[var(--accent)]"
              style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              Recurring Meeting
            </div>
            <div
              className="text-base font-semibold text-[var(--ink)]"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              {meetingName}
            </div>
          </div>
        </div>

        {/* Metadata row */}
        {(cadence || attendees) && (
          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-[var(--ink-soft)]">
            {cadence && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span style={{ fontFamily: "var(--font-ibm-plex-sans)" }}>
                  {cadence}
                </span>
              </div>
            )}
            {attendees && (
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span style={{ fontFamily: "var(--font-ibm-plex-sans)" }}>
                  {attendees}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Last session preview */}
        {lastNote && (
          <div className="border-t border-[var(--line)] pt-4">
            <div
              className="mb-2 text-xs uppercase tracking-wide text-[var(--ink-soft)]"
              style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              Last session
            </div>
            <div
              className="line-clamp-3 text-sm text-[var(--ink)]"
              style={{ fontFamily: "var(--font-source-serif)" }}
            >
              {lastNote.text}
            </div>
            <div
              className="mt-2 text-xs text-[var(--ink-soft)]"
              style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              {new Date(lastNote.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
