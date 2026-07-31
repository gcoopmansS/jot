"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Catches errors that crash the whole app (including the root layout).
 * Next.js requires this to render its own <html>/<body> tags, since it
 * replaces the root layout entirely when it's shown - so it can't rely on
 * globals.css being loaded, hence the inline styles.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          backgroundColor: "#F1F0EA",
          color: "#1B2521",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "24rem", padding: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#5A6560", marginBottom: "1.5rem" }}>
            Sorry about that - the error has been reported automatically.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.6rem 1.2rem",
              backgroundColor: "#1B2521",
              color: "#F1F0EA",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
