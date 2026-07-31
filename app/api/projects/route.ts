import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

/**
 * GET /api/projects
 *
 * Retrieves all projects the current user is a member of (this includes
 * projects they own - ownership implies membership - and any shared
 * projects they've been added to). RLS does the actual filtering; no
 * explicit user_id filter here since a project has no single owner column
 * that captures "who can see this" anymore.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching projects:", error);
      return NextResponse.json(
        { error: "Failed to fetch projects", details: error.message },
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
 * POST /api/projects
 *
 * Creates a new project.
 *
 * Request body:
 * {
 *   name: string
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

    if (!body.name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: body.name,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return NextResponse.json(
        { error: "Failed to create project", details: error.message },
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
