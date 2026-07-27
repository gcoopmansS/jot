"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useCaptureOverlay } from "@/lib/capture-context";
import { saveDraft, clearDraft } from "@/lib/draft-storage";
import { generateNoteId, retryWithBackoff } from "@/lib/retry";
import { pendingSavesManager } from "@/lib/pending-saves";
import { CategorizeBar } from "./categorize-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

/**
 * Full-screen capture overlay for writing notes.
 *
 * This is the sacred capture flow: just a textarea, no forms, no required fields.
 * User can start typing immediately. Cmd/Ctrl+Enter shows the categorize bar.
 *
 * Uses Framer Motion for fade-in/scale animation (one of the two deliberate animations).
 * Textarea uses Source Serif 4 to feel distinct from UI chrome.
 *
 * RELIABILITY LAYERS:
 * - Layer 1: Drafts auto-saved to localStorage every 500ms (before any server save)
 * - Layer 2: Client-side UUID generation + retry with exponential backoff + network-aware background retries
 */
export function CaptureOverlay() {
  const { isOpen, initialText, initialId, prefilledContext, closeCapture } =
    useCaptureOverlay();
  const queryClient = useQueryClient();
  const [noteId, setNoteId] = useState<string>("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [showCategorize, setShowCategorize] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "failed" | "retrying"
  >("idle");
  const [saveError, setSaveError] = useState<string>("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  const lastSavedTextRef = useRef<string>(""); // Track what text was last saved to server

  // NEW: Save with prefilled context (skip categorize bar)
  // Defined early so it can be used in useEffect hooks
  const handleSaveWithContext = useCallback(async () => {
    if (!text.trim() || !noteId || !prefilledContext) {
      closeCapture();
      return;
    }

    setSaveStatus("saving");

    try {
      await retryWithBackoff(
        async () => {
          const response = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: noteId,
              text: text.trim(),
              title: title || null,
              type: prefilledContext.type,
              meeting_id: prefilledContext.meetingId || null,
              topic_id: prefilledContext.topicId || null,
              is_unsorted: false, // Prefilled context means it's already categorized
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to save note");
          }

          return response.json();
        },
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            console.log(
              `Retry attempt ${attempt} for note ${noteId}:`,
              error.message,
            );
            setSaveStatus("retrying");
          },
        },
      );

      // Success! Track what we saved and close
      lastSavedTextRef.current = text.trim();
      clearDraft();
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-counts"] });
      closeCapture();
    } catch (error) {
      // All retries failed - add to pending queue for background retry
      console.error("Failed to save note after retries:", error);
      setSaveStatus("failed");
      setSaveError(error instanceof Error ? error.message : "Unknown error");

      const textToSave = text.trim();
      lastSavedTextRef.current = textToSave;
      pendingSavesManager.addPending({
        id: noteId,
        text: textToSave,
        type: prefilledContext.type,
        meetingId: prefilledContext.meetingId,
        topicId: prefilledContext.topicId,
        isUnsorted: false,
        timestamp: Date.now(),
        attemptCount: 3,
      });

      // Don't close or clear the draft - keep it for recovery
    }
  }, [text, noteId, prefilledContext, title, closeCapture, queryClient]);

  // Generate or restore note ID when overlay opens
  useEffect(() => {
    if (isOpen && !noteId) {
      // Use the restored ID if available, otherwise generate a new one
      const id = initialId || generateNoteId();
      setNoteId(id);
    }
  }, [isOpen, initialId, noteId]);

  // Debounced draft save: save to localStorage 500ms after user stops typing
  const debouncedSaveDraft = useCallback((id: string, value: string) => {
    // Clear any existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set a new timer to save after 500ms
    saveTimerRef.current = setTimeout(() => {
      if (value.trim()) {
        saveDraft(id, value);
      }
    }, 500);
  }, []);

  // Save draft whenever text changes
  useEffect(() => {
    if (isOpen && text && noteId) {
      debouncedSaveDraft(noteId, text);
    }

    // Cleanup timer on unmount
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [text, isOpen, noteId, debouncedSaveDraft]);

  // Listen for save status changes from the pending saves manager
  useEffect(() => {
    if (!noteId) return;

    const unsubscribe = pendingSavesManager.addListener((status) => {
      if (status.id === noteId) {
        setSaveStatus(status.state);
        if (status.error) {
          setSaveError(status.error);
        }

        // If background retry succeeded, only close if user hasn't typed more
        if (status.state === "saved") {
          // Check if the current text matches what was saved
          // If user typed more after the save started, keep the overlay open
          const currentText = text.trim();
          if (currentText === lastSavedTextRef.current || !currentText) {
            // Text hasn't changed since save - safe to close
            clearDraft();
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            queryClient.invalidateQueries({ queryKey: ["note-counts"] });
            closeCapture();
          } else {
            // User typed more after save - keep overlay open but update UI
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            queryClient.invalidateQueries({ queryKey: ["note-counts"] });
            // Status will show "saved" briefly, then user can save again
          }
        }
      }
    });

    return unsubscribe;
  }, [noteId, text, queryClient, closeCapture]);

  // Extract the finish logic so it can be called from both keyboard shortcut and button
  const handleFinish = useCallback(() => {
    // If we have prefilled context, save directly without showing categorize bar
    if (prefilledContext) {
      handleSaveWithContext();
    } else {
      setShowCategorize(true);
    }
  }, [prefilledContext, handleSaveWithContext]);

  // Focus textarea when overlay opens or when returning from categorize bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || showCategorize) return;

      // Cmd/Ctrl + Enter to finish
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleFinish();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showCategorize, handleFinish]);

  // Reset state when overlay closes OR initialize text when it opens with initialText
  useEffect(() => {
    if (isOpen) {
      // Opening
      if (initialText && !initializedRef.current) {
        // Initialize with draft text (only once per open)
        setText(initialText);
        initializedRef.current = true;
      }
    } else {
      // Closing - reset everything
      setText("");
      setTitle("");
      setNoteId("");
      setShowCategorize(false);
      setSaveStatus("idle");
      setSaveError("");
      setShowDiscardConfirm(false);
      initializedRef.current = false;
    }
  }, [isOpen, initialText]);

  // Warn before leaving when there are unsaved changes
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Show warning if there's text that hasn't been confirmed saved
      // Don't warn if: no text, or save succeeded
      const hasUnsavedChanges = text.trim() && saveStatus !== "saved";

      if (hasUnsavedChanges) {
        e.preventDefault();
        // Modern browsers ignore the custom message and show their own
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isOpen, text, saveStatus]);

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
    // Clear the draft when explicitly discarding
    clearDraft();
    // Text will be thrown away when overlay closes (reset effect above)
    closeCapture();
  };

  // Go back from categorize bar to keep editing
  const handleBack = () => {
    setShowCategorize(false);
    // Textarea will be re-focused by the existing useEffect
  };

  // Save the note with categorization (with automatic retry)
  const handleSave = async (data: {
    title?: string;
    type: "meeting" | "general";
    projectId?: string;
    topicId?: string;
    meetingId?: string;
    isUnsorted?: boolean;
  }) => {
    if (!text.trim() || !noteId) {
      closeCapture();
      return;
    }

    // Store title for when user goes back to editing
    if (data.title !== undefined) {
      setTitle(data.title);
    }

    setSaveStatus("saving");

    try {
      // If categorization is incomplete (e.g., offline), treat as unsorted
      const shouldBeUnsorted =
        data.isUnsorted ||
        (data.type === "meeting" && !data.meetingId) ||
        (data.type === "general" && !data.topicId);

      // Attempt save with automatic retry (3 attempts with exponential backoff)
      await retryWithBackoff(
        async () => {
          const response = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: noteId,
              text: text.trim(),
              title: data.title || null,
              // Keep the type the user selected, but clear the IDs if unsorted
              type: data.type,
              meeting_id: shouldBeUnsorted ? null : data.meetingId || null,
              topic_id: shouldBeUnsorted ? null : data.topicId || null,
              is_unsorted: shouldBeUnsorted,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to save note");
          }

          return response.json();
        },
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            console.log(
              `Retry attempt ${attempt} for note ${noteId}:`,
              error.message,
            );
            setSaveStatus("retrying");
          },
        },
      );

      // Success! Track what we saved and close
      lastSavedTextRef.current = text.trim();
      clearDraft();
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-counts"] });
      closeCapture();
    } catch (error) {
      // All retries failed - add to pending queue for background retry
      console.error("Failed to save note after retries:", error);
      setSaveStatus("failed");
      setSaveError(error instanceof Error ? error.message : "Unknown error");

      // Use the same validation: if categorization is incomplete, mark as unsorted
      const shouldBeUnsorted =
        data.isUnsorted ||
        (data.type === "meeting" && !data.meetingId) ||
        (data.type === "general" && !data.topicId);

      const textToSave = text.trim();
      lastSavedTextRef.current = textToSave;
      pendingSavesManager.addPending({
        id: noteId,
        text: textToSave,
        type: data.type, // Keep the type the user selected
        meetingId: shouldBeUnsorted ? undefined : data.meetingId,
        topicId: shouldBeUnsorted ? undefined : data.topicId,
        isUnsorted: shouldBeUnsorted,
        timestamp: Date.now(),
        attemptCount: 3,
      });

      // Don't close or clear the draft - keep it for recovery
      // Status indicator will show "Couldn't save" message
      // User can manually close when ready, or wait for background retry
    }
  };

  // Save as unsorted (with automatic retry)
  const handleSkip = async () => {
    if (!text.trim() || !noteId) {
      closeCapture();
      return;
    }

    setSaveStatus("saving");

    try {
      // Attempt save with automatic retry (3 attempts with exponential backoff)
      await retryWithBackoff(
        async () => {
          const response = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: noteId,
              text: text.trim(),
              type: "general",
              is_unsorted: true,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to save note");
          }

          return response.json();
        },
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            console.log(
              `Retry attempt ${attempt} for note ${noteId}:`,
              error.message,
            );
            setSaveStatus("retrying");
          },
        },
      );

      // Success! Track what we saved and close
      lastSavedTextRef.current = text.trim();
      clearDraft();
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note-counts"] });
      closeCapture();
    } catch (error) {
      // All retries failed - add to pending queue for background retry
      console.error("Failed to save note after retries:", error);
      setSaveStatus("failed");
      setSaveError(error instanceof Error ? error.message : "Unknown error");

      const textToSave = text.trim();
      lastSavedTextRef.current = textToSave;
      pendingSavesManager.addPending({
        id: noteId,
        text: textToSave,
        type: "general",
        isUnsorted: true,
        timestamp: Date.now(),
        attemptCount: 3,
      });

      // Don't close or clear the draft - keep it for recovery
      // Status indicator will show "Couldn't save" message
      // User can manually close when ready, or wait for background retry
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
            {/* Header with Done button and discard link */}
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 sm:px-6 md:px-10 py-4 sm:py-5">
              {!showCategorize && (
                <>
                  {/* Left side: Done button with optional keyboard hint */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFinish();
                      }}
                      className="px-4 py-2.5 bg-[var(--ink)] text-[var(--paper)] rounded-[var(--radius)] font-medium text-sm transition-colors hover:bg-[var(--accent)] min-h-[44px] flex items-center"
                      style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                    >
                      Done
                    </button>
                    <div
                      className="text-xs text-[var(--ink-soft)] hidden sm:flex items-center gap-2"
                      style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                    >
                      <span>⌘⏎</span>
                      {prefilledContext && (
                        <span className="text-[var(--accent)]">
                          → saves directly to this meeting
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: Discard link */}
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
                </>
              )}
            </div>

            {/* Full-screen writing surface with title */}
            <div
              className="flex flex-1 justify-center overflow-y-auto px-4 sm:px-6 md:px-10"
              onClick={showCategorize ? handleBack : undefined}
            >
              <div
                className={`w-full max-w-3xl ${
                  showCategorize ? "pointer-events-none opacity-50" : ""
                }`}
                style={{
                  paddingTop: "6vh",
                }}
              >
                {/* Title input - distinct from body */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled (optional)"
                  className="w-full mb-6 bg-transparent border-none text-3xl font-semibold text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                  disabled={showCategorize}
                />

                {/* Body text editor */}
                <RichTextEditor
                  content={text}
                  onChange={setText}
                  placeholder="Start typing — figure out where it goes later…"
                  autofocus={!showCategorize}
                  className="text-xl"
                />
              </div>
            </div>

            {/* Save status indicator */}
            {(saveStatus === "saving" ||
              saveStatus === "retrying" ||
              saveStatus === "failed") && (
              <div className="border-t border-[var(--line)] bg-[var(--paper)] px-4 sm:px-6 md:px-10 py-4">
                <div
                  className="flex items-center justify-between text-sm"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  <div>
                    {saveStatus === "saving" && (
                      <span className="text-[var(--ink-soft)]">Saving...</span>
                    )}
                    {saveStatus === "retrying" && (
                      <span className="text-[var(--amber)]">
                        ⚠️ Connection issue — retrying save...
                      </span>
                    )}
                    {saveStatus === "failed" && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[var(--ink)] font-medium">
                          ⚠️ Couldn't save right now
                        </span>
                        <span className="text-[var(--ink-soft)] text-xs">
                          Your note is saved locally and will automatically sync
                          when your connection returns.
                          {saveError && (
                            <span className="block">Error: {saveError}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {saveStatus === "failed" && (
                    <button
                      onClick={closeCapture}
                      className="text-sm text-[var(--ink-soft)] underline transition-colors hover:text-[var(--ink)]"
                    >
                      Close
                    </button>
                  )}
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

      {/* Categorize bar - shown only when user hits Cmd+Enter AND no prefilled context */}
      {!prefilledContext && (
        <CategorizeBar
          isOpen={
            showCategorize &&
            saveStatus !== "saving" &&
            saveStatus !== "retrying" &&
            saveStatus !== "failed"
          }
          initialTitle={title}
          onSave={handleSave}
          onSkip={handleSkip}
          onBack={handleBack}
        />
      )}
    </>
  );
}
