import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { CreateNoteInput } from "@/lib/types";

/**
 * POST /api/notes
 *
 * Creates a new note in Supabase.
 *
 * Request body:
 * {
 *   text: string,
 *   type: 'meeting' | 'general',
 *   meeting_id?: string,
 *   topic_id?: string,
 *   is_unsorted?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const body: CreateNoteInput = await request.json();

    // Validate required fields
    if (!body.text || !body.type) {
      return NextResponse.json(
        { error: "Missing required fields: text and type" },
        { status: 400 },
      );
    }

    // Validate type
    if (body.type !== "meeting" && body.type !== "general") {
      return NextResponse.json(
        { error: "type must be 'meeting' or 'general'" },
        { status: 400 },
      );
    }

    // Insert the note into Supabase
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        text: body.text,
        type: body.type,
        meeting_id: body.meeting_id || null,
        topic_id: body.topic_id || null,
        is_unsorted: body.is_unsorted !== false, // Default to true if not specified
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      return NextResponse.json(
        { error: "Failed to create note", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/notes
 *
 * Retrieves all notes for the current user.
 * Optional query params: ?type=meeting|general, ?is_unsorted=true|false
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Apply filters from query params
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const isUnsorted = searchParams.get("is_unsorted");

    if (type) {
      query = query.eq("type", type);
    }
    if (isUnsorted !== null) {
      query = query.eq("is_unsorted", isUnsorted === "true");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching notes:", error);
      return NextResponse.json(
        { error: "Failed to fetch notes", details: error.message },
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
