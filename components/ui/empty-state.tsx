import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  /**
   * Lucide icon to display above the text
   */
  icon?: LucideIcon;
  /**
   * Main title of the empty state
   */
  title: string;
  /**
   * Optional description providing more context or guidance
   */
  description?: string;
  /**
   * Optional action button or element to display
   */
  action?: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * EmptyState component for displaying helpful messages when no content exists.
 *
 * Each empty state should have specific, useful copy — never generic "No data".
 *
 * Examples:
 * - Unsorted inbox: "All caught up — no unsorted notes."
 * - No search results: "No notes match '[query]' — try a different search term."
 * - Empty project: "No meetings or topics yet — file a note here to create one."
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && <Icon className="h-12 w-12 text-[var(--ink-soft)] opacity-40" />}
      <div className="flex flex-col gap-1.5">
        <h3
          className="text-base font-medium text-[var(--ink)]"
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          {title}
        </h3>
        {description && (
          <p
            className="text-sm text-[var(--ink-soft)]"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { EmptyState };
