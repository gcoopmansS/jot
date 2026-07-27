"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Note } from "@/lib/types";
import { Kbd } from "@/components/ui/kbd";
import { CategorizeBar } from "@/components/capture/categorize-bar";
import { retryWithBackoff } from "@/lib/retry";
import { pendingSavesManager } from "@/lib/pending-saves";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

/**
 * Note detail page - shows a single note in full-screen editable view.
 *
 * Looks identical to the capture overlay but loads and updates existing notes.
 * User can edit the text and changes auto-save on blur or when pressing ESC.
 *
 * For unsorted notes: shows categorize bar to allow filing.
 *
 * RELIABILITY: Uses the same retry logic as capture overlay for reliable saves.
 */
export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const noteId = params.id as string;
  const shouldShowFilePrompt = searchParams.get("file") === "true";

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showCategorize, setShowCategorize] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "retrying" | "failed"
  >("idle");
  const [saveError, setSaveError] = useState<string>("");
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveSequenceRef = useRef(0); // Track save sequence to prevent stale responses
  const isClosingRef = useRef(false); // Track if we're in the process of closing

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

  // Initialize text when note loads (ONLY on first load, never from autosave refetches)
  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (note && initialLoadRef.current) {
      setText(note.text);
      setTitle(note.title || "");
      initialLoadRef.current = false;
      // Auto-show categorize bar if this is an unsorted note or if ?file=true
      if (note.is_unsorted || shouldShowFilePrompt) {
        setShowCategorize(true);
      }
    }
  }, [note, shouldShowFilePrompt]);

  // Note: RichTextEditor handles autofocus via its autofocus prop

  // Listen for save status changes from the pending saves manager (for background retries)
  useEffect(() => {
    const unsubscribe = pendingSavesManager.addListener((status) => {
      if (status.id === noteId) {
        setSaveStatus(status.state);
        if (status.error) {
          setSaveError(status.error);
        }

        // If background retry succeeded, refresh the sidebar/list queries only
        // NEVER refetch the current note - local editor state is the source of truth
        if (status.state === "saved") {
          queryClient.invalidateQueries({ queryKey: ["notes"] });
          queryClient.invalidateQueries({ queryKey: ["note-counts"] });
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
  // isFinalSave: true when closing/navigating away (invalidates cache for next open)
  const handleSave = useCallback(
    async (isFinalSave: boolean = false) => {
      if (!hasChanges || !text.trim()) {
        return;
      }

      // Capture the sequence number and text at save-start time
      const thisSequence = ++saveSequenceRef.current;
      const textToSave = text.trim();

      setSaveStatus("saving");
      setSaveError("");

      try {
        // Attempt save with automatic retry (3 attempts with exponential backoff)
        await retryWithBackoff(
          async () => {
            const response = await fetch(`/api/notes/${noteId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: textToSave }),
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

        // Success! But only update status if this is still the latest save
        // (a newer save may have started while this one was in flight)
        if (thisSequence === saveSequenceRef.current) {
          setSaveStatus("saved");
          setHasChanges(false);
        }

        // Invalidate list/sidebar queries always
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.invalidateQueries({ queryKey: ["note-counts"] });

        // For final saves (on close), also invalidate this note's cache
        // so it's fresh on next open. During continuous autosave, DON'T
        // invalidate to prevent the race condition with live typing.
        if (isFinalSave) {
          queryClient.invalidateQueries({ queryKey: ["note", noteId] });
        }
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
    },
    [hasChanges, text, noteId, note, queryClient],
  );

  // Handle close button
  const handleClose = useCallback(async () => {
    isClosingRef.current = true;
    if (hasChanges) {
      await handleSave(true); // Final save - invalidate cache
    }
    // Always invalidate cache on close, even if no pending changes
    // This ensures fresh data when note is reopened
    queryClient.invalidateQueries({ queryKey: ["note", noteId] });
    router.back();
  }, [hasChanges, handleSave, router, queryClient, noteId]);

  // Handle categorization from the categorize bar
  const handleCategorize = async (data: {
    title?: string;
    type: "meeting" | "general";
    projectId?: string;
    topicId?: string;
    meetingId?: string;
    isUnsorted?: boolean;
  }) => {
    // Store title for when user goes back to editing
    if (data.title !== undefined) {
      setTitle(data.title);
    }

    // Update the note with categorization
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title || null,
          type: data.type,
          meeting_id: data.meetingId || null,
          topic_id: data.topicId || null,
          is_unsorted: data.isUnsorted || false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note", noteId] });
      queryClient.invalidateQueries({ queryKey: ["note-counts"] });

      // Close categorize bar and navigate back
      setShowCategorize(false);
      router.back();
    } catch (error) {
      console.error("Error categorizing note:", error);
    }
  };

  const handleSkipCategorize = () => {
    // Just close the categorize bar and go back
    setShowCategorize(false);
    router.back();
  };

  const handleBackFromCategorize = () => {
    // Return to editing (RichTextEditor will autofocus)
    setShowCategorize(false);
  };

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

  // Handle ESC key to save and go back (only when not in categorize mode)
  useEffect(() => {
    if (showCategorize) return; // Don't handle ESC when categorize bar is shown

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        isClosingRef.current = true;
        await handleSave(true); // Final save - invalidate cache
        // Always invalidate cache on close, even if no pending changes
        queryClient.invalidateQueries({ queryKey: ["note", noteId] });
        router.back();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, router, showCategorize, queryClient, noteId]);

  // Flush any pending save when component unmounts (e.g. navigation via sidebar)
  // This ensures edits aren't lost if user navigates away without using ESC/close button
  useEffect(() => {
    return () => {
      // Only trigger save on unmount if:
      // 1. There are unsaved changes
      // 2. We're not already in the middle of a close operation (which handles save)
      // 3. Component is unmounting due to navigation, not due to intentional close
      if (hasChanges && !isClosingRef.current && text.trim()) {
        // Use the pending saves mechanism for reliable background save
        // We can't await here (component is unmounting), but pending saves
        // will retry until successful
        if (note) {
          const textToSave = text.trim();
          pendingSavesManager.addPending({
            id: noteId,
            text: textToSave,
            type: note.type,
            meetingId: note.meeting_id || undefined,
            topicId: note.topic_id || undefined,
            isUnsorted: note.is_unsorted,
            timestamp: Date.now(),
            attemptCount: 0, // Will be retried from 0
          });

          // Also try an immediate fire-and-forget save
          fetch(`/api/notes/${noteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: textToSave }),
            keepalive: true, // Ensure request completes even if page unloads
          }).catch(() => {
            // Silently fail - pending save will retry
          });
        }
      }
    };
  }, [hasChanges, text, noteId, note]);

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
        className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-5"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div
          className="text-xs sm:text-sm"
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
              Unsaved changes ·{" "}
              <Kbd className="mr-2 hidden sm:inline-flex">esc</Kbd>{" "}
              <span className="hidden sm:inline">to save and close</span>
            </span>
          ) : saveStatus === "saved" ? (
            <span style={{ color: "var(--accent)" }}>✓ Saved</span>
          ) : (
            <span>
              <Kbd className="mr-2 hidden sm:inline-flex">esc</Kbd>{" "}
              <span className="hidden sm:inline">to close</span>
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

      {/* Full-screen rich text editor */}
      <div className="flex-1 flex justify-center px-4 sm:px-6 md:px-10 overflow-y-auto">
        <div
          className="w-full max-w-3xl"
          style={{
            paddingTop: "6vh",
          }}
        >
          <RichTextEditor
            content={text}
            onChange={handleTextChange}
            onSave={handleClose}
            autofocus={!showCategorize && !isLoading}
            className="text-xl"
          />
        </div>
      </div>

      {/* Save status indicator */}
      {(saveStatus === "saving" ||
        saveStatus === "retrying" ||
        saveStatus === "failed") && (
        <div
          className="px-4 sm:px-6 md:px-10 py-4"
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

      {/* Categorize bar for unsorted notes */}
      <CategorizeBar
        isOpen={showCategorize}
        initialTitle={title}
        onSave={handleCategorize}
        onSkip={handleSkipCategorize}
        onBack={handleBackFromCategorize}
      />
    </div>
  );
}
