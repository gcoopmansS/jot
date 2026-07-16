"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { CaptureProvider, useCaptureOverlay } from "@/lib/capture-context";
import { CaptureOverlay } from "@/components/capture/capture-overlay";

/**
 * Inner component that uses the capture context.
 * Handles keyboard shortcuts for opening capture.
 */
function AppShellInner({ children }: { children: React.ReactNode }) {
  const { openCapture } = useCaptureOverlay();

  // Global keyboard shortcut: Cmd/Ctrl + N to open capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        openCapture();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCapture]);

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
