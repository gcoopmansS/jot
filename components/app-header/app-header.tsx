"use client";

import { useCaptureOverlay } from "@/lib/capture-context";
import { ReactNode } from "react";

/**
 * App header component.
 *
 * Shows:
 * - Current page title
 * - Search bar
 * - + New note button (primary action)
 *
 * Matches the prototype design.
 */
export function AppHeader({ title }: { title: string | ReactNode }) {
  const { openCapture } = useCaptureOverlay();

  return (
    <header className="border-b border-[#E0DCD7] bg-white px-6 py-4 flex items-center justify-between">
      {/* Page title */}
      <h2 className="text-lg font-semibold text-[#1A1A1A]">{title}</h2>

      {/* Search and New Note */}
      <div className="flex items-center gap-4">
        {/* Search bar */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B0B0B0]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search notes, projects, topics..."
            className="pl-10 pr-4 py-2 w-80 text-sm bg-[#F8F6F4] border border-[#E0DCD7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent placeholder:text-[#B0B0B0]"
          />
        </div>

        {/* New note button */}
        <button
          onClick={openCapture}
          className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-md hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          <span>New note</span>
          <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-[#3A3A3A] rounded">
            ⌘N
          </kbd>
        </button>
      </div>
    </header>
  );
}
