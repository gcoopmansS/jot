import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";

/**
 * DELETE /api/account/delete
 *
 * Permanently deletes the current user's account and ALL data they own:
 * 1. Deletes every project this user owns - CASCADE takes their meetings,
 *    topics, notes, memberships, and invites with them.
 * 2. Any note that STILL belongs to this user at that point must be one
 *    they authored in a project owned by someone else (their own were
 *    just wiped in step 1) - preserve it instead of deleting: snapshot
 *    their email, then null the user_id (a departing member's notes stay
 *    visible to remaining members, per the same data-retention rule that
 *    already applies to leaving/removal, see CLAUDE.md).
 * 3. Removes their membership from any other projects they're still in.
 * 4. Deletes the user from auth.users (requires the service role key).
 *
 * This route MUST only be called from server-side code (API routes).
 * The service role key is NEVER exposed to the browser.
 */
export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;
    const supabaseAdmin = createAdminClient();

    // Step 1: delete every project this user owns. CASCADE wipes their
    // meetings/note_topics/notes/project_members/project_invites too.
    const { error: ownedError } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("user_id", userId);

    if (ownedError) {
      console.error("Error deleting owned projects:", ownedError);
      return NextResponse.json(
        {
          error: "Failed to delete owned projects. Please try again.",
          details: ownedError.message,
        },
        { status: 500 },
      );
    }

    // Step 2: any note still bearing user_id = userId now must be one
    // filed in someone else's project - preserve it rather than deleting.
    const { error: preserveError } = await supabaseAdmin
      .from("notes")
      .update({ user_id: null, author_email_snapshot: userEmail ?? null })
      .eq("user_id", userId);

    if (preserveError) {
      console.error("Error preserving shared notes:", preserveError);
      return NextResponse.json(
        {
          error: "Failed to preserve shared notes. Please try again.",
          details: preserveError.message,
        },
        { status: 500 },
      );
    }

    // Step 3: drop membership in any remaining (other people's) projects.
    const { error: membershipError } = await supabaseAdmin
      .from("project_members")
      .delete()
      .eq("user_id", userId);

    if (membershipError) {
      console.error("Error removing memberships:", membershipError);
      return NextResponse.json(
        {
          error: "Failed to remove project memberships. Please try again.",
          details: membershipError.message,
        },
        { status: 500 },
      );
    }

    // Step 4: delete the auth user itself.
    const { error: userDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (userDeleteError) {
      console.error("Error deleting user:", userDeleteError);
      return NextResponse.json(
        {
          error: "Failed to delete user account. Please try again.",
          details: userDeleteError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account and all data permanently deleted",
    });
  } catch (error) {
    console.error("Unexpected error during account deletion:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
