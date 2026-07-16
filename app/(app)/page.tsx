"use client";

import { AppHeader } from "@/components/app-header/app-header";

/**
 * Main authenticated app page.
 *
 * This is the home page that users see after signing in.
 * Shows the Everything view by default.
 */
export default function HomePage() {
  return (
    <>
      <AppHeader title="Everything" />
      <div className="flex-1 px-6 py-6">
        {/* Placeholder for note cards */}
        <div className="text-sm text-[#B0B0B0] text-center mt-12">
          No notes yet. Click + New note to start writing.
        </div>
      </div>
    </>
  );
}
