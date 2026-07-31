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

    // Fetch the note - RLS returns it if this is the user's own unsorted
    // note, or any note in a project they're a member of
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
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

    // Editing a note (text or categorization) is restricted to its
    // original author, even for a shared project - that's why this route
    // keeps an explicit user_id filter below while GET/DELETE don't.
    // Build update object with only provided fields
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.text !== undefined) {
      updates.text = body.text;
    }

    if (body.title !== undefined) {
      updates.title = body.title;
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
 * Deletes a note by ID, and automatically cleans up empty containers:
 * - If this was the last note in a Notes topic → delete the topic
 * - If this was the last note in a non-recurring Meeting → delete the meeting
 * - If this was the last note in a recurring Meeting → keep it (deliberate setup)
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

    // First, fetch the note to capture its meeting_id/topic_id before
    // deletion. Deleting a note is symmetric - any project member can
    // delete any note, not just its author - so RLS (not a user_id filter)
    // is what determines whether this note is reachable at all.
    const { data: noteToDelete, error: fetchError } = await supabase
      .from("notes")
      .select("meeting_id, topic_id, type")
      .eq("id", id)
      .single();

    if (fetchError || !noteToDelete) {
      console.error("Error fetching note before deletion:", fetchError);
      return NextResponse.json(
        { error: "Note not found", details: fetchError?.message },
        { status: 404 },
      );
    }

    const { meeting_id, topic_id, type } = noteToDelete;

    // Delete the note
    const { error: deleteError } = await supabase
      .from("notes")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting note:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete note", details: deleteError.message },
        { status: 500 },
      );
    }

    // Now check if we need to clean up empty containers
    let deletedMeetingId: string | null = null;
    let deletedTopicId: string | null = null;

    // If the note was in a meeting, check if the meeting is now empty
    if (meeting_id) {
      const { count: remainingNotesCount } = await supabase
        .from("notes")
        .select("*", { count: "exact", head: true })
        .eq("meeting_id", meeting_id);

      if (remainingNotesCount === 0) {
        // Meeting is now empty - check if it's recurring
        const { data: meeting } = await supabase
          .from("meetings")
          .select("recurring")
          .eq("id", meeting_id)
          .single();

        // Only delete if it's NOT recurring
        if (meeting && !meeting.recurring) {
          const { error: deleteMeetingError } = await supabase
            .from("meetings")
            .delete()
            .eq("id", meeting_id);

          if (!deleteMeetingError) {
            deletedMeetingId = meeting_id;
            console.log(
              `Auto-deleted empty non-recurring meeting: ${meeting_id}`,
            );
          } else {
            console.error("Error deleting empty meeting:", deleteMeetingError);
          }
        } else if (meeting && meeting.recurring) {
          console.log(
            `Keeping empty recurring meeting (deliberate setup): ${meeting_id}`,
          );
        }
      }
    }

    // If the note was in a topic, check if the topic is now empty
    if (topic_id) {
      const { count: remainingNotesCount } = await supabase
        .from("notes")
        .select("*", { count: "exact", head: true })
        .eq("topic_id", topic_id);

      if (remainingNotesCount === 0) {
        // Topic is now empty - always delete (topics have no "recurring" concept)
        const { error: deleteTopicError } = await supabase
          .from("note_topics")
          .delete()
          .eq("id", topic_id);

        if (!deleteTopicError) {
          deletedTopicId = topic_id;
          console.log(`Auto-deleted empty topic: ${topic_id}`);
        } else {
          console.error("Error deleting empty topic:", deleteTopicError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      cleanup: {
        deletedMeetingId,
        deletedTopicId,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
