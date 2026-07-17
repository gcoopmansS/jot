import { createServerSupabaseClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * Auth callback route for handling email confirmations and other auth flows.
 *
 * When a user clicks a confirmation link in their email (e.g., after changing
 * their email address), Supabase sends them here with auth tokens in the URL.
 * This route exchanges those tokens for a session and redirects the user.
 *
 * Query params expected:
 * - code: The auth code from Supabase
 * - next: Optional redirect path (defaults based on the auth type)
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/everything";

  if (code) {
    const supabase = await createServerSupabaseClient();

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successfully confirmed - redirect to the intended destination
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If there was an error or no code, redirect to sign-in
  return NextResponse.redirect(new URL("/auth/sign-in", requestUrl.origin));
}
