import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

/**
 * GET /api/notes/[id]
 *
 * Fetches a single note by ID.
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

    // Fetch the note
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching note:", error);
      return NextResponse.json(
        { error: "Note not found", details: error.message },
        { status: 404 },
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
 * PATCH /api/notes/[id]
 *
 * Updates a note's text, categorization, or both.
 *
 * Request body (all fields optional, at least one required):
 * {
 *   text?: string
 *   type?: 'meeting' | 'general'
 *   meeting_id?: string | null
 *   topic_id?: string | null
 *   is_unsorted?: boolean
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

    // Build update object with only provided fields
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.text !== undefined) {
      updates.text = body.text;
    }

    if (body.type !== undefined) {
      // Validate type if provided
      if (body.type !== "meeting" && body.type !== "general") {
        return NextResponse.json(
          { error: "type must be 'meeting' or 'general'" },
          { status: 400 },
        );
      }
      updates.type = body.type;
    }

    if (body.meeting_id !== undefined) {
      updates.meeting_id = body.meeting_id;
    }

    if (body.topic_id !== undefined) {
      updates.topic_id = body.topic_id;
    }

    if (body.is_unsorted !== undefined) {
      updates.is_unsorted = body.is_unsorted;
    }

    // If categorization fields are being updated but is_unsorted is not explicitly set,
    // infer the correct value based on whether proper categorization is provided
    if (
      body.is_unsorted === undefined &&
      (body.meeting_id !== undefined ||
        body.topic_id !== undefined ||
        body.type !== undefined)
    ) {
      // Fetch current note to get full context
      const { data: currentNote } = await supabase
        .from("notes")
        .select("type, meeting_id, topic_id")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (currentNote) {
        const finalType = updates.type ?? currentNote.type;
        const finalMeetingId =
          updates.meeting_id !== undefined
            ? updates.meeting_id
            : currentNote.meeting_id;
        const finalTopicId =
          updates.topic_id !== undefined
            ? updates.topic_id
            : currentNote.topic_id;

        const hasCategorization =
          (finalType === "meeting" && finalMeetingId) ||
          (finalType === "general" && finalTopicId);

        updates.is_unsorted = !hasCategorization;
      }
    }

    // Update the note
    const { data, error } = await supabase
      .from("notes")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating note:", error);
      return NextResponse.json(
        { error: "Failed to update note", details: error.message },
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
 * DELETE /api/notes/[id]
 *
 * Deletes a note by ID.
 */
export async function DELETE(
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

    // Delete the note
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting note:", error);
      return NextResponse.json(
        { error: "Failed to delete note", details: error.message },
        { status: 500 },
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
