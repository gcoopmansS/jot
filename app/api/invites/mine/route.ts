import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

/**
 * GET /api/invites/mine
 *
 * Lists pending invites addressed to the current user's own email - lets
 * someone who already has a Jot account discover and accept an invite just
 * by using the app normally, without needing the link at all. Safe via the
 * existing "invitee can see their own pending invite" RLS policy (matches
 * on the caller's own live, authenticated email).
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // invited_email is always stored lowercased (see POST /invites), so a
    // plain lowercase eq is correct here - avoids ilike's "_" wildcard
    // matching unintended rows for an email that happens to contain one.
    const { data: invites, error: invitesError } = await supabase
      .from("project_invites")
      .select("*")
      .eq("status", "pending")
      .eq("invited_email", user.email.toLowerCase());

    if (invitesError) {
      console.error("Error fetching my invites:", invitesError);
      return NextResponse.json(
        { error: "Failed to fetch invites", details: invitesError.message },
        { status: 500 },
      );
    }

    const projectIds = [...new Set((invites ?? []).map((i) => i.project_id))];

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds.length > 0 ? projectIds : [""]);

    if (projectsError) {
      console.error("Error fetching project names for invites:", projectsError);
      return NextResponse.json(
        { error: "Failed to fetch invites", details: projectsError.message },
        { status: 500 },
      );
    }

    const nameByProjectId = new Map((projects ?? []).map((p) => [p.id, p.name]));

    const result = (invites ?? []).map((invite) => ({
      id: invite.id,
      project_id: invite.project_id,
      project_name: nameByProjectId.get(invite.project_id) ?? "a project",
      token: invite.token,
      created_at: invite.created_at,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
