"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * "Set a new password" page.
 *
 * Reached after clicking the link in a password-reset email. Supabase's
 * recovery links carry the session tokens in the URL *hash fragment*
 * (#access_token=...&refresh_token=...), not a ?code= query param - a
 * fragment never reaches the server, so this can't go through a server
 * route. The Supabase client's own automatic hash-detection isn't reliable
 * here (a known friction point with Next.js's routing/hydration), so we
 * parse the hash ourselves on mount and explicitly call setSession().
 *
 * If someone reaches this page without valid tokens (expired or
 * already-used link), we show an error pointing back to
 * /auth/forgot-password to request a new one.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);

  useEffect(() => {
    const establishSessionFromLink = async () => {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      const errorDescription = hashParams.get("error_description");
      if (errorDescription) {
        setError(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
        setCheckingLink(false);
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        // Remove the tokens from the URL now that they're consumed, so they
        // don't linger in the address bar/browser history.
        window.history.replaceState(null, "", window.location.pathname);

        if (sessionError) {
          setError(sessionError.message);
        } else {
          setSessionReady(true);
        }
      } else {
        setError(
          "This reset link is missing or invalid. Please request a new one.",
        );
      }

      setCheckingLink(false);
    };

    establishSessionFromLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      // Password updated and we're already signed in via the recovery
      // session - go straight into the app.
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Your reset link may have expired.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--paper)] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <h1
              className="text-4xl font-semibold text-[var(--ink)] mb-2 hover:text-[var(--accent)] transition-colors cursor-pointer"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              Jot
            </h1>
          </Link>
          <p
            className="text-[var(--ink-soft)]"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            Choose a new password
          </p>
        </div>

        <div className="bg-[var(--paper-raised)] rounded-[var(--radius)] border border-[var(--line)] p-6">
          {checkingLink ? (
            <p
              className="text-sm text-[var(--ink-soft)]"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              Verifying your reset link...
            </p>
          ) : !sessionReady ? (
            <div
              className="p-3 bg-red-50 border border-red-200 rounded-[var(--radius)] text-red-800 text-sm"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              {error}{" "}
              <Link
                href="/auth/forgot-password"
                className="underline hover:text-red-900"
              >
                Request a new link
              </Link>
              .
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[var(--radius)] text-red-800 text-sm"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  {error}{" "}
                  <Link
                    href="/auth/forgot-password"
                    className="underline hover:text-red-900"
                  >
                    Request a new link
                  </Link>
                  .
                </div>
              )}

              <div className="mb-4">
                <label
                  htmlFor="password"
                  className="block text-xs uppercase tracking-wide font-medium text-[var(--ink-soft)] mb-2"
                  style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                  className="w-full px-3 py-2 border border-[var(--line)] rounded-[var(--radius)] bg-[var(--paper)] focus:outline-none focus:border-[var(--accent)] transition-colors text-[var(--ink)]"
                  placeholder="••••••••"
                />
                <p
                  className="mt-2 text-xs text-[var(--ink-soft)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  Must be at least 8 characters
                </p>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="confirm-password"
                  className="block text-xs uppercase tracking-wide font-medium text-[var(--ink-soft)] mb-2"
                  style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                  className="w-full px-3 py-2 border border-[var(--line)] rounded-[var(--radius)] bg-[var(--paper)] focus:outline-none focus:border-[var(--accent)] transition-colors text-[var(--ink)]"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                className="w-full py-3 px-4 bg-[var(--ink)] text-[var(--paper)] rounded-[var(--radius)] font-medium hover:bg-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {loading ? "Saving..." : "Set new password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
