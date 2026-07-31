import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { NoteWithLocation } from "@/lib/types";

/**
 * GET /api/search?q=query
 *
 * Global search across all of the user's content:
 * - Note titles and text content
 * - Meeting names
 * - Topic names
 * - Project names
 *
 * Simple approach: fetch all user's notes with joins, then filter in JavaScript.
 * This is more reliable than complex nested Supabase filters and acceptable for
 * single-user scale (hundreds/thousands of notes at most).
 *
 * Returns notes with enriched location data (project name, meeting/topic name).
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

    // Get the search query from URL params
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    // If no query, return empty results (don't search for everything)
    if (!query || query.trim() === "") {
      return NextResponse.json({ results: [] });
    }

    // Build the ILIKE pattern for partial matching
    const searchPattern = `%${query.trim()}%`;

    // Query every note visible to this user (their own unsorted notes, plus
    // any note in a project they're a member of - RLS does the filtering)
    // with LEFT JOINs to get project, meeting, and topic names. We'll
    // filter in JavaScript since Supabase's nested OR filters are complex.
    const { data: notes, error } = await supabase
      .from("notes")
      .select(
        `
        *,
        meetings!left (
          id,
          name,
          projects!inner (
            id,
            name
          )
        ),
        note_topics!left (
          id,
          name,
          projects!inner (
            id,
            name
          )
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json(
        { error: "Failed to search notes" },
        { status: 500 },
      );
    }

    // Filter and transform results in JavaScript for simpler, more reliable matching
    const queryLower = query.toLowerCase();
    const results: NoteWithLocation[] = (notes || [])
      .filter((note: any) => {
        // Match against note title and text
        const titleMatch = note.title?.toLowerCase().includes(queryLower);
        const textMatch = note.text?.toLowerCase().includes(queryLower);

        // Match against meeting/topic name and project name
        let locationMatch = false;
        let projectMatch = false;

        if (note.type === "meeting" && note.meetings) {
          locationMatch = note.meetings.name
            ?.toLowerCase()
            .includes(queryLower);
          projectMatch = note.meetings.projects?.name
            ?.toLowerCase()
            .includes(queryLower);
        } else if (note.type === "general" && note.note_topics) {
          locationMatch = note.note_topics.name
            ?.toLowerCase()
            .includes(queryLower);
          projectMatch = note.note_topics.projects?.name
            ?.toLowerCase()
            .includes(queryLower);
        }

        // Return true if any field matches
        return titleMatch || textMatch || locationMatch || projectMatch;
      })
      .slice(0, 50) // Limit to 50 most recent matching results
      .map((note: any) => {
        // Extract project and location names from the joined data
        let projectName = "";
        let locationName = "";

        if (note.type === "meeting" && note.meetings) {
          locationName = note.meetings.name;
          projectName = note.meetings.projects?.name || "";
        } else if (note.type === "general" && note.note_topics) {
          locationName = note.note_topics.name;
          projectName = note.note_topics.projects?.name || "";
        }

        // Return the note with enriched location data
        return {
          id: note.id,
          user_id: note.user_id,
          text: note.text,
          title: note.title,
          type: note.type,
          meeting_id: note.meeting_id,
          topic_id: note.topic_id,
          is_unsorted: note.is_unsorted,
          created_at: note.created_at,
          updated_at: note.updated_at,
          project_name: projectName || undefined,
          location_name: locationName || undefined,
        };
      });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Unexpected search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
