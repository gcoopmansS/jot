/**
 * Local draft persistence utilities.
 *
 * Manages saving note drafts to browser localStorage to prevent data loss
 * from accidental refresh, tab close, or crashes.
 *
 * Key principles:
 * - Drafts are saved BEFORE any Supabase save
 * - Drafts persist until explicitly cleared after successful save
 * - On app load, any leftover draft is restored automatically
 * - Each draft has a unique ID that persists across retries
 */

const DRAFT_KEY = "jot-draft";

export interface Draft {
  id: string; // UUID generated when capture starts
  text: string;
  timestamp: number;
}

/**
 * Save the current draft text to localStorage.
 * Call this as the user types (debounced).
 */
export function saveDraft(id: string, text: string): void {
  if (typeof window === "undefined") return;

  const draft: Draft = {
    id,
    text,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error("Failed to save draft to localStorage:", error);
  }
}

/**
 * Retrieve any saved draft from localStorage.
 * Returns null if no draft exists.
 */
export function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (!stored) return null;

    const draft = JSON.parse(stored) as Draft;
    return draft;
  } catch (error) {
    console.error("Failed to load draft from localStorage:", error);
    return null;
  }
}

/**
 * Clear the saved draft from localStorage.
 * Call this only after successful save to Supabase.
 */
export function clearDraft(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.error("Failed to clear draft from localStorage:", error);
  }
}

/**
 * Check if a draft exists without loading it.
 */
export function hasDraft(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DRAFT_KEY) !== null;
}
