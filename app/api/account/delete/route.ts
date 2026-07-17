import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * DELETE /api/account/delete
 *
 * Permanently deletes the current user's account and ALL associated data.
 *
 * This is a complete, hard delete with no recovery possible:
 * 1. Deletes all notes (respects FK constraints to meetings/topics)
 * 2. Deletes all meetings
 * 3. Deletes all topics
 * 4. Deletes all projects
 * 5. Deletes the user account from auth.users (requires service role key)
 *
 * This route MUST only be called from server-side code (API routes).
 * The service role key is NEVER exposed to the browser.
 */
export async function DELETE() {
  try {
    // Get the current authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;

    // Create a Supabase admin client using the service role key
    // This is ONLY safe because this code runs server-side, never in the browser
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Delete all user data in the correct order to respect foreign key constraints
    // We wrap this in a try-catch to ensure we can report specific failures

    // Step 1: Delete all notes for this user
    // Notes reference meetings and topics, so delete notes first
    const { error: notesError } = await supabaseAdmin
      .from("notes")
      .delete()
      .eq("user_id", userId);

    if (notesError) {
      console.error("Error deleting notes:", notesError);
      return NextResponse.json(
        {
          error: "Failed to delete notes. Please try again.",
          details: notesError.message,
        },
        { status: 500 },
      );
    }

    // Step 2: Delete all meetings for this user's projects
    // First, get all project IDs for this user
    const { data: projects, error: projectsFetchError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("user_id", userId);

    if (projectsFetchError) {
      console.error("Error fetching projects:", projectsFetchError);
      return NextResponse.json(
        {
          error: "Failed to fetch projects. Please try again.",
          details: projectsFetchError.message,
        },
        { status: 500 },
      );
    }

    if (projects && projects.length > 0) {
      const projectIds = projects.map((p) => p.id);

      // Delete all meetings for these projects
      const { error: meetingsError } = await supabaseAdmin
        .from("meetings")
        .delete()
        .in("project_id", projectIds);

      if (meetingsError) {
        console.error("Error deleting meetings:", meetingsError);
        return NextResponse.json(
          {
            error: "Failed to delete meetings. Please try again.",
            details: meetingsError.message,
          },
          { status: 500 },
        );
      }

      // Step 3: Delete all topics for these projects
      const { error: topicsError } = await supabaseAdmin
        .from("note_topics")
        .delete()
        .in("project_id", projectIds);

      if (topicsError) {
        console.error("Error deleting topics:", topicsError);
        return NextResponse.json(
          {
            error: "Failed to delete topics. Please try again.",
            details: topicsError.message,
          },
          { status: 500 },
        );
      }
    }

    // Step 4: Delete all projects for this user
    const { error: projectsError } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("user_id", userId);

    if (projectsError) {
      console.error("Error deleting projects:", projectsError);
      return NextResponse.json(
        {
          error: "Failed to delete projects. Please try again.",
          details: projectsError.message,
        },
        { status: 500 },
      );
    }

    // Step 5: Delete the user account from auth.users
    // This requires the admin client with service role key
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

    // Success - all data has been permanently deleted
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
