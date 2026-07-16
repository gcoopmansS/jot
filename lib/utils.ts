import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind classes with proper precedence.
 * Combines clsx for conditional classes and tailwind-merge for deduplication.
 *
 * Example:
 *   cn("px-4", condition && "bg-red-500", "px-2")
 *   // → "px-2 bg-red-500" (last px wins)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
