"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCaptureOverlay } from "@/lib/capture-context";
import { CategorizeBar } from "./categorize-bar";

/**
 * Full-screen capture overlay for writing notes.
 *
 * This is the sacred capture flow: just a textarea, no forms, no required fields.
 * User can start typing immediately. ESC or clicking the X shows the categorize bar.
 *
 * The placeholder text guides the user: "Start typing — figure out where it goes later..."
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
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ backgroundColor: "var(--paper)" }}
      >
        {/* Header with hint text and close button */}
        <div
          className="flex items-center justify-between px-10 py-5"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <div
            className="text-sm"
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              color: "var(--ink-soft)",
            }}
          >
            {!showCategorize && (
              <>
                <kbd
                  className="px-2 py-1 text-xs rounded mr-2"
                  style={{ backgroundColor: "var(--line)" }}
                >
                  esc
                </kbd>
                to finish ·{" "}
                <kbd
                  className="px-2 py-1 text-xs rounded"
                  style={{ backgroundColor: "var(--line)" }}
                >
                  ⌘⏎
                </kbd>{" "}
                also works
              </>
            )}
          </div>
          {!showCategorize && (
            <button
              onClick={handleClose}
              className="px-2 py-1 rounded text-xl leading-none transition-colors cursor-pointer"
              style={{ color: "var(--ink-soft)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(27, 37, 33, 0.06)";
                e.currentTarget.style.color = "var(--ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--ink-soft)";
              }}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* Full-screen textarea */}
        <div className="flex-1 flex justify-center px-10 overflow-y-auto">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing — figure out where it goes later…"
            disabled={showCategorize || isSaving}
            className="w-full max-w-3xl h-full resize-none bg-transparent border-none outline-none text-xl leading-relaxed disabled:opacity-50"
            style={{
              fontFamily: "var(--font-source-serif)",
              color: "var(--ink)",
              paddingTop: "6vh",
            }}
          />
        </div>

        {/* Saving indicator */}
        {isSaving && (
          <div
            className="px-10 py-4"
            style={{
              borderTop: "1px solid var(--line)",
              backgroundColor: "#f8f6f4",
            }}
          >
            <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
              Saving...
            </div>
          </div>
        )}
      </div>

      {/* Categorize bar (slides up from bottom) */}
      <CategorizeBar
        isOpen={showCategorize && !isSaving}
        onSave={handleSave}
        onSkip={handleSkip}
      />
    </>
  );
}
