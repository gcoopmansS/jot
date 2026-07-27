"use client";

import { createClient } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

/**
 * Hook to get the current authenticated user.
 *
 * CRITICAL FOR SECURITY: This is used to scope all query keys by user ID,
 * preventing data leakage between accounts when switching users in the same browser.
 *
 * Usage:
 * ```
 * const { data: user } = useCurrentUser();
 * const { data: projects } = useQuery({
 *   queryKey: ["projects", user?.id],  // Always include user ID in query keys!
 *   ...
 * });
 * ```
 */
export function useCurrentUser() {
  const supabase = createClient();

  return useQuery<User | null>({
    // This query key is intentionally NOT user-scoped since it's fetching the user
    queryKey: ["current-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
    // Keep this data fresh since auth state is critical
    staleTime: 0,
  });
}
