"use client";

import { createClient } from "@/lib/supabase";
import { useState } from "react";
import Link from "next/link";

/**
 * "Forgot password?" page.
 *
 * User enters their email, we ask Supabase to send a password reset link.
 * The link goes through /auth/callback (same code-exchange route used for
 * email confirmations) and lands on /auth/reset-password to set a new one.
 */
export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const siteUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

      // Supabase's password-recovery links use the hash-fragment convention
      // (#access_token=...&type=recovery) rather than a ?code= query param.
      // A fragment never reaches the server - it's browser-only - so this must
      // redirect straight to a CLIENT page (reset-password) whose Supabase
      // client can read it (detectSessionInUrl, on by default), not through
      // the server-only /auth/callback route, which would never see it and
      // would discard it on its own redirect.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/reset-password`,
      });

      if (error) throw error;

      // Show the same generic confirmation whether or not the email is
      // actually registered - don't reveal which emails have accounts.
      setSubmitted(true);
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
            Reset your password
          </p>
        </div>

        <div className="bg-[var(--paper-raised)] rounded-[var(--radius)] border border-[var(--line)] p-6">
          {submitted ? (
            <>
              <div
                className="mb-4 p-3 bg-green-50 border border-green-200 rounded-[var(--radius)] text-green-800 text-sm"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                If an account exists for that email, we&apos;ve sent a link to
                reset your password. Check your inbox.
              </div>
              <Link
                href="/auth/sign-in"
                className="block text-center text-sm text-[var(--accent)] hover:underline"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <p
                className="mb-4 text-sm text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                Enter the email address on your account and we&apos;ll send
                you a link to reset your password.
              </p>

              {error && (
                <div
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[var(--radius)] text-red-800 text-sm"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  {error}
                </div>
              )}

              <div className="mb-6">
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

              <button
                type="submit"
                disabled={loading}
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                className="w-full py-3 px-4 bg-[var(--ink)] text-[var(--paper)] rounded-[var(--radius)] font-medium hover:bg-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>

              <Link
                href="/auth/sign-in"
                className="block text-center mt-4 text-sm text-[var(--accent)] hover:underline"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
