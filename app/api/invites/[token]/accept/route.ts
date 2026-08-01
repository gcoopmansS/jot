import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

/**
 * POST /api/invites/[token]/accept
 *
 * Accepts a pending Project invite for the current user. Thin wrapper
 * around the accept_project_invite RPC (a security-definer function that
 * validates the invite belongs to this user's own authenticated email
 * before creating the project_members row) - kept as an API route rather
 * than calling supabase.rpc() directly from the client, matching this
 * app's convention that every mutation goes through /api/*.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("accept_project_invite", {
      p_token: token,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error accepting invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
