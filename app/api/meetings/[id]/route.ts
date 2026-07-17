import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

/**
 * PATCH /api/meetings/[id]
 *
 * Updates a meeting's details (name, recurring status, cadence, attendees).
 *
 * Request body can include:
 * {
 *   name?: string,
 *   recurring?: boolean,
 *   cadence?: string | null,
 *   attendees?: string | null
 * }
 */
export async function PATCH(
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

    // First, get the meeting to check it exists and get its project_id
    const { data: meeting } = await supabase
      .from("meetings")
      .select("id, project_id")
      .eq("id", id)
      .single();

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Verify the project belongs to the user
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", meeting.project_id)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build the update object only with provided fields
    const updateData: Record<string, any> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.recurring !== undefined) updateData.recurring = body.recurring;
    if (body.cadence !== undefined) updateData.cadence = body.cadence;
    if (body.attendees !== undefined) updateData.attendees = body.attendees;

    console.log("Attempting to update meeting:", id, "with data:", updateData);

    // Update the meeting
    const {
      data: updateResult,
      error: updateError,
      count,
    } = await supabase
      .from("meetings")
      .update(updateData)
      .eq("id", id)
      .select();

    console.log("Update result:", { updateResult, updateError, count });

    if (updateError) {
      console.error("Error updating meeting:", updateError);
      return NextResponse.json(
        { error: "Failed to update meeting", details: updateError.message },
        { status: 500 },
      );
    }

    // Check if any rows were updated (could be blocked by RLS)
    if (!updateResult || updateResult.length === 0) {
      console.error(
        "Update returned no rows - likely RLS policy blocking update",
      );
      return NextResponse.json(
        { error: "Update blocked - check RLS policies on meetings table" },
        { status: 403 },
      );
    }

    return NextResponse.json(updateResult[0]);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
