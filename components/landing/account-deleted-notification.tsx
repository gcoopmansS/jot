"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

/**
 * Shows a success notification when account has been deleted.
 * Displays for a few seconds then auto-dismisses.
 */
export function AccountDeletedNotification() {
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("deleted") === "true") {
      setIsVisible(true);
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-5 fade-in duration-300">
      <div className="rounded-[var(--radius)] border border-green-200 bg-green-50 p-4 shadow-[var(--shadow-pop)]">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3
              className="font-semibold text-green-900 text-sm"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Account Deleted
            </h3>
            <p
              className="mt-1 text-sm text-green-800"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Your account and all associated data have been permanently
              deleted.
            </p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="ml-auto text-green-600 hover:text-green-800 transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
