import { createServerSupabaseClient } from "./supabase";

/**
 * Auth utilities for the Jot app.
 *
 * These helpers make it easy to check if a user is logged in from server components.
 */

/**
 * Gets the currently logged-in user from the server side.
 * Returns null if no user is logged in.
 *
 * Usage in server components:
 * ```
 * import { getUser } from '@/lib/auth'
 * const user = await getUser()
 * if (!user) {
 *   redirect('/auth/sign-in')
 * }
 * ```
 */
export async function getUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Gets the full auth session (includes user + tokens).
 * Returns null if no session exists.
 */
export async function getSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
