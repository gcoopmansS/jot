"use client";

import { useRouter } from "next/navigation";
import { Note } from "@/lib/types";

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

  return (
    <div
      onClick={handleClick}
      className="bg-white border border-[#DEDBCF] rounded-[10px] p-6 transition-colors hover:border-[#5B655F] cursor-pointer"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Header: Type badge + timestamp */}
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
        <span
          className="text-xs uppercase tracking-wide"
          style={{
            fontFamily: "var(--font-ibm-plex-mono)",
            color: "var(--ink-soft)",
          }}
        >
          {formattedDate}
        </span>
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
  );
}
