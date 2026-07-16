import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

/**
 * GET /api/meetings
 *
 * Retrieves all meetings for the current user.
 * Optional query param: ?project_id=<uuid> to filter by project
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

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("project_id");

    // We need to join with projects to ensure the user owns the meetings
    let query = supabase
      .from("meetings")
      .select("*, projects!inner(user_id)")
      .eq("projects.user_id", user.id)
      .order("name");

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching meetings:", error);
      return NextResponse.json(
        { error: "Failed to fetch meetings", details: error.message },
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
 * POST /api/meetings
 *
 * Creates a new meeting.
 *
 * Request body:
 * {
 *   name: string,
 *   project_id: string,
 *   recurring?: boolean,
 *   cadence?: string,
 *   attendees?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name || !body.project_id) {
      return NextResponse.json(
        { error: "Missing required fields: name and project_id" },
        { status: 400 },
      );
    }

    // Verify the project belongs to the user
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", body.project_id)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("meetings")
      .insert({
        project_id: body.project_id,
        name: body.name,
        recurring: body.recurring || false,
        cadence: body.cadence || null,
        attendees: body.attendees || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating meeting:", error);
      return NextResponse.json(
        { error: "Failed to create meeting", details: error.message },
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
