import { createServerSupabaseClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * API route for signing out.
 *
 * This handles the server-side sign-out process and clears the auth cookies.
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
