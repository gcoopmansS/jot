"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Note } from "@/lib/types";
import { useState } from "react";

/**
 * NoteCard component - displays a single note in a list view.
 *
 * Shows:
 * - Type badge (MEETING or GENERAL)
 * - Timestamp
 * - Preview of note text
 * - Subtle visual hierarchy following the design language
 *
 * Clicking the card navigates to the note detail page for editing.
 */
interface NoteCardProps {
  note: Note;
  onClick?: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
      // Invalidate all note-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["unsorted-notes"] });
      queryClient.invalidateQueries({ queryKey: ["meeting-notes"] });
      queryClient.invalidateQueries({ queryKey: ["topic-notes"] });
      setShowDeleteModal(false);
    },
  });
  // Format the date nicely
  const formattedDate = new Date(note.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(note.id);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  return (
    <>
      <div
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="bg-white border border-[#DEDBCF] rounded-[10px] p-6 transition-colors hover:border-[#5B655F] cursor-pointer relative"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
      {/* Header: Type badge + timestamp + delete button */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-2 py-1 text-xs font-semibold rounded uppercase tracking-wide ${
            note.type === "meeting"
              ? "bg-[#3D6B66] text-white"
              : "bg-[#6B4F8A] text-white"
          }`}
        >
          {note.type}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-xs uppercase tracking-wide"
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              color: "var(--ink-soft)",
            }}
          >
            {formattedDate}
          </span>
          {/* Delete button - appears on hover */}
          {isHovered && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[#F1F0EA] disabled:opacity-50 cursor-pointer"
              style={{ color: "var(--ink-soft)" }}
              aria-label="Delete note"
            >
              {/* Trash can icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 4H13M5.5 4V3C5.5 2.44772 5.94772 2 6.5 2H9.5C10.0523 2 10.5 2.44772 10.5 3V4M6.5 7V11M9.5 7V11M4.5 4L5 13C5 13.5523 5.44772 14 6 14H10C10.5523 14 11 13.5523 11 13L11.5 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Note preview text - in Source Serif 4 to signal this is content */}
      <p
        className="text-base leading-relaxed"
        style={{
          fontFamily: "var(--font-source-serif)",
          color: "var(--ink)",
        }}
      >
        {previewText}
        {isLong && "..."}
      </p>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
          onClick={cancelDelete}
        >
          <div
            className="bg-white rounded-[10px] p-6 max-w-sm w-full mx-4"
            style={{ boxShadow: "var(--shadow-pop)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg font-semibold mb-2"
              style={{
                fontFamily: "var(--font-space-grotesk)",
                color: "var(--ink)",
              }}
            >
              Delete note?
            </h3>
            <p
              className="text-sm mb-6"
              style={{
                fontFamily: "var(--font-ibm-plex-sans)",
                color: "var(--ink-soft)",
              }}
            >
              This action cannot be undone. The note will be permanently
              deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium rounded-[10px] transition-colors"
                style={{
                  fontFamily: "var(--font-ibm-plex-sans)",
                  color: "var(--ink-soft)",
                  textDecoration: "underline",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-semibold rounded-[10px] transition-colors disabled:opacity-50"
                style={{
                  fontFamily: "var(--font-ibm-plex-sans)",
                  backgroundColor: "var(--ink)",
                  color: "var(--paper)",
                }}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
