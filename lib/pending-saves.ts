/**
 * Pending saves manager for reliable note persistence.
 *
 * Tracks notes that failed to save and retries them automatically
 * when the network comes back online or on app restart.
 */

import { networkMonitor } from "./network-monitor";
import { retryWithBackoff } from "./retry";

const PENDING_SAVES_KEY = "jot-pending-saves";

export interface PendingSave {
  id: string; // Client-generated UUID
  text: string;
  type: "meeting" | "general";
  meetingId?: string;
  topicId?: string;
  isUnsorted: boolean;
  timestamp: number;
  attemptCount: number;
}

type SaveStatusListener = (status: {
  id: string;
  state: "saving" | "saved" | "failed" | "retrying";
  error?: string;
}) => void;

class PendingSavesManager {
  private pending: Map<string, PendingSave> = new Map();
  private listeners: Set<SaveStatusListener> = new Set();
  private retryInProgress = false;

  constructor() {
    // Load pending saves from localStorage on initialization
    this.loadPending();

    // Listen for network status changes
    if (typeof window !== "undefined") {
      networkMonitor.addListener((isOnline) => {
        if (isOnline) {
          this.retryAllPending();
        }
      });
    }
  }

  /**
   * Add a save status listener.
   */
  addListener(listener: SaveStatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get all pending saves.
   */
  getPending(): PendingSave[] {
    return Array.from(this.pending.values());
  }

  /**
   * Check if a specific note has a pending save.
   */
  hasPending(id: string): boolean {
    return this.pending.has(id);
  }

  /**
   * Check if there are any pending saves in the queue.
   */
  hasAnyPending(): boolean {
    return this.pending.size > 0;
  }

  /**
   * Add a note to the pending queue.
   */
  addPending(save: PendingSave): void {
    // Sanitize the save to ensure it meets the constraint
    const hasCategorization =
      (save.type === "meeting" && save.meetingId) ||
      (save.type === "general" && save.topicId);

    // If no categorization, ensure isUnsorted is true
    const sanitizedSave = {
      ...save,
      isUnsorted:
        save.isUnsorted !== undefined ? save.isUnsorted : !hasCategorization,
    };

    this.pending.set(sanitizedSave.id, sanitizedSave);
    this.savePending();
  }

  /**
   * Remove a note from the pending queue (after successful save).
   */
  removePending(id: string): void {
    this.pending.delete(id);
    this.savePending();
  }

  /**
   * Retry all pending saves.
   */
  async retryAllPending(): Promise<void> {
    if (this.retryInProgress || this.pending.size === 0) {
      return;
    }

    this.retryInProgress = true;

    try {
      const saves = Array.from(this.pending.values());

      for (const save of saves) {
        try {
          await this.retrySave(save);
        } catch (error) {
          // Continue with other saves even if one fails
          console.error(`Failed to retry save ${save.id}:`, error);
        }
      }
    } finally {
      this.retryInProgress = false;
    }
  }

  /**
   * Retry a specific pending save.
   */
  private async retrySave(save: PendingSave): Promise<void> {
    this.notifyListeners({
      id: save.id,
      state: "retrying",
    });

    try {
      await retryWithBackoff(() => this.executeSave(save), {
        maxAttempts: 3,
        onRetry: (attempt) => {
          console.log(`Retrying save ${save.id}, attempt ${attempt}`);
        },
      });

      // Success - remove from pending
      this.removePending(save.id);
      this.notifyListeners({
        id: save.id,
        state: "saved",
      });
    } catch (error) {
      // All retries failed
      save.attemptCount++;
      this.pending.set(save.id, save);
      this.savePending();

      this.notifyListeners({
        id: save.id,
        state: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Execute the actual save to Supabase.
   */
  private async executeSave(save: PendingSave): Promise<void> {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: save.id,
        text: save.text,
        type: save.type,
        meeting_id: save.meetingId || null,
        topic_id: save.topicId || null,
        is_unsorted: save.isUnsorted,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to save note");
    }
  }

  /**
   * Load pending saves from localStorage.
   */
  private loadPending(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(PENDING_SAVES_KEY);
      if (stored) {
        const saves: PendingSave[] = JSON.parse(stored);

        // Sanitize old pending saves to ensure they meet the constraint
        const sanitizedSaves = saves.map((save) => {
          // Check if the save has proper categorization
          const hasCategorization =
            (save.type === "meeting" && save.meetingId) ||
            (save.type === "general" && save.topicId);

          // If no categorization but isUnsorted is false/undefined, fix it
          if (!hasCategorization && !save.isUnsorted) {
            return { ...save, isUnsorted: true };
          }

          return save;
        });

        this.pending = new Map(sanitizedSaves.map((save) => [save.id, save]));

        // Retry any pending saves on startup
        if (this.pending.size > 0 && networkMonitor.isOnline()) {
          // Defer retry to avoid blocking initialization
          setTimeout(() => this.retryAllPending(), 1000);
        }
      }
    } catch (error) {
      console.error("Failed to load pending saves:", error);
    }
  }

  /**
   * Save pending queue to localStorage.
   */
  private savePending(): void {
    if (typeof window === "undefined") return;

    try {
      const saves = Array.from(this.pending.values());
      localStorage.setItem(PENDING_SAVES_KEY, JSON.stringify(saves));
    } catch (error) {
      console.error("Failed to save pending queue:", error);
    }
  }

  /**
   * Notify all listeners of a status change.
   */
  private notifyListeners(status: Parameters<SaveStatusListener>[0]): void {
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error("Error in save status listener:", error);
      }
    });
  }
}

// Singleton instance
export const pendingSavesManager = new PendingSavesManager();
