import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client using the service role key, which bypasses RLS
 * entirely. This must ONLY ever be called from server-side code (API
 * routes, server components) - never imported into any client-side file.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
