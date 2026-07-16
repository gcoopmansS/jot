"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Note } from "@/lib/types";
import { Kbd } from "@/components/ui/kbd";

/**
 * Note detail page - shows a single note in full-screen editable view.
 *
 * Looks identical to the capture overlay but loads and updates existing notes.
 * User can edit the text and changes auto-save on blur or when pressing ESC.
 */
export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const noteId = params.id as string;

  const [text, setText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  }, [hasChanges, text]);

  // Track changes
  const handleTextChange = (newText: string) => {
    setText(newText);
    setHasChanges(newText !== note?.text);
  };

  // Save the note
  const handleSave = async () => {
    if (!hasChanges || !text.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note", noteId] });

      setHasChanges(false);
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle close button
  const handleClose = async () => {
    if (hasChanges) {
      await handleSave();
    }
    router.back();
  };

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
          {hasChanges ? (
            <span>
              Unsaved changes · <Kbd className="mr-2">esc</Kbd> to save and
              close
            </span>
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
          disabled={isSaving}
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
  );
}
