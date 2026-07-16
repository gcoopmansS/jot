"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, ArrowRight } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Note } from "@/lib/types";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/**
 * NoteCard component - displays a single note in a list view.
 *
 * Shows:
 * - Type badge (MEETING or GENERAL) using Badge component
 * - Timestamp in uppercase IBM Plex Mono format (JAN 15, 2026)
 * - Preview text in Source Serif 4 (signals "this is note content")
 * - "File this →" button for unsorted notes
 * - Delete button (Trash2 icon, visible on hover)
 *
 * Hover state: border color shifts from --line to --ink-soft
 * Click: navigates to note detail page for editing
 */
interface NoteCardProps {
  note: Note;
  onClick?: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Mutation for deleting a note
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
    onSuccess: () => {
      // Invalidate queries immediately - AnimatePresence will handle the exit animation
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["unsorted-notes"] });
      queryClient.invalidateQueries({ queryKey: ["meeting-notes"] });
      queryClient.invalidateQueries({ queryKey: ["topic-notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-counts"] });
      setShowDeleteDialog(false);
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

  // Get first line or first ~150 chars for preview
  const previewText = note.text.split("\n")[0].slice(0, 150);
  const isLong = note.text.length > 150;

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
        {/* Header: Type badge + timestamp + delete button */}
        <div className="mb-3 flex items-center justify-between">
          <Badge variant={note.type === "meeting" ? "meeting" : "general"}>
            {note.type}
          </Badge>
          <div className="flex items-center gap-2">
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

        {/* Note preview text - in Source Serif 4 to signal this is content */}
        <p
          className="text-base leading-relaxed text-[var(--ink)]"
          style={{
            fontFamily: "var(--font-source-serif)",
          }}
        >
          {previewText}
          {isLong && "..."}
        </p>

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
