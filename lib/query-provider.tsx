"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Provider component for TanStack Query (React Query).
 *
 * This wraps the app and provides data-fetching/caching capabilities.
 * TanStack Query handles loading states, error handling, and caching for us,
 * so we don't have to manually track those in every component.
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

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
