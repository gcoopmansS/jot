import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Meeting, Note, NoteTopic, Project } from "@/lib/types";

/**
 * GET /api/account/export
 *
 * Downloads everything belonging to the current user as a single JSON
 * file - a trust safety-net independent of Jot's own reliability, and
 * GDPR data-portability. Distinct from the per-note export/share feature
 * (that's for sharing one note; this is a bulk personal backup).
 *
 * Scope, now that shared Projects exist: everything in Projects you OWN
 * (full contents, any author - it's your project), plus every note you
 * personally authored anywhere, including ones filed in someone else's
 * shared Project, plus your own Unsorted notes. This deliberately does
 * NOT include other members' notes from a Project you only belong to,
 * since those aren't "your data."
 *
 * Uses the regular session-scoped client (not the service-role admin
 * client) - RLS already correctly scopes everything queried here to what
 * this user owns or authored.
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

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id);

    if (projectsError) {
      console.error("Error exporting projects:", projectsError);
      return NextResponse.json(
        { error: "Failed to export data", details: projectsError.message },
        { status: 500 },
      );
    }

    const ownedProjects: Project[] = projects ?? [];
    const ownedProjectIds = ownedProjects.map((p) => p.id);

    let meetings: Meeting[] = [];
    let topics: NoteTopic[] = [];

    if (ownedProjectIds.length > 0) {
      const [meetingsResult, topicsResult] = await Promise.all([
        supabase.from("meetings").select("*").in("project_id", ownedProjectIds),
        supabase.from("note_topics").select("*").in("project_id", ownedProjectIds),
      ]);

      if (meetingsResult.error || topicsResult.error) {
        console.error(
          "Error exporting meetings/topics:",
          meetingsResult.error || topicsResult.error,
        );
        return NextResponse.json(
          { error: "Failed to export data" },
          { status: 500 },
        );
      }

      meetings = meetingsResult.data ?? [];
      topics = topicsResult.data ?? [];
    }

    const meetingIds = meetings.map((m) => m.id);
    const topicIds = topics.map((t) => t.id);

    // Three queries merged by id - simpler and less fragile than hand-building
    // a single combined OR filter: (1) everything I authored anywhere, (2)
    // any note (any author) in a meeting of mine, (3) any note (any author)
    // in a topic of mine. Overlaps are expected and deduped below.
    const noteQueries = [
      supabase.from("notes").select("*").eq("user_id", user.id),
    ];
    if (meetingIds.length > 0) {
      noteQueries.push(
        supabase.from("notes").select("*").in("meeting_id", meetingIds),
      );
    }
    if (topicIds.length > 0) {
      noteQueries.push(
        supabase.from("notes").select("*").in("topic_id", topicIds),
      );
    }

    const noteResults = await Promise.all(noteQueries);
    const noteError = noteResults.find((r) => r.error)?.error;
    if (noteError) {
      console.error("Error exporting notes:", noteError);
      return NextResponse.json(
        { error: "Failed to export data", details: noteError.message },
        { status: 500 },
      );
    }

    const notesById = new Map<string, Note>();
    for (const result of noteResults) {
      for (const note of result.data ?? []) {
        notesById.set(note.id, note);
      }
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      account_email: user.email,
      projects: ownedProjects,
      meetings,
      note_topics: topics,
      notes: Array.from(notesById.values()),
    };

    const dateStamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="jot-export-${dateStamp}.json"`,
      },
    });
  } catch (error) {
    console.error("Unexpected error during data export:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
