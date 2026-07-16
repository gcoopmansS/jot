import * as React from "react";
import { cn } from "@/lib/utils";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * The keyboard shortcut to display, e.g., "⌘N" or "Esc"
   */
  children: React.ReactNode;
}

/**
 * Kbd component for displaying keyboard shortcuts.
 * Styled with IBM Plex Mono font, subtle background, and border.
 *
 * Example:
 *   <Kbd>⌘N</Kbd>
 *   <Kbd>Esc</Kbd>
 */
function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center rounded border border-[var(--line)] bg-[var(--paper-raised)] px-1.5 py-0.5 text-xs font-mono text-[var(--ink-soft)] shadow-sm",
        className,
      )}
      style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
      {...props}
    >
      {children}
    </kbd>
  );
}

export { Kbd };
