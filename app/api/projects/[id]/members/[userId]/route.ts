import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

/**
 * DELETE /api/projects/[id]/members/[userId]
 *
 * Removes a member from a Project. Covers both cases with one endpoint,
 * since Phase 1's RLS policy on project_members is already
 * `is_project_owner(project_id) OR user_id = auth.uid()`:
 * - The owner removing someone else (management action).
 * - A member removing themselves (leaving the Project).
 *
 * The owner can't remove/leave themselves this way - ownership isn't
 * transferable in this design, only project deletion ends an owner's
 * involvement.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId } = await params;

    const { data: project } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", id)
      .single();

    if (project && userId === project.user_id) {
      return NextResponse.json(
        { error: "The project owner can't be removed - delete the project instead." },
        { status: 400 },
      );
    }

    const { error, count } = await supabase
      .from("project_members")
      .delete({ count: "exact" })
      .eq("project_id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing project member:", error);
      return NextResponse.json(
        { error: "Failed to remove member", details: error.message },
        { status: 500 },
      );
    }

    // RLS silently filters unauthorized rows rather than erroring - 0 rows
    // affected means the caller wasn't allowed to remove this person.
    if (!count) {
      return NextResponse.json(
        { error: "Not authorized to remove this member" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
