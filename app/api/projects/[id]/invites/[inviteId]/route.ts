import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

/**
 * DELETE /api/projects/[id]/invites/[inviteId]
 *
 * Revokes a pending invite. Owner-only (backed by the "owner manages
 * invites" RLS policy).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, inviteId } = await params;

    const { error, count } = await supabase
      .from("project_invites")
      .delete({ count: "exact" })
      .eq("id", inviteId)
      .eq("project_id", id);

    if (error) {
      console.error("Error revoking invite:", error);
      return NextResponse.json(
        { error: "Failed to revoke invite", details: error.message },
        { status: 500 },
      );
    }

    if (!count) {
      return NextResponse.json(
        { error: "Not authorized to revoke this invite" },
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
