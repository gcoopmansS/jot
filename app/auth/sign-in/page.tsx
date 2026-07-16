"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Sign-in/sign-up page for the Jot app.
 *
 * This is a simple combined form that lets users either:
 * - Sign in with their existing email/password
 * - Create a new account with email/password
 *
 * After successful auth, users are redirected to the main app.
 */
export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  // Track which mode we're in: sign-in or sign-up
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

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
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#2C2416] mb-2 font-[family-name:var(--font-space-grotesk)]">
            Jot
          </h1>
          <p className="text-[#6B5A48] font-[family-name:var(--font-ibm-plex-sans)]">
            {mode === "sign-in"
              ? "Sign in to your account"
              : "Create a new account"}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setMode("sign-in");
              setError(null);
              setMessage(null);
            }}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors font-[family-name:var(--font-ibm-plex-sans)] cursor-pointer ${
              mode === "sign-in"
                ? "bg-[#3D6B66] text-white"
                : "text-[#6B5A48] hover:bg-gray-50"
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
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors font-[family-name:var(--font-ibm-plex-sans)] cursor-pointer ${
              mode === "sign-up"
                ? "bg-[#3D6B66] text-white"
                : "text-[#6B5A48] hover:bg-gray-50"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm font-[family-name:var(--font-ibm-plex-sans)]">
              {error}
            </div>
          )}

          {/* Success message */}
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm font-[family-name:var(--font-ibm-plex-sans)]">
              {message}
            </div>
          )}

          {/* Email field */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#2C2416] mb-1 font-[family-name:var(--font-ibm-plex-sans)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3D6B66] focus:border-transparent font-[family-name:var(--font-ibm-plex-sans)]"
              placeholder="you@example.com"
            />
          </div>

          {/* Password field */}
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#2C2416] mb-1 font-[family-name:var(--font-ibm-plex-sans)]"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3D6B66] focus:border-transparent font-[family-name:var(--font-ibm-plex-sans)]"
              placeholder="••••••••"
            />
            {mode === "sign-up" && (
              <p className="mt-1 text-xs text-[#6B5A48] font-[family-name:var(--font-ibm-plex-sans)]">
                Must be at least 6 characters
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-[#3D6B66] text-white rounded-md font-medium hover:bg-[#2F5450] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3D6B66] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-[family-name:var(--font-ibm-plex-sans)] cursor-pointer"
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
