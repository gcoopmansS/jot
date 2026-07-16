"use client";

import { useCaptureOverlay } from "@/lib/capture-context";
import { Search, Plus } from "lucide-react";
import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

/**
 * App header component following Jot's design language.
 *
 * Layout:
 * - Left: Page title in Space Grotesk
 * - Center: Search bar with Search icon
 * - Right: "New note" button with Plus icon and ⌘N keyboard hint
 *
 * White background, bottom border, max-width container centered.
 */
export function AppHeader({ title }: { title: string | ReactNode }) {
  const { openCapture } = useCaptureOverlay();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="border-b border-[var(--line)] bg-[var(--paper-raised)]">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-10 py-4">
        {/* Page title */}
        <h2
          className="text-lg font-semibold text-[var(--ink)]"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          {title}
        </h2>

        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className={cn(
              "h-10 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper)] pl-10 pr-4 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)]",
              "transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2",
            )}
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          />
        </div>

        {/* New note button */}
        <Button onClick={openCapture} variant="primary" className="gap-2">
          <Plus className="h-4 w-4" />
          New note
          <Kbd>⌘N</Kbd>
        </Button>
      </div>
    </header>
  );
}
