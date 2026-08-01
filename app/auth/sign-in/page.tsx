"use client";

import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

/**
 * Sign-in/sign-up page for the Jot app.
 *
 * This is a simple combined form that lets users either:
 * - Sign in with their existing email/password
 * - Create a new account with email/password
 *
 * After successful auth, users are redirected to the main app.
 *
 * Supports ?mode=sign-up URL parameter to default to sign-up mode, and
 * ?redirect=<path> to land somewhere other than "/" after signing in (used
 * by the invite-accept flow so a visitor who has to sign in/up first ends
 * up back on the invite page afterward).
 */

// Guards against an open redirect - only ever push to a same-origin
// relative path, never an absolute URL a malicious link could supply.
function getSafeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

// Internal component that uses useSearchParams - must be wrapped in Suspense
function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const redirectTarget = getSafeRedirect(searchParams.get("redirect"));

  // Track which mode we're in: sign-in or sign-up
  // Check URL parameter to determine initial mode
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  // Set initial mode from URL parameter
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "sign-up") {
      setMode("sign-up");
    }
  }, [searchParams]);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [privacyError, setPrivacyError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPrivacyError(false);

    // Validate privacy policy agreement for sign-up
    if (mode === "sign-up" && !agreedToPrivacy) {
      setPrivacyError(true);
      setError("Please agree to the Privacy Policy to continue");
      return;
    }

    setLoading(true);

    try {
      if (mode === "sign-in") {
        // Sign in with existing account
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Success! Redirect to the app (or wherever the caller asked for,
        // e.g. back to an invite page)
        router.push(redirectTarget);
        router.refresh();
      } else {
        // Create new account
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          // Email confirmation is disabled for this project - signUp()
          // already returned a live session, so proceed exactly like a
          // successful sign-in.
          router.push(redirectTarget);
          router.refresh();
          return;
        }

        // Confirmation required - they'll need to check their email, then
        // sign in manually. Switching to the sign-in tab is a local state
        // change, not a navigation, so `redirect` stays in the URL for
        // whenever they do sign in below.
        setMessage(
          "Account created! Please check your email, then sign in below.",
        );
        setMode("sign-in");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
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
            {mode === "sign-in"
              ? "Sign in to your account"
              : "Create a new account"}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6 bg-[var(--paper-raised)] rounded-[var(--radius)] p-1 border border-[var(--line)]">
          <button
            type="button"
            onClick={() => {
              setMode("sign-in");
              setError(null);
              setMessage(null);
              setPrivacyError(false);
            }}
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            className={`flex-1 py-2 px-4 rounded-[var(--radius)] font-medium transition-colors ${
              mode === "sign-in"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-soft)] hover:bg-[var(--paper)]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("sign-up");
              setError(null);
              setMessage(null);
              setPrivacyError(false);
            }}
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            className={`flex-1 py-2 px-4 rounded-[var(--radius)] font-medium transition-colors ${
              mode === "sign-up"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--ink-soft)] hover:bg-[var(--paper)]"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--paper-raised)] rounded-[var(--radius)] border border-[var(--line)] p-6"
        >
          {/* Error message */}
          {error && (
            <div
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[var(--radius)] text-red-800 text-sm"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              {error}
            </div>
          )}

          {/* Success message */}
          {message && (
            <div
              className="mb-4 p-3 bg-green-50 border border-green-200 rounded-[var(--radius)] text-green-800 text-sm"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              {message}
            </div>
          )}

          {/* Email field */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-xs uppercase tracking-wide font-medium text-[var(--ink-soft)] mb-2"
              style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              className="w-full px-3 py-2 border border-[var(--line)] rounded-[var(--radius)] bg-[var(--paper)] focus:outline-none focus:border-[var(--accent)] transition-colors text-[var(--ink)]"
              placeholder="you@example.com"
            />
          </div>

          {/* Password field */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-xs uppercase tracking-wide font-medium text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
              >
                Password
              </label>
              {mode === "sign-in" && (
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-[var(--accent)] hover:underline"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              className="w-full px-3 py-2 border border-[var(--line)] rounded-[var(--radius)] bg-[var(--paper)] focus:outline-none focus:border-[var(--accent)] transition-colors text-[var(--ink)]"
              placeholder="••••••••"
            />
            {mode === "sign-up" && (
              <p
                className="mt-2 text-xs text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                Must be at least 8 characters
              </p>
            )}
          </div>

          {/* Privacy policy checkbox - only show during sign-up */}
          {mode === "sign-up" && (
            <div className="mb-4">
              <label
                className="flex items-start gap-3 cursor-pointer group"
                htmlFor="privacy-checkbox"
              >
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    id="privacy-checkbox"
                    type="checkbox"
                    checked={agreedToPrivacy}
                    onChange={(e) => {
                      setAgreedToPrivacy(e.target.checked);
                      setPrivacyError(false);
                      setError(null);
                    }}
                    className="peer w-5 h-5 border-2 rounded cursor-pointer appearance-none transition-colors"
                    style={{
                      borderColor: privacyError ? "#dc2626" : "var(--line)",
                    }}
                  />
                  {/* Custom checkmark */}
                  <svg
                    className="absolute w-3 h-3 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                    viewBox="0 0 12 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 5L4.5 8.5L11 1"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {/* Background color when checked */}
                  <div
                    className="absolute inset-0 rounded opacity-0 peer-checked:opacity-100 transition-opacity -z-10"
                    style={{ backgroundColor: "var(--accent)" }}
                  />
                </div>
                <span
                  className="text-sm text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  I agree to the{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] underline hover:text-[var(--ink)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] underline hover:text-[var(--ink)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Service
                  </a>
                </span>
              </label>
              {privacyError && (
                <p
                  className="mt-2 text-xs text-red-600"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  You must agree to the Privacy Policy and Terms of Service to
                  create an account
                </p>
              )}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            className="w-full py-3 px-4 bg-[var(--ink)] text-[var(--paper)] rounded-[var(--radius)] font-medium hover:bg-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? "Loading..."
              : mode === "sign-in"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Export wrapped in Suspense to handle useSearchParams
export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--paper)]">
          <div className="text-[var(--ink-soft)]">Loading...</div>
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
