"use client";

import { useRouter, usePathname } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, ArrowRight } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Note, NoteWithLocation } from "@/lib/types";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/lib/use-current-user";

/**
 * Decode the handful of HTML entities that can end up literally in note text
 * (e.g. "&gt;" instead of ">"). Order matters: decode "&amp;" last so a
 * double-encoded entity like "&amp;lt;" doesn't get mangled.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * Clean a single markdown line for preview display: decode entities, turn
 * list/checkbox markers into plain display symbols, and strip inline
 * formatting characters. Must run per-line (not on a pre-joined block of
 * text) since the list/heading/blockquote markers are only ever at the
 * start of their own line.
 */
function cleanMarkdownLine(rawLine: string): string {
  let line = decodeHtmlEntities(rawLine);

  // Heading marker
  line = line.replace(/^#{1,6}\s+/, "");

  // Task list marker → plain checkbox symbol (non-interactive in previews)
  const taskMatch = line.match(/^[-*+]\s*\[([ xX])\]\s+(.*)$/);
  if (taskMatch) {
    const checked = taskMatch[1].toLowerCase() === "x";
    line = `${checked ? "☑" : "☐"} ${taskMatch[2]}`;
  } else {
    // Bullet list marker → plain bullet symbol (ordered list numbers are
    // left as-is, e.g. "1. ", since they already read fine on their own)
    line = line.replace(/^[-*+]\s+/, "• ");
  }

  // Blockquote marker (no border styling in previews, just plain text)
  line = line.replace(/^>\s+/, "");

  // Inline formatting
  line = line
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1");

  // Horizontal rule → drop the line entirely
  if (/^[-*_]{3,}$/.test(line.trim())) return "";

  return line.replace(/\s+/g, " ").trim();
}

/** A markdown table row: starts and ends with "|" and has at least one cell. */
function isTableRowLine(line: string): boolean {
  return /^\|.+\|$/.test(line);
}

function splitTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** The "| --- | :--: |" delimiter row that follows a table's header row. */
function isTableDelimiterRow(line: string): boolean {
  const cells = splitTableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

/**
 * Card previews intentionally don't render the actual table grid (too
 * cramped, and truncation would leave broken-looking cut-off rows) - instead
 * collapse a whole table block into one inline "Table, RxC" summary line,
 * consistent with how images will eventually be indicated once built.
 */
function collapseTableBlocks(lines: string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const headerLine = lines[i];
    const delimiterLine = lines[i + 1];

    if (
      isTableRowLine(headerLine) &&
      delimiterLine !== undefined &&
      isTableRowLine(delimiterLine) &&
      isTableDelimiterRow(delimiterLine)
    ) {
      const cols = splitTableCells(headerLine).length;
      let rows = 1; // header row
      let j = i + 2;
      while (j < lines.length && isTableRowLine(lines[j])) {
        rows++;
        j++;
      }
      result.push(`▦ Table, ${rows}×${cols}`);
      i = j;
    } else {
      result.push(headerLine);
      i++;
    }
  }

  return result;
}

/**
 * Build a card preview snippet that preserves real line breaks between
 * blocks (paragraphs/list items) instead of flattening everything into one
 * run-on sentence. Caps at maxLines blocks; visual truncation within/beyond
 * that is left to the CSS line-clamp on the snippet element.
 */
function buildSnippet(lines: string[], maxLines: number): string {
  return collapseTableBlocks(lines)
    .map(cleanMarkdownLine)
    .filter((line) => line.length > 0)
    .slice(0, maxLines)
    .join("\n");
}

/**
 * NoteCard component - displays a single note in a list view.
 *
 * Context-aware display:
 * - In specific meeting/topic views: hides type badge and location (redundant with breadcrumb)
 * - In mixed views (Recent): shows type badge and location tag
 * - In unsorted view: shows type badge if type was selected, shows "File this →" button
 *
 * Always shows: title (if present), snippet, timestamp, delete button on hover
 * Hover state: border color shifts from --line to --accent
 * Click: navigates to note detail page for editing
 */
interface NoteCardProps {
  note: Note | NoteWithLocation;
  onClick?: () => void;
  /** View context for conditional rendering */
  viewContext?: "specific" | "mixed" | "unsorted";
}

export function NoteCard({
  note,
  onClick,
  viewContext = "specific",
}: NoteCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { data: currentUser } = useCurrentUser();

  // Type guard to check if note has location data
  const noteWithLocation = note as NoteWithLocation;
  const hasLocation =
    noteWithLocation.project_name && noteWithLocation.location_name;

  // Mutation for deleting a note with automatic cleanup
  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete note");
      }
      return response.json();
    },
    onSuccess: (data: {
      success: boolean;
      cleanup?: {
        deletedMeetingId: string | null;
        deletedTopicId: string | null;
      };
    }) => {
      // Invalidate queries immediately - AnimatePresence will handle the exit animation.
      // Bare "notes" prefix (not ["notes", currentUser?.id]) so this also
      // catches the Unsorted/Meeting/Topic list queries, which key on
      // ["notes", "unsorted", ...] / ["notes", "meeting", meetingId, ...] /
      // ["notes", "topic", topicId, ...] and don't share a prefix with
      // ["notes", currentUser?.id]. (The previous "unsorted-notes" /
      // "meeting-notes" / "topic-notes" keys here never matched anything.)
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({
        queryKey: ["note-counts", currentUser?.id],
      });
      // CRITICAL: Also invalidate meetings and topics so sidebar updates when containers are auto-deleted
      queryClient.invalidateQueries({
        queryKey: ["meetings", currentUser?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["topics", currentUser?.id] });
      setShowDeleteDialog(false);

      // Check if we need to redirect due to automatic cleanup
      if (data.cleanup) {
        const { deletedMeetingId, deletedTopicId } = data.cleanup;

        // Parse current path to check if we're viewing the deleted container
        const meetingMatch = pathname?.match(
          /\/projects\/([^/]+)\/meetings\/([^/]+)/,
        );
        const topicMatch = pathname?.match(
          /\/projects\/([^/]+)\/topics\/([^/]+)/,
        );

        let shouldRedirect = false;
        let redirectPath = "/everything"; // Default fallback

        if (deletedMeetingId && meetingMatch?.[2] === deletedMeetingId) {
          // We're viewing the meeting that just got deleted - redirect to parent project
          shouldRedirect = true;
          redirectPath = `/projects/${meetingMatch[1]}`;
        } else if (deletedTopicId && topicMatch?.[2] === deletedTopicId) {
          // We're viewing the topic that just got deleted - redirect to parent project
          shouldRedirect = true;
          redirectPath = `/projects/${topicMatch[1]}`;
        }

        if (shouldRedirect) {
          router.push(redirectPath);
        }
      }
    },
  });

  // Format the date in uppercase format: JAN 15, 2026
  const formattedDate = new Date(note.created_at)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .replace(",", "")
    .toUpperCase();

  // Generate preview text based on whether title exists
  const generatePreview = () => {
    const lines = note.text.split("\n").map((line) => line.trim());
    const nonEmptyLines = lines.filter((line) => line.length > 0);

    if (nonEmptyLines.length === 0) {
      return { hasTitle: false, snippet: "" };
    }

    // Check if first non-empty line is a markdown heading
    const firstLine = nonEmptyLines[0];
    const headingMatch = firstLine.match(/^(#{1,6})\s+(.+)$/);

    if (note.title) {
      // Explicit title exists: generate snippet from body content
      // Skip any leading heading in the body content
      let bodyLines = nonEmptyLines;
      if (headingMatch) {
        // First line is a heading, skip it and use the rest
        bodyLines = nonEmptyLines.slice(1);
      }

      const snippet = buildSnippet(bodyLines, 2);

      return {
        hasTitle: true,
        title: note.title,
        snippet,
      };
    } else if (headingMatch) {
      // No explicit title, but content starts with heading: treat heading as title
      const extractedTitle = headingMatch[2]; // Heading text without # markers
      const bodyLines = nonEmptyLines.slice(1); // Content after the heading

      const snippet = buildSnippet(bodyLines, 2);

      return {
        hasTitle: true,
        title: extractedTitle,
        snippet,
      };
    } else {
      // No title, no leading heading: show entire content as snippet
      const snippet = buildSnippet(nonEmptyLines, 3);

      return {
        hasTitle: false,
        snippet,
      };
    }
  };

  const preview = generatePreview();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/notes/${note.id}`);
    }
  };

  const handleFileThis = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    // Navigate to the note detail page where categorize bar will be shown
    router.push(`/notes/${note.id}?file=true`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    deleteMutation.mutate(note.id);
  };

  return (
    <>
      <motion.div
        layout
        exit={{
          opacity: 0,
          scale: 0.95,
          height: 0,
          marginTop: 0,
          marginBottom: 0,
          paddingTop: 0,
          paddingBottom: 0,
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        transition={{
          duration: 0.3,
          ease: [0.2, 0.8, 0.2, 1],
          layout: {
            duration: 0.3,
            ease: [0.2, 0.8, 0.2, 1],
          },
        }}
        className={cn(
          "relative cursor-pointer rounded-[var(--radius)] border bg-[var(--paper-raised)] p-6 transition-colors overflow-hidden",
          "border-[var(--line)] hover:border-[var(--accent)]",
        )}
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Mixed views: Full header with type badge + location + timestamp + delete */}
        {viewContext === "mixed" && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Badge variant={note.type === "meeting" ? "meeting" : "general"}>
                {note.type}
              </Badge>
              {hasLocation && (
                <span
                  className="text-xs text-[var(--ink-soft)] truncate"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  {noteWithLocation.project_name} /{" "}
                  {noteWithLocation.location_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)]"
                style={{
                  fontFamily: "var(--font-ibm-plex-mono)",
                }}
              >
                {formattedDate}
              </span>
              {isHovered && (
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex h-6 w-6 items-center justify-center rounded-[var(--radius)] text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper)] disabled:opacity-50 cursor-pointer"
                  aria-label="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Specific views: Compact header with just timestamp + delete, no vertical gap */}
        {viewContext === "specific" && (
          <div className="mb-2 flex items-center justify-end gap-2">
            <span
              className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)]"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
              }}
            >
              {formattedDate}
            </span>
            {isHovered && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex h-6 w-6 items-center justify-center rounded-[var(--radius)] text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper)] disabled:opacity-50 cursor-pointer"
                aria-label="Delete note"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Unsorted view: Just timestamp + delete in compact layout */}
        {viewContext === "unsorted" && (
          <div className="mb-2 flex items-center justify-end gap-2">
            <span
              className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)]"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
              }}
            >
              {formattedDate}
            </span>
            {isHovered && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex h-6 w-6 items-center justify-center rounded-[var(--radius)] text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper)] disabled:opacity-50 cursor-pointer"
                aria-label="Delete note"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Note content - title (if present) + snippet */}
        {preview.hasTitle && (
          <h3
            className="mb-2 text-lg font-semibold leading-snug text-[var(--ink)]"
            style={{
              fontFamily: "var(--font-source-serif)",
            }}
          >
            {preview.title}
          </h3>
        )}
        {/* Snippet - preserves real line breaks between blocks (paragraphs/
            list items) rather than flattening them into a run-on sentence;
            visually clamped and auto-ellipsized by line-clamp beyond that. */}
        {preview.snippet && (
          <p
            className="text-base leading-relaxed"
            style={{
              fontFamily: "var(--font-source-serif)",
              color: preview.hasTitle ? "var(--ink-soft)" : "var(--ink)",
              whiteSpace: "pre-line",
              display: "-webkit-box",
              WebkitLineClamp: preview.hasTitle ? 2 : 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {preview.snippet}
          </p>
        )}

        {/* File this button for unsorted notes */}
        {note.is_unsorted && (
          <div className="mt-4">
            <button
              onClick={handleFileThis}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)] underline transition-colors hover:text-[var(--ink)] cursor-pointer"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              File this
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </motion.div>

      {/* Delete confirmation dialog using Radix */}
      <Dialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] bg-[var(--paper-raised)] p-6"
            style={{ boxShadow: "var(--shadow-pop)" }}
          >
            <Dialog.Title
              className="mb-2 text-lg font-semibold text-[var(--ink)]"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              Delete note?
            </Dialog.Title>
            <Dialog.Description
              className="mb-6 text-sm text-[var(--ink-soft)]"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              This action cannot be undone. The note will be permanently
              deleted.
            </Dialog.Description>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete note"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
