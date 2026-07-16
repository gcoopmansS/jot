"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCaptureOverlay } from "@/lib/capture-context";
import { CategorizeBar } from "./categorize-bar";
import { Kbd } from "@/components/ui/kbd";

/**
 * Full-screen capture overlay for writing notes.
 *
 * This is the sacred capture flow: just a textarea, no forms, no required fields.
 * User can start typing immediately. ESC or clicking X shows the categorize bar.
 *
 * Uses Framer Motion for fade-in/scale animation (one of the two deliberate animations).
 * Textarea uses Source Serif 4 to feel distinct from UI chrome.
 */
export function CaptureOverlay() {
  const { isOpen, closeCapture } = useCaptureOverlay();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [showCategorize, setShowCategorize] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when overlay opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Handle ESC key to show categorize bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !showCategorize) {
        setShowCategorize(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showCategorize]);

  // Reset state when overlay closes
  useEffect(() => {
    if (!isOpen) {
      setText("");
      setShowCategorize(false);
      setIsSaving(false);
    }
  }, [isOpen]);

  // Show categorize bar when user clicks close or presses ESC
  const handleClose = () => {
    if (!text.trim()) {
      // If there's no text, just close without showing categorize
      closeCapture();
      return;
    }
    setShowCategorize(true);
  };

  // Save the note with categorization
  const handleSave = async (data: {
    type: "meeting" | "general";
    projectId?: string;
    topicId?: string;
    meetingId?: string;
  }) => {
    if (!text.trim()) {
      closeCapture();
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          type: data.type,
          meeting_id: data.meetingId || null,
          topic_id: data.topicId || null,
          is_unsorted: false, // User explicitly categorized this
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save note");
      }

      // Invalidate all relevant queries to refresh sidebar and lists
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-counts"] });

      // Success! Close the overlay
      closeCapture();
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note. Please try again.");
      setIsSaving(false);
    }
  };

  // Save as unsorted
  const handleSkip = async () => {
    if (!text.trim()) {
      closeCapture();
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          type: "general", // Default to general for unsorted notes
          is_unsorted: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save note");
      }

      // Invalidate all relevant queries to refresh sidebar and lists
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-counts"] });

      // Success! Close the overlay
      closeCapture();
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note. Please try again.");
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex flex-col bg-[var(--paper)]"
          >
            {/* Header with hint text and close button */}
            <div className="flex items-center justify-between border-b border-[var(--line)] px-10 py-5">
              <div
                className="text-sm text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
              >
                {!showCategorize && (
                  <>
                    <Kbd className="mr-2">esc</Kbd>
                    to finish · <Kbd>⌘⏎</Kbd> also works
                  </>
                )}
              </div>
              {!showCategorize && (
                <button
                  onClick={handleClose}
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--ink-soft)] transition-colors hover:bg-[var(--line)] hover:text-[var(--ink)] cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Full-screen textarea */}
            <div className="flex flex-1 justify-center overflow-y-auto px-10">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Start typing — figure out where it goes later…"
                disabled={showCategorize || isSaving}
                className="h-full w-full max-w-3xl resize-none border-none bg-transparent text-xl leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)] disabled:opacity-50"
                style={{
                  fontFamily: "var(--font-source-serif)",
                  paddingTop: "6vh",
                }}
              />
            </div>

            {/* Saving indicator */}
            {isSaving && (
              <div className="border-t border-[var(--line)] bg-[var(--paper)] px-10 py-4">
                <div
                  className="text-sm text-[var(--ink-soft)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  Saving...
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categorize bar (slides up from bottom) */}
      <CategorizeBar
        isOpen={showCategorize && !isSaving}
        onSave={handleSave}
        onSkip={handleSkip}
      />
    </>
  );
}
