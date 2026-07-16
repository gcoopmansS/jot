/**
 * Network status monitoring for reliable saves.
 *
 * Tracks online/offline status and notifies listeners when connectivity changes.
 */

type NetworkStatusListener = (isOnline: boolean) => void;

class NetworkMonitor {
  private listeners: Set<NetworkStatusListener> = new Set();
  private isListening = false;

  /**
   * Add a listener for network status changes.
   */
  addListener(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    this.startListening();

    // Return cleanup function
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopListening();
      }
    };
  }

  /**
   * Get current online status.
   */
  isOnline(): boolean {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }

  private startListening(): void {
    if (this.isListening || typeof window === "undefined") return;

    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    this.isListening = true;
  }

  private stopListening(): void {
    if (!this.isListening || typeof window === "undefined") return;

    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    this.isListening = false;
  }

  private handleOnline = (): void => {
    this.notifyListeners(true);
  };

  private handleOffline = (): void => {
    this.notifyListeners(false);
  };

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach((listener) => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error("Error in network status listener:", error);
      }
    });
  }
}

// Singleton instance
export const networkMonitor = new NetworkMonitor();
