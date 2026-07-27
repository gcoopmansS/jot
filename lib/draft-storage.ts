/**
 * Local draft persistence utilities.
 *
 * Manages saving note drafts to browser localStorage to prevent data loss
 * from accidental refresh, tab close, or crashes.
 *
 * SECURITY: Drafts are now user-scoped to prevent Account A's draft from
 * appearing when Account B signs in on the same browser.
 *
 * Key principles:
 * - Drafts are saved BEFORE any Supabase save
 * - Drafts persist until explicitly cleared after successful save
 * - On app load, any leftover draft is restored automatically
 * - Each draft has a unique ID that persists across retries
 * - Each user's drafts are stored under a separate localStorage key
 */

const DRAFT_KEY_PREFIX = "jot-draft";

/**
 * Get the user-scoped localStorage key for drafts.
 * CRITICAL: This prevents data leakage between user accounts.
 */
function getDraftKey(userId: string): string {
  return `${DRAFT_KEY_PREFIX}-${userId}`;
}

export interface Draft {
  id: string; // UUID generated when capture starts
  text: string;
  timestamp: number;
}

/**
 * Save the current draft text to localStorage.
 * Call this as the user types (debounced).
 *
 * @param userId - The current user's ID (REQUIRED for security)
 * @param id - The draft ID
 * @param text - The draft text
 */
export function saveDraft(userId: string, id: string, text: string): void {
  if (typeof window === "undefined") return;

  const draft: Draft = {
    id,
    text,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(getDraftKey(userId), JSON.stringify(draft));
  } catch (error) {
    console.error("Failed to save draft to localStorage:", error);
  }
}

/**
 * Retrieve any saved draft from localStorage for the current user.
 * Returns null if no draft exists.
 *
 * @param userId - The current user's ID (REQUIRED for security)
 */
export function loadDraft(userId: string): Draft | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(getDraftKey(userId));
    if (!stored) return null;

    const draft = JSON.parse(stored) as Draft;
    return draft;
  } catch (error) {
    console.error("Failed to load draft from localStorage:", error);
    return null;
  }
}

/**
 * Clear the saved draft from localStorage for the current user.
 * Call this only after successful save to Supabase.
 *
 * @param userId - The current user's ID (REQUIRED for security)
 */
export function clearDraft(userId: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(getDraftKey(userId));
  } catch (error) {
    console.error("Failed to clear draft from localStorage:", error);
  }
}

/**
 * Clear ALL drafts for ALL users (used on sign-out for security).
 * This removes any leftover drafts from previous sessions.
 */
export function clearAllDrafts(): void {
  if (typeof window === "undefined") return;

  try {
    // Find and remove all keys matching the draft prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error("Failed to clear all drafts from localStorage:", error);
  }
}

/**
 * Check if a draft exists for the current user without loading it.
 *
 * @param userId - The current user's ID (REQUIRED for security)
 */
export function hasDraft(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getDraftKey(userId)) !== null;
}
