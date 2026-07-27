"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { createClient } from "./supabase";
import { clearAllDrafts } from "./draft-storage";

/**
 * Provider component for TanStack Query (React Query).
 *
 * This wraps the app and provides data-fetching/caching capabilities.
 * TanStack Query handles loading states, error handling, and caching for us,
 * so we don't have to manually track those in every component.
 *
 * CRITICAL SECURITY UPDATE: Now includes an auth state listener that clears
 * ALL cached data when the user signs out or changes accounts. This prevents
 * Account A's data from appearing in Account B's session.
 *
 * We create the QueryClient inside a useState so each user session gets
 * its own client (important for server-side rendering).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create a new QueryClient for this component instance
  // This ensures each user gets their own cache
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Don't refetch data automatically on window focus
            // (can be annoying during development)
            refetchOnWindowFocus: false,
            // Keep data fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
          },
        },
      }),
  );

  // CRITICAL SECURITY: Listen for auth state changes and clear everything
  // when the user signs out or switches accounts
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // On sign-out or when the user changes (different user ID)
      if (event === "SIGNED_OUT") {
        console.log(
          "[Security] User signed out - clearing all cached data and drafts",
        );
        // Clear ALL query cache to prevent data leakage
        queryClient.clear();
        // Clear ALL drafts from localStorage
        clearAllDrafts();
      } else if (event === "SIGNED_IN" && session?.user) {
        // Also clear cache on sign-in to ensure fresh data
        console.log(
          "[Security] User signed in - clearing cache to ensure fresh data",
        );
        queryClient.clear();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
