"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { CaptureProvider, useCaptureOverlay } from "@/lib/capture-context";
import { CaptureOverlay } from "@/components/capture/capture-overlay";
import { loadDraft } from "@/lib/draft-storage";
import { pendingSavesManager } from "@/lib/pending-saves";

/**
 * Inner component that uses the capture context.
 * Handles keyboard shortcuts for opening capture and draft restoration.
 */
function AppShellInner({ children }: { children: React.ReactNode }) {
  const { openCapture, isOpen } = useCaptureOverlay();

  // On mount: check for leftover draft and restore it
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.text.trim()) {
      // Auto-open capture with the restored draft text and ID
      openCapture(draft.text, draft.id);
    }
    // Only run once on mount - openCapture is stable but we don't need to re-run this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl + Enter to open capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only fire if Cmd/Ctrl + Enter is pressed
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        // Don't open if already open
        if (isOpen) return;

        // Don't fire if user is typing in an input, textarea, or contenteditable
        const target = e.target as HTMLElement;
        const isTyping =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (isTyping) return;

        e.preventDefault();
        openCapture();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCapture, isOpen]);

  // Warn before leaving if there are pending saves in the queue
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if there are any pending saves waiting to be retried
      if (pendingSavesManager.hasAnyPending()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <div className="flex h-screen bg-[var(--paper)]">
      {/* Sidebar - fixed width on the left */}
      <Sidebar />

      {/* Main content area - fills remaining space */}
      <main className="flex-1 overflow-y-auto flex flex-col">{children}</main>

      {/* Capture overlay - shown when user clicks + New note or presses ⌘N */}
      <CaptureOverlay />
    </div>
  );
}

/**
 * Client-side wrapper for the app shell.
 *
 * Provides the capture overlay context and renders the sidebar + main content.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CaptureProvider>
      <AppShellInner>{children}</AppShellInner>
    </CaptureProvider>
  );
}
