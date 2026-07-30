import { createBrowserClient } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client utilities for the Jot app.
 *
 * We need different Supabase clients for different contexts:
 * - Browser client: for use in client components (React components that run in the browser)
 * - Server client: for use in server components and API routes (runs on the server)
 *
 * This separation is necessary because auth state is stored in cookies, and Next.js
 * handles cookies differently on the server vs client.
 */

// Get the Supabase URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates a Supabase client for use in client components (browser).
 * This automatically handles reading/writing auth cookies in the browser.
 *
 * Memoized to a single instance per browser tab. createClient() is called
 * from many components/hooks (e.g. useCurrentUser, on every render) - without
 * this, each call spun up its own independent GoTrueClient, and each one's
 * session re-validation could broadcast its own "SIGNED_IN" event. Since
 * QueryProvider's auth listener clears the entire query cache on every
 * SIGNED_IN event (by design, to prevent stale data leaking across accounts),
 * that turned into a storm of cache-clears - most visible after the tab
 * regains focus/wakes from sleep, where it can wedge every page in a
 * permanent "Loading..." state as data never gets a chance to settle before
 * being wiped again.
 *
 * Usage in client components:
 * ```
 * 'use client'
 * import { createClient } from '@/lib/supabase'
 * const supabase = createClient()
 * const { data } = await supabase.from('notes').select('*')
 * ```
 */
let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}

/**
 * Creates a Supabase client for use in server components and API routes.
 * This handles reading/writing auth cookies on the server side.
 *
 * Usage in server components:
 * ```
 * import { createServerSupabaseClient } from '@/lib/supabase'
 * const supabase = await createServerSupabaseClient()
 * const { data } = await supabase.from('notes').select('*')
 * ```
 */
export async function createServerSupabaseClient() {
  // Import cookies here so it's only loaded on the server, not in client bundles
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
