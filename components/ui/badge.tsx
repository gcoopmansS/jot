import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge variants following Jot's design language.
 *
 * Variants:
 * - meeting: teal background (--accent), white text
 * - general: purple background (--purple), white text
 * - unsorted: amber background (--amber), dark text
 * - count: subtle gray for counts in sidebar
 */
const badgeVariants = cva(
  // Base styles - small, rounded, uppercase
  "inline-flex items-center justify-center rounded-[var(--radius)] px-2 py-1 text-xs font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        meeting: "bg-[var(--accent)] text-white",
        general: "bg-[var(--purple)] text-white",
        unsorted: "bg-[var(--amber)] text-[var(--ink)]",
        count: "bg-[var(--line)] text-[var(--ink-soft)] font-mono",
      },
    },
    defaultVariants: {
      variant: "meeting",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Badge component for type indicators and counts.
 * Used for MEETING/GENERAL labels and sidebar counts.
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
