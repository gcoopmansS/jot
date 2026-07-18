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

/**
 * Strip markdown formatting characters from text for clean previews.
 * Converts: **bold** → bold, *italic* → italic, # Heading → Heading, etc.
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
      // Invalidate queries immediately - AnimatePresence will handle the exit animation
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["unsorted-notes"] });
      queryClient.invalidateQueries({ queryKey: ["meeting-notes"] });
      queryClient.invalidateQueries({ queryKey: ["topic-notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-counts"] });
      // CRITICAL: Also invalidate meetings and topics so sidebar updates when containers are auto-deleted
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });
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
    // Skip leading blank lines
    const lines = note.text.split("\n");
    const firstNonEmptyLine = lines.find((line) => line.trim()) || "";

    // Strip markdown formatting for clean preview
    const cleanText = stripMarkdown(firstNonEmptyLine);

    if (note.title) {
      // If there's a title, show a short one-line snippet of the body
      const snippet = cleanText.slice(0, 80);
      const cutAtWordBoundary =
        snippet.length < cleanText.length
          ? snippet.slice(0, snippet.lastIndexOf(" ")) || snippet
          : snippet;
      return {
        hasTitle: true,
        title: note.title,
        snippet: cutAtWordBoundary,
        needsEllipsis: cleanText.length > 80,
      };
    } else {
      // No title: show a longer snippet (up to 150 chars), cut at word boundary
      const snippet = cleanText.slice(0, 150);
      const cutAtWordBoundary =
        snippet.length < cleanText.length
          ? snippet.slice(0, snippet.lastIndexOf(" ")) || snippet
          : snippet;
      return {
        hasTitle: false,
        snippet: cutAtWordBoundary,
        needsEllipsis: cleanText.length > 150,
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
        {/* Header: Type badge + location tag + timestamp + delete button */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Show type badge in mixed views or unsorted view (when type was selected) */}
            {viewContext === "mixed" && (
              <Badge variant={note.type === "meeting" ? "meeting" : "general"}>
                {note.type}
              </Badge>
            )}
            {/* Show location tag in mixed views */}
            {viewContext === "mixed" && hasLocation && (
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
            {/* Delete button - appears on hover */}
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
        {/* Snippet - always shown, properly truncated to 2 lines */}
        {preview.snippet && (
          <p
            className="text-base leading-relaxed"
            style={{
              fontFamily: "var(--font-source-serif)",
              color: preview.hasTitle ? "var(--ink-soft)" : "var(--ink)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
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
