"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { X, Share, Copy, Download, Printer, Check, Lock } from "lucide-react";
import { Note } from "@/lib/types";
import { Kbd } from "@/components/ui/kbd";
import { CategorizeBar } from "@/components/capture/categorize-bar";
import { retryWithBackoff } from "@/lib/retry";
import { pendingSavesManager } from "@/lib/pending-saves";
import { getFiledNoteDestination } from "@/lib/note-destination";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useCurrentUser } from "@/lib/use-current-user";

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
  const { data: currentUser } = useCurrentUser();

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showCategorize, setShowCategorize] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "retrying" | "failed" | "forbidden"
  >("idle");
  const [saveError, setSaveError] = useState<string>("");
  const [justCopied, setJustCopied] = useState(false);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveSequenceRef = useRef(0); // Track save sequence to prevent stale responses
  const isClosingRef = useRef(false); // Track if we're in the process of closing

  // Fetch the note
  const { data: note, isLoading } = useQuery<Note>({
    queryKey: ["note", noteId, currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/notes/${noteId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch note");
      }
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Only the note's original author can edit it - a shared Project's other
  // members can view and delete it, but not change its content (see
  // CLAUDE.md's Team/shared Projects notes). A note whose author's account
  // was since deleted (user_id nulled, see notes.author_email_snapshot) has
  // no valid author left, so it's read-only for everyone.
  const canEdit = !!note && !!currentUser && note.user_id === currentUser.id;

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
          queryClient.invalidateQueries({
            queryKey: ["note-counts", currentUser?.id],
          });
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
    setHasChanges(newText !== note?.text || title !== (note?.title || ""));
  };

  // Save the note with automatic retry
  // isFinalSave: true when closing/navigating away (invalidates cache for next open)
  const handleSave = useCallback(
    async (isFinalSave: boolean = false) => {
      if (!hasChanges || !text.trim()) {
        return;
      }

      // Nothing legitimate to save if this viewer isn't the author -
      // avoids both a pointless network round-trip and the confusing
      // "unsaved changes" indicator that markdown round-tripping through
      // the editor can spuriously trigger on initial load.
      if (!canEdit) {
        setHasChanges(false);
        return;
      }

      // Capture the sequence number, text, and title at save-start time
      const thisSequence = ++saveSequenceRef.current;
      const textToSave = text.trim();
      const titleToSave = title.trim() || null;

      setSaveStatus("saving");
      setSaveError("");

      try {
        // Attempt save with automatic retry (3 attempts with exponential backoff)
        await retryWithBackoff(
          async () => {
            const response = await fetch(`/api/notes/${noteId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: textToSave, title: titleToSave }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              const saveError = new Error(
                errorData.error || "Failed to update note",
              ) as Error & { nonRetryable?: boolean };
              // A permission error (e.g. this note's author has changed, or
              // the UI's canEdit check was somehow bypassed) can never
              // succeed no matter how many times we retry - the editor
              // already prevents this case, this is just a backstop.
              if (response.status === 403) {
                saveError.nonRetryable = true;
              }
              throw saveError;
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

        // Invalidate list/sidebar queries always. Use the bare "notes" prefix
        // (not ["notes", currentUser?.id]) so this also catches the more
        // specific list queries used by the Unsorted/Meeting/Topic pages
        // (["notes", "unsorted", ...], ["notes", "meeting", meetingId, ...],
        // etc.) - those don't share a prefix with ["notes", currentUser?.id],
        // so a narrower invalidation here left their cards stale until a
        // manual refresh.
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.invalidateQueries({
          queryKey: ["note-counts", currentUser?.id],
        });

        // For final saves (on close), also invalidate this note's cache
        // so it's fresh on next open. During continuous autosave, DON'T
        // invalidate to prevent the race condition with live typing.
        if (isFinalSave) {
          queryClient.invalidateQueries({
            queryKey: ["note", noteId, currentUser?.id],
          });
        }
      } catch (error) {
        const isPermissionError = (error as { nonRetryable?: boolean })
          ?.nonRetryable;

        if (isPermissionError) {
          // Can never succeed by retrying - don't queue it, just report it.
          console.error("Cannot save - not this note's author:", error);
          setSaveStatus("forbidden");
          setSaveError(
            error instanceof Error ? error.message : "You can't edit this note.",
          );
          return;
        }

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
            title: titleToSave || undefined,
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
    [hasChanges, text, title, noteId, note, queryClient, canEdit],
  );

  // Handle close button
  const handleClose = useCallback(async () => {
    isClosingRef.current = true;
    if (hasChanges) {
      await handleSave(true); // Final save - invalidate cache
    }
    // Always invalidate cache on close, even if no pending changes
    // This ensures fresh data when note is reopened
    queryClient.invalidateQueries({
      queryKey: ["note", noteId, currentUser?.id],
    });
    router.back();
  }, [hasChanges, handleSave, router, queryClient, noteId, currentUser?.id]);

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

      // Invalidate all relevant queries. Bare "notes" prefix so this also
      // catches the Unsorted/Meeting/Topic list queries (see comment in
      // handleSave above).
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note", noteId] });
      queryClient.invalidateQueries({ queryKey: ["note-counts"] });

      // Close categorize bar and navigate to wherever the note actually
      // landed, rather than just going back to wherever we came from - gives
      // visual confirmation the note landed somewhere.
      setShowCategorize(false);
      router.push(
        getFiledNoteDestination({
          type: data.type,
          projectId: data.projectId,
          meetingId: data.meetingId,
          topicId: data.topicId,
          isUnsorted: data.isUnsorted,
        }),
      );
    } catch (error) {
      console.error("Error categorizing note:", error);
    }
  };

  const handleSkipCategorize = () => {
    // Skipping keeps the note unsorted - go there instead of just closing
    // the categorize bar, for the same "confirm where it landed" reason.
    setShowCategorize(false);
    router.push("/unsorted");
  };

  const handleBackFromCategorize = () => {
    // Return to editing (RichTextEditor will autofocus)
    setShowCategorize(false);
  };

  // Export/share actions - single note only, operating on the raw stored
  // markdown text (no rendering needed for copy/download; the print view
  // handles rendering separately).
  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy note to clipboard:", error);
    }
  };

  const handleDownloadMarkdown = () => {
    const safeName =
      title.trim().replace(/[\\/:*?"<>|]/g, "").trim() || "untitled-note";
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    // No PDF library - just the browser's native print dialog, where the
    // user picks "Save as PDF" themselves. Print CSS below (the
    // "hide everything, reveal only .print-content" trick) takes care of
    // hiding the editing chrome so only the note itself prints.
    window.print();
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
      // 4. This viewer is actually allowed to edit the note - otherwise there's
      //    nothing legitimate to flush, and queueing it would just retry a
      //    permission error forever
      if (hasChanges && !isClosingRef.current && text.trim() && canEdit) {
        // Use the pending saves mechanism for reliable background save
        // We can't await here (component is unmounting), but pending saves
        // will retry until successful
        if (note) {
          const textToSave = text.trim();
          const titleToSave = title.trim() || undefined;
          pendingSavesManager.addPending({
            id: noteId,
            text: textToSave,
            title: titleToSave,
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
            body: JSON.stringify({
              text: textToSave,
              title: titleToSave || null,
            }),
            keepalive: true, // Ensure request completes even if page unloads
          }).catch(() => {
            // Silently fail - pending save will retry
          });
        }
      }
    };
  }, [hasChanges, text, title, noteId, note, canEdit]);

  // Warn before leaving when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Show warning if there are unsaved changes or save is in progress
      const hasUnsavedChanges =
        (hasChanges && canEdit) ||
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
  }, [hasChanges, saveStatus, canEdit]);

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
          {saveStatus === "forbidden" ? (
            <span style={{ color: "#dc2626" }}>⚠️ Can&apos;t save</span>
          ) : saveStatus === "failed" ? (
            <span style={{ color: "var(--amber)" }}>
              ⚠️ Save failed — will retry when online
            </span>
          ) : hasChanges && canEdit ? (
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
        <div className="flex items-center gap-1">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--ink-soft)] transition-colors hover:bg-[var(--line)] hover:text-[var(--ink)] cursor-pointer"
                aria-label="Export or share this note"
              >
                <Share className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[200px] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)] p-1 shadow-[var(--shadow-pop)]"
                sideOffset={5}
                align="end"
              >
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--ink)] outline-none transition-colors hover:bg-[var(--accent-soft)] focus:bg-[var(--accent-soft)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                  onSelect={handleCopyMarkdown}
                >
                  {justCopied ? (
                    <Check className="h-4 w-4 text-[var(--accent)]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {justCopied ? "Copied!" : "Copy as Markdown"}
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--ink)] outline-none transition-colors hover:bg-[var(--accent-soft)] focus:bg-[var(--accent-soft)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                  onSelect={handleDownloadMarkdown}
                >
                  <Download className="h-4 w-4" />
                  Download as .md
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--ink)] outline-none transition-colors hover:bg-[var(--accent-soft)] focus:bg-[var(--accent-soft)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                  onSelect={handleExportPdf}
                >
                  <Printer className="h-4 w-4" />
                  Export as PDF
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--ink-soft)] transition-colors hover:bg-[var(--line)] hover:text-[var(--ink)] cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Full-screen writing surface with title */}
      <div className="flex-1 flex justify-center px-4 sm:px-6 md:px-10 overflow-y-auto">
        <div
          className="print-content w-full max-w-3xl"
          style={{
            paddingTop: "6vh",
          }}
        >
          {/* Timestamp - only shown when printing/exporting, not on screen
              (the editing view has no need for it, but the decided export
              format is "title, timestamp, formatted content") */}
          <p
            className="print-only-date mb-2 hidden text-sm"
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              color: "var(--ink-soft)",
            }}
          >
            {new Date(note.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          {!canEdit && (
            <p
              className="mb-2 flex items-center gap-1.5 text-xs"
              style={{
                fontFamily: "var(--font-ibm-plex-mono)",
                color: "var(--ink-soft)",
              }}
            >
              <Lock className="h-3 w-3" />
              {note.user_id
                ? "Read-only — only the original author can edit"
                : "Read-only — the author's account no longer exists"}
            </p>
          )}

          {/* Title input - distinct from body */}
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Untitled (optional)"
            className="w-full mb-6 bg-transparent border-none text-3xl font-semibold text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
            disabled={showCategorize || !canEdit}
          />

          {/* Body text editor */}
          <RichTextEditor
            content={text}
            onChange={handleTextChange}
            onSave={handleClose}
            autofocus={!showCategorize && !isLoading && canEdit}
            editable={canEdit}
            className="text-xl"
          />
        </div>
      </div>

      {/* Print/export CSS - hides everything (this page's header, save
          status, toolbars) except the note content itself when printing,
          regardless of the app shell/sidebar's structure. */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content,
          .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            padding-top: 0 !important;
          }
          .print-only-date {
            display: block !important;
          }
        }
      `}</style>

      {/* Save status indicator */}
      {(saveStatus === "saving" ||
        saveStatus === "retrying" ||
        saveStatus === "failed" ||
        saveStatus === "forbidden") && (
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
            {saveStatus === "forbidden" && (
              <div className="flex flex-col gap-1">
                <span style={{ color: "#dc2626", fontWeight: 500 }}>
                  ⚠️ Couldn&apos;t save
                </span>
                <span style={{ color: "var(--ink-soft)", fontSize: "11px" }}>
                  {saveError || "You can't edit this note."}
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
