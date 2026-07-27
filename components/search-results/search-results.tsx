"use client";

import { NoteWithLocation } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Strip markdown formatting characters from text for clean previews.
 * Reuses the same logic as NoteCard to keep behavior consistent.
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

interface SearchResultsProps {
  results: NoteWithLocation[];
  isLoading: boolean;
  query: string;
  onClose: () => void;
}

/**
 * SearchResults component - displays search results in a dropdown below the search bar.
 *
 * Design:
 * - Absolute positioned dropdown with shadow-pop
 * - Each result shows: type badge, title/preview, location (Project / Meeting or Topic)
 * - Click a result to navigate to the note detail page
 * - Shows loading state, empty state, or results list
 * - Animate in/out with framer-motion
 */
export function SearchResults({
  results,
  isLoading,
  query,
  onClose,
}: SearchResultsProps) {
  const router = useRouter();

  const handleResultClick = (note: NoteWithLocation) => {
    router.push(`/notes/${note.id}`);
    onClose();
  };

  // Don't render anything if there's no query
  if (!query.trim()) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[500px] overflow-y-auto rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)]"
        style={{
          boxShadow: "var(--shadow-pop)",
          maxWidth: "calc(100vw - 32px)", // Ensure it doesn't overflow viewport at narrow widths
        }}
      >
        {/* Loading state */}
        {isLoading && (
          <div className="p-6 text-center text-sm text-[var(--ink-soft)]">
            <p style={{ fontFamily: "var(--font-ibm-plex-sans)" }}>
              Searching...
            </p>
          </div>
        )}

        {/* Empty state - only show if not loading */}
        {!isLoading && results.length === 0 && (
          <div className="p-6 text-center text-sm text-[var(--ink-soft)]">
            <p style={{ fontFamily: "var(--font-ibm-plex-sans)" }}>
              No notes found for "{query}"
            </p>
          </div>
        )}

        {/* Results list */}
        {!isLoading && results.length > 0 && (
          <div className="divide-y divide-[var(--line)]">
            {results.map((note) => {
              // Generate preview text from title or content
              const displayTitle = note.title || stripMarkdown(note.text);
              const preview =
                displayTitle.length > 100
                  ? displayTitle.substring(0, 100) + "..."
                  : displayTitle;

              // Format date
              const formattedDate = new Date(note.created_at)
                .toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
                .replace(",", "")
                .toUpperCase();

              return (
                <button
                  key={note.id}
                  onClick={() => handleResultClick(note)}
                  className={cn(
                    "w-full px-6 py-4 text-left transition-colors hover:bg-[var(--paper)]",
                    "focus:bg-[var(--paper)] focus:outline-none",
                  )}
                >
                  {/* Header: Type badge + Location + Date */}
                  <div className="mb-2 flex items-center gap-2">
                    {/* Type badge */}
                    <Badge
                      variant={note.type === "meeting" ? "meeting" : "general"}
                    >
                      {note.type === "meeting" ? "MEETING" : "GENERAL"}
                    </Badge>

                    {/* Location breadcrumb */}
                    {note.project_name && note.location_name && (
                      <span
                        className="text-xs uppercase tracking-wide text-[var(--ink-soft)]"
                        style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                      >
                        {note.project_name} / {note.location_name}
                      </span>
                    )}

                    {/* Unsorted badge */}
                    {note.is_unsorted && (
                      <Badge variant="unsorted">UNSORTED</Badge>
                    )}

                    {/* Date (pushed to right) */}
                    <span
                      className="ml-auto text-xs uppercase tracking-wide text-[var(--ink-soft)]"
                      style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                    >
                      {formattedDate}
                    </span>
                  </div>

                  {/* Preview text */}
                  <p
                    className="text-sm text-[var(--ink)]"
                    style={{ fontFamily: "var(--font-source-serif)" }}
                  >
                    {preview}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
