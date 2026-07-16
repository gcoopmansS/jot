import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button variants following Jot's design language.
 *
 * Variants:
 * - primary: dark background (--ink), white text, teal hover
 * - secondary: no background, underlined text, subtle hover
 * - ghost: minimal styling, background on hover
 * - toggle: for type selectors (Meeting/General) with selected state
 */
const buttonVariants = cva(
  // Base styles - always applied
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--accent)]",
        secondary:
          "underline decoration-1 underline-offset-4 text-[var(--ink-soft)] hover:text-[var(--ink)]",
        ghost: "hover:bg-[var(--accent-soft)] text-[var(--ink)]",
        toggle:
          "border border-[var(--line)] data-[state=selected]:border-transparent data-[state=selected]:text-white data-[state=unselected]:bg-[var(--paper)] data-[state=unselected]:text-[var(--ink)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-sm",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * Button component with consistent styling across the app.
 * Uses class-variance-authority to manage variants cleanly.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
