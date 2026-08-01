"use client";

import { createClient } from "@/lib/supabase";
import { clearAllDrafts } from "@/lib/draft-storage";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Client-side actions for the invite-accept page (app/invite/[token]/page.tsx).
 * Split out from the server component since these need interactivity
 * (button clicks, loading state, navigation).
 */

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "Failed to accept invite");
      }

      // Without this, a tab that already had /everything open earlier
      // wouldn't show the new project until the 5-minute query cache
      // naturally expires (lib/query-provider.tsx).
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push("/everything");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[var(--radius)] text-red-800 text-sm"
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleAccept}
        disabled={loading}
        style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        className="w-full py-3 px-4 bg-[var(--ink)] text-[var(--paper)] rounded-[var(--radius)] font-medium hover:bg-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        {loading ? "Joining..." : "Accept invite"}
      </button>
    </div>
  );
}

export function SwitchAccountButton({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleSwitch = async () => {
    setLoading(true);
    // Same cache/draft clearing as the regular sign-out path (Section 5.1 -
    // never let a previous account's data survive a session change).
    queryClient.clear();
    clearAllDrafts();
    await supabase.auth.signOut();
    router.push(
      `/auth/sign-in?redirect=${encodeURIComponent(redirectTo)}`,
    );
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSwitch}
      disabled={loading}
      style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
      className="w-full py-3 px-4 bg-[var(--ink)] text-[var(--paper)] rounded-[var(--radius)] font-medium hover:bg-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
    >
      {loading ? "Signing out..." : "Sign in as a different account"}
    </button>
  );
}
