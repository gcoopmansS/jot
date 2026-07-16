/**
 * Loading spinner component.
 *
 * Simple, consistent loading indicator following the design system.
 * Uses a spinning circle animation with the accent color.
 */

export function LoadingSpinner({
  size = "default",
}: {
  size?: "sm" | "default" | "lg";
}) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    default: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-[3px]",
  };

  return (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-[var(--accent)] border-r-transparent`}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Full-page loading state with centered spinner.
 */
export function LoadingPage({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <LoadingSpinner />
      {message && (
        <p
          className="mt-4 text-sm text-[var(--ink-soft)]"
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
