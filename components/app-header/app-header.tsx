"use client";

import { useCaptureOverlay } from "@/lib/capture-context";
import { Search, Plus, X } from "lucide-react";
import { ReactNode, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { SearchResults } from "@/components/search-results/search-results";
import { NoteWithLocation } from "@/lib/types";

/**
 * Custom hook for debouncing a value.
 * Returns the debounced value after the specified delay.
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear the timeout if value changes before the delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * App header component following Jot's design language.
 *
 * Layout:
 * - Left: Page title in Space Grotesk
 * - Center: Search bar with Search icon and debounced global search
 * - Right: "New note" button with Plus icon and ⌘⏎ keyboard hint
 *
 * Search behavior:
 * - Debounces queries by 300ms to avoid excessive API calls
 * - Input maintains focus during search (critical UX requirement)
 * - Results appear in a dropdown below the search bar
 * - Searches across all notes, meetings, topics, and projects
 *
 * White background, bottom border, max-width container centered.
 */
export function AppHeader({ title }: { title: string | ReactNode }) {
  const { openCapture } = useCaptureOverlay();
  const [searchQuery, setSearchQuery] = useState("");
  const [shouldShowResults, setShouldShowResults] = useState(true);

  // Ref to the search input - used to maintain focus
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce the search query by 300ms
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Derive whether results should be shown
  const isSearchOpen = searchQuery.trim().length > 0 && shouldShowResults;

  // Query the search API with the debounced value
  // Only enable when there's a non-empty debounced query
  const { data, isLoading } = useQuery<{ results: NoteWithLocation[] }>({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}`,
      );
      if (!response.ok) {
        throw new Error("Search failed");
      }
      return response.json();
    },
    enabled: debouncedQuery.trim().length > 0,
    // Keep previous data while fetching new results (smoother UX)
    placeholderData: (prev) => prev,
  });

  // Close results when user clicks outside the search area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside the search container
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setShouldShowResults(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isSearchOpen]);

  // Handle input change - re-enable showing results when user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShouldShowResults(true);
  };

  // Handle clearing the search
  const handleClear = () => {
    setSearchQuery("");
    setShouldShowResults(false);
    // Maintain focus on the input after clearing
    searchInputRef.current?.focus();
  };

  // Handle closing the results (called from SearchResults when a result is clicked)
  const handleCloseResults = () => {
    setSearchQuery("");
    setShouldShowResults(false);
  };

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

        {/* Search bar - wrapped in a container for the dropdown */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)] pointer-events-none z-10" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="Search notes..."
            className={cn(
              "h-10 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper)] pl-10 pr-10 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)]",
              "transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2",
            )}
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            onFocus={() => {
              // Re-open results if there's still a query when re-focusing
              if (searchQuery.trim().length > 0) {
                setShouldShowResults(true);
              }
            }}
          />

          {/* Clear button - only show when there's a query */}
          {searchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search results dropdown */}
          {isSearchOpen && (
            <SearchResults
              results={data?.results || []}
              isLoading={isLoading}
              query={searchQuery}
              onClose={handleCloseResults}
            />
          )}
        </div>

        {/* New note button */}
        <Button
          onClick={() => openCapture()}
          variant="primary"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New note
          <Kbd>⌘⏎</Kbd>
        </Button>
      </div>
    </header>
  );
}
