import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Optional label to display above the input.
   * Styled in uppercase IBM Plex Mono to match design system.
   */
  label?: string;
}

/**
 * Input component following Jot's design language.
 *
 * Supports autocomplete via the `list` attribute + <datalist>.
 * Never use <select> dropdowns — always use this + datalist.
 *
 * Example:
 *   <Input list="projects" label="Which project?" />
 *   <datalist id="projects">
 *     <option value="Client Migration" />
 *     <option value="Internal Tooling" />
 *   </datalist>
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, id, ...props }, ref) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-mono uppercase tracking-wide text-[var(--ink-soft)]"
            style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-10 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm ring-offset-[var(--paper)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--ink-soft)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
