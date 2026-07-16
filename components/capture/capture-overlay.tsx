"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useCaptureOverlay } from "@/lib/capture-context";
import { CategorizeBar } from "./categorize-bar";
import { Kbd } from "@/components/ui/kbd";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Full-screen capture overlay for writing notes.
 *
 * This is the sacred capture flow: just a textarea, no forms, no required fields.
 * User can start typing immediately. Cmd/Ctrl+Enter shows the categorize bar.
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
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when overlay opens or when returning from categorize bar
  useEffect(() => {
    if (isOpen && !showCategorize && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, showCategorize]);

  // Handle Cmd/Ctrl+Enter to show categorize bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || showCategorize) return;

      // Cmd/Ctrl + Enter to show categorize bar
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
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
      setShowDiscardConfirm(false);
    }
  }, [isOpen]);

  // Handle discard - separate from the finish/save flow
  const handleDiscardClick = () => {
    if (!text.trim()) {
      // If there's no text, just close without confirmation
      closeCapture();
      return;
    }
    // Show confirmation dialog for non-empty text
    setShowDiscardConfirm(true);
  };

  const handleDiscardConfirm = () => {
    // Text will be thrown away when overlay closes (reset effect above)
    closeCapture();
  };

  // Go back from categorize bar to keep editing
  const handleBack = () => {
    setShowCategorize(false);
    // Textarea will be re-focused by the existing useEffect
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
            onClick={showCategorize ? handleBack : undefined}
            className="fixed inset-0 z-50 flex flex-col bg-[var(--paper)]"
          >
            {/* Header with hint text and discard link */}
            <div className="flex items-center justify-between border-b border-[var(--line)] px-10 py-5">
              <div
                className="text-sm text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
              >
                {!showCategorize && (
                  <>
                    <Kbd className="mr-2">⌘⏎</Kbd>
                    to finish
                  </>
                )}
              </div>
              {!showCategorize && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDiscardClick();
                  }}
                  className="text-sm text-[var(--ink-soft)] underline transition-colors hover:text-[var(--ink)] cursor-pointer"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  Discard
                </button>
              )}
            </div>

            {/* Full-screen textarea */}
            <div
              className="flex flex-1 justify-center overflow-y-auto px-10"
              onClick={showCategorize ? handleBack : undefined}
            >
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Start typing — figure out where it goes later…"
                disabled={showCategorize || isSaving}
                className={`h-full w-full max-w-3xl resize-none border-none bg-transparent text-xl leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)] disabled:opacity-50 ${
                  showCategorize ? "pointer-events-none" : ""
                }`}
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

      {/* Discard confirmation dialog */}
      <ConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="Discard this note?"
        description="This note will be permanently deleted. This can't be undone."
        confirmLabel="Discard"
        cancelLabel="Keep writing"
        onConfirm={handleDiscardConfirm}
        variant="danger"
      />

      {/* Categorize bar (slides up from bottom) */}
      <CategorizeBar
        isOpen={showCategorize && !isSaving}
        onSave={handleSave}
        onSkip={handleSkip}
        onBack={handleBack}
      />
    </>
  );
}
