"use client";

import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

/**
 * Sign-in/sign-up page for the Jot app.
 *
 * This is a simple combined form that lets users either:
 * - Sign in with their existing email/password
 * - Create a new account with email/password
 *
 * After successful auth, users are redirected to the main app.
 *
 * Supports ?mode=sign-up URL parameter to default to sign-up mode.
 */

// Internal component that uses useSearchParams - must be wrapped in Suspense
function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

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

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "sign-in") {
        // Sign in with existing account
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Success! Redirect to the app
        router.push("/");
        router.refresh();
      } else {
        // Create new account
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Supabase may require email confirmation depending on your settings
        // For now, we'll show a success message and let them sign in
        setMessage(
          "Account created! If email confirmation is enabled, please check your email. Otherwise, you can sign in now.",
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
          <h1
            className="text-4xl font-semibold text-[var(--ink)] mb-2"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Jot
          </h1>
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
            <label
              htmlFor="password"
              className="block text-xs uppercase tracking-wide font-medium text-[var(--ink-soft)] mb-2"
              style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
            >
              Password
            </label>
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
                Must be at least 6 characters
              </p>
            )}
          </div>

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
