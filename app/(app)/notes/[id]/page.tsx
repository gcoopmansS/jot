"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Note } from "@/lib/types";
import { Kbd } from "@/components/ui/kbd";
import { retryWithBackoff } from "@/lib/retry";
import { pendingSavesManager } from "@/lib/pending-saves";

/**
 * Note detail page - shows a single note in full-screen editable view.
 *
 * Looks identical to the capture overlay but loads and updates existing notes.
 * User can edit the text and changes auto-save on blur or when pressing ESC.
 *
 * RELIABILITY: Uses the same retry logic as capture overlay for reliable saves.
 */
export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const noteId = params.id as string;

  const [text, setText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "retrying" | "failed"
  >("idle");
  const [saveError, setSaveError] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch the note
  const { data: note, isLoading } = useQuery<Note>({
    queryKey: ["note", noteId],
    queryFn: async () => {
      const response = await fetch(`/api/notes/${noteId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch note");
      }
      return response.json();
    },
  });

  // Initialize text when note loads
  useEffect(() => {
    if (note) {
      setText(note.text);
    }
  }, [note]);

  // Focus textarea when page loads
  useEffect(() => {
    if (textareaRef.current && !isLoading) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  // Listen for save status changes from the pending saves manager (for background retries)
  useEffect(() => {
    const unsubscribe = pendingSavesManager.addListener((status) => {
      if (status.id === noteId) {
        setSaveStatus(status.state);
        if (status.error) {
          setSaveError(status.error);
        }

        // If background retry succeeded, refresh the UI
        if (status.state === "saved") {
          queryClient.invalidateQueries({ queryKey: ["notes"] });
          queryClient.invalidateQueries({ queryKey: ["note", noteId] });
          setHasChanges(false);
        }
      }
    });

    return unsubscribe;
  }, [noteId, queryClient]);

  // Auto-hide "Saved" status after 2 seconds
  useEffect(() => {
    if (saveStatus === "saved") {
      savedTimerRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    }

    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, [saveStatus]);

  // Track changes
  const handleTextChange = (newText: string) => {
    setText(newText);
    setHasChanges(newText !== note?.text);
  };

  // Save the note with automatic retry
  const handleSave = useCallback(async () => {
    if (!hasChanges || !text.trim()) {
      return;
    }

    setSaveStatus("saving");
    setSaveError("");

    try {
      // Attempt save with automatic retry (3 attempts with exponential backoff)
      await retryWithBackoff(
        async () => {
          const response = await fetch(`/api/notes/${noteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text.trim() }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update note");
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

      // Success!
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note", noteId] });
      setHasChanges(false);
    } catch (error) {
      // All retries failed - add to pending queue for background retry
      console.error("Failed to save note after retries:", error);
      setSaveStatus("failed");
      setSaveError(error instanceof Error ? error.message : "Unknown error");

      // Add to pending saves (will be retried when network returns)
      // Note: For edits, we need to ensure the note object has the required fields
      if (note) {
        pendingSavesManager.addPending({
          id: noteId,
          text: text.trim(),
          type: note.type,
          meetingId: note.meeting_id || undefined,
          topicId: note.topic_id || undefined,
          isUnsorted: note.is_unsorted,
          timestamp: Date.now(),
          attemptCount: 3,
        });
      }

      // Don't block the user - status indicator shows the issue
    }
  }, [hasChanges, text, noteId, note, queryClient]);

  // Handle close button
  const handleClose = useCallback(async () => {
    if (hasChanges) {
      await handleSave();
    }
    router.back();
  }, [hasChanges, handleSave, router]);

  // Debounced autosave: save 1.5 seconds after user stops typing
  useEffect(() => {
    if (!hasChanges || !text.trim()) {
      return;
    }

    // Clear any existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Set a new timer to save after 1.5 seconds of inactivity
    autosaveTimerRef.current = setTimeout(() => {
      handleSave();
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [text, hasChanges, handleSave]);

  // Handle ESC key to save and go back
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        await handleSave();
        router.back();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, router]);

  // Warn before leaving when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Show warning if there are unsaved changes or save is in progress
      const hasUnsavedChanges =
        hasChanges ||
        saveStatus === "saving" ||
        saveStatus === "retrying" ||
        saveStatus === "failed";

      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges, saveStatus]);

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: "var(--paper)" }}
      >
        <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: "var(--paper)" }}
      >
        <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
          Note not found
        </div>
      </div>
    );
  }

  return (
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
          {saveStatus === "failed" ? (
            <span style={{ color: "var(--amber)" }}>
              ⚠️ Save failed — will retry when online
            </span>
          ) : hasChanges ? (
            <span>
              Unsaved changes · <Kbd className="mr-2">esc</Kbd> to save and
              close
            </span>
          ) : saveStatus === "saved" ? (
            <span style={{ color: "var(--accent)" }}>✓ Saved</span>
          ) : (
            <span>
              <Kbd className="mr-2">esc</Kbd> to close
            </span>
          )}
        </div>
        <button
          onClick={handleClose}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--ink-soft)] transition-colors hover:bg-[var(--line)] hover:text-[var(--ink)] cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Full-screen textarea */}
      <div className="flex-1 flex justify-center px-10 overflow-y-auto">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleSave}
          disabled={saveStatus === "saving" || saveStatus === "retrying"}
          className="w-full max-w-3xl h-full resize-none bg-transparent border-none outline-none text-xl leading-relaxed disabled:opacity-50"
          style={{
            fontFamily: "var(--font-source-serif)",
            color: "var(--ink)",
            paddingTop: "6vh",
          }}
        />
      </div>

      {/* Save status indicator */}
      {(saveStatus === "saving" ||
        saveStatus === "retrying" ||
        saveStatus === "failed") && (
        <div
          className="px-10 py-4"
          style={{
            borderTop: "1px solid var(--line)",
            backgroundColor: "var(--paper)",
          }}
        >
          <div
            className="text-sm"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            {saveStatus === "saving" && (
              <span style={{ color: "var(--ink-soft)" }}>Saving...</span>
            )}
            {saveStatus === "retrying" && (
              <span style={{ color: "var(--amber)" }}>
                ⚠️ Connection issue — retrying save...
              </span>
            )}
            {saveStatus === "failed" && (
              <div className="flex flex-col gap-1">
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                  ⚠️ Couldn't save right now
                </span>
                <span style={{ color: "var(--ink-soft)", fontSize: "11px" }}>
                  Your changes are saved locally and will automatically sync
                  when your connection returns.
                  {saveError && (
                    <span className="block">Error: {saveError}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
