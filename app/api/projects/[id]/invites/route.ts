import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";

/**
 * GET /api/projects/[id]/invites
 *
 * Lists pending invites for a Project. Owner-only (backed by the
 * "owner manages invites" RLS policy - a non-owner's query just comes
 * back empty, not an error).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from("project_invites")
      .select("*")
      .eq("project_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invites:", error);
      return NextResponse.json(
        { error: "Failed to fetch invites", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/projects/[id]/invites
 *
 * Creates a new invite for a Project. Owner-only - checked explicitly here
 * (for a friendlier error) in addition to the RLS "owner manages invites"
 * policy that's the real enforcement.
 *
 * Request body: { email: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.email || typeof body.email !== "string") {
      return NextResponse.json(
        { error: "Missing required field: email" },
        { status: 400 },
      );
    }

    const { data: project } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!project || project.user_id !== user.id) {
      return NextResponse.json(
        { error: "Only the project owner can invite members" },
        { status: 403 },
      );
    }

    const email = body.email.trim().toLowerCase();

    // Does this email already have a Jot account? A plain session-client
    // lookup can't answer this via RLS (the owner isn't a co-member of the
    // invitee yet, by definition, before they've joined) - the admin client
    // is the narrow, deliberate exception here, checking existence only,
    // nothing else about the account.
    const admin = createAdminClient();
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    const accountExists = !!existingProfile;

    // Reuse an existing pending invite for the same email instead of
    // stacking duplicates.
    const { data: existing } = await supabase
      .from("project_invites")
      .select("*")
      .eq("project_id", id)
      .eq("invited_email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { ...existing, account_exists: accountExists },
        { status: 200 },
      );
    }

    const { data, error } = await supabase
      .from("project_invites")
      .insert({
        project_id: id,
        invited_email: email,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating invite:", error);
      return NextResponse.json(
        { error: "Failed to create invite", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ...data, account_exists: accountExists },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
