import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { ProjectMemberWithEmail } from "@/lib/types";

/**
 * GET /api/projects/[id]/members
 *
 * Lists every member of a Project, enriched with their email. Two flat
 * queries merged in code rather than a PostgREST embedded join - the join
 * path between project_members and profiles isn't declared via a foreign
 * key, so relying on embedded-select syntax there would be ambiguous.
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

    // RLS (is_project_member) already limits this to projects the caller
    // actually belongs to.
    const { data: members, error: membersError } = await supabase
      .from("project_members")
      .select("user_id, joined_at")
      .eq("project_id", id)
      .order("joined_at");

    if (membersError) {
      console.error("Error fetching project members:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch members", details: membersError.message },
        { status: 500 },
      );
    }

    const userIds = (members ?? []).map((m) => m.user_id);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds.length > 0 ? userIds : [""]);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch member details", details: profilesError.message },
        { status: 500 },
      );
    }

    const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

    const result: ProjectMemberWithEmail[] = (members ?? []).map((m) => ({
      user_id: m.user_id,
      joined_at: m.joined_at,
      email: emailById.get(m.user_id) ?? "unknown",
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
