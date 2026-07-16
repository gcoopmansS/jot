"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project, Meeting, NoteTopic } from "@/lib/types";

/**
 * Sidebar component for the Jot app.
 *
 * Shows navigation links for:
 * - Unsorted notes (inbox)
 * - All notes (Everything view)
 * - Projects list (collapsible)
 * - Sign out
 *
 * Matches the prototype design: clean, minimal, no emojis, with count badges.
 */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(
    null,
  );
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null,
  );

  // Fetch projects from API
  const { data: projects = [], isLoading: projectsLoading } = useQuery<
    Project[]
  >({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  // Fetch all meetings for all projects
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery<
    Meeting[]
  >({
    queryKey: ["meetings"],
    queryFn: async () => {
      const response = await fetch("/api/meetings");
      if (!response.ok) throw new Error("Failed to fetch meetings");
      return response.json();
    },
  });

  // Fetch all topics for all projects
  const { data: topics = [], isLoading: topicsLoading } = useQuery<NoteTopic[]>(
    {
      queryKey: ["topics"],
      queryFn: async () => {
        const response = await fetch("/api/topics");
        if (!response.ok) throw new Error("Failed to fetch topics");
        return response.json();
      },
    },
  );

  // Fetch note counts
  const { data: noteCounts } = useQuery({
    queryKey: ["note-counts"],
    queryFn: async () => {
      const response = await fetch("/api/notes");
      if (!response.ok) throw new Error("Failed to fetch notes");
      const notes = await response.json();

      // Count unsorted notes
      const unsortedCount = notes.filter((n: any) => n.is_unsorted).length;

      // Count total notes
      const totalCount = notes.length;

      // Count notes by meeting
      const meetingCounts = notes
        .filter((n: any) => n.meeting_id)
        .reduce((acc: Record<string, number>, note: any) => {
          acc[note.meeting_id] = (acc[note.meeting_id] || 0) + 1;
          return acc;
        }, {});

      // Count notes by topic
      const topicCounts = notes
        .filter((n: any) => n.topic_id)
        .reduce((acc: Record<string, number>, note: any) => {
          acc[note.topic_id] = (acc[note.topic_id] || 0) + 1;
          return acc;
        }, {});

      return {
        unsorted: unsortedCount,
        total: totalCount,
        byMeeting: meetingCounts,
        byTopic: topicCounts,
      };
    },
  });

  // Mutation to create a new project
  const createProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to create project");
      return response.json();
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsCreatingProject(false);
      setNewProjectName("");
      // Auto-expand the newly created project
      setExpandedProjects((prev) => new Set(prev).add(newProject.id));
    },
  });

  // Mutation to rename a project
  const renameProjectMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Failed to rename project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setRenamingProjectId(null);
      setRenameValue("");
    },
  });

  // Mutation to delete a project
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["note-counts"] });
      setDeletingProjectId(null);
      setOpenMenuProjectId(null);
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  };

  // Helper to check if a link is active
  const isActive = (path: string) => pathname === path;

  //

  // Start renaming a project
  const startRenaming = (project: Project) => {
    setRenamingProjectId(project.id);
    setRenameValue(project.name);
    setOpenMenuProjectId(null);
  };

  // Handle renaming a project
  const handleRenameProject = (projectId: string) => {
    if (
      renameValue.trim() &&
      renameValue.trim() !== projects.find((p) => p.id === projectId)?.name
    ) {
      renameProjectMutation.mutate({ id: projectId, name: renameValue.trim() });
    } else {
      setRenamingProjectId(null);
      setRenameValue("");
    }
  };

  // Handle key down in rename input
  const handleRenameKeyDown = (e: React.KeyboardEvent, projectId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameProject(projectId);
    } else if (e.key === "Escape") {
      setRenamingProjectId(null);
      setRenameValue("");
    }
  };

  // Confirm delete
  const confirmDelete = (projectId: string) => {
    setDeletingProjectId(projectId);
    setOpenMenuProjectId(null);
  };

  // Handle delete confirmed
  const handleDeleteConfirmed = () => {
    if (deletingProjectId) {
      deleteProjectMutation.mutate(deletingProjectId);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeletingProjectId(null);
  };

  // Toggle project expansion
  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  // Helper to get meetings for a specific project
  const getMeetingsForProject = (projectId: string) => {
    return meetings.filter((m) => m.project_id === projectId);
  };

  // Helper to get topics for a specific project
  const getTopicsForProject = (projectId: string) => {
    return topics.filter((t) => t.project_id === projectId);
  };

  // Handle creating a new project
  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProjectMutation.mutate(newProjectName.trim());
    }
  };

  // Handle key down in project input
  const handleProjectInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateProject();
    } else if (e.key === "Escape") {
      setIsCreatingProject(false);
      setNewProjectName("");
    }
  };

  return (
    <aside className="w-60 bg-[#F8F6F4] border-r border-[#E0DCD7] flex flex-col h-screen relative">
      {/* App title */}
      <div className="px-5 pt-6 pb-5">
        <h1 className="text-xl font-bold text-[#1A1A1A] tracking-tight">
          Jot .
        </h1>
        <p className="text-[10px] text-[#8A8A8A] tracking-widest uppercase mt-0.5">
          Capture first, file later
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {/* Unsorted - amber badge for "needs attention" */}
        <Link
          href="/unsorted"
          className={`flex items-center justify-between px-3 py-1.5 rounded text-sm transition-colors cursor-pointer ${
            isActive("/unsorted")
              ? "bg-[#EAE6E1] text-[#1A1A1A]"
              : "text-[#4A4A4A] hover:bg-[#EAE6E1]"
          }`}
        >
          <span>Unsorted</span>
          <span className="text-xs font-medium bg-[#F4B860] text-white px-2 py-0.5 rounded-full">
            {noteCounts?.unsorted || 0}
          </span>
        </Link>

        {/* Everything view */}
        <Link
          href="/everything"
          className={`flex items-center justify-between px-3 py-1.5 rounded text-sm transition-colors cursor-pointer ${
            isActive("/everything")
              ? "bg-[#EAE6E1] text-[#1A1A1A]"
              : "text-[#4A4A4A] hover:bg-[#EAE6E1]"
          }`}
        >
          <span>Everything</span>
          <span className="text-xs font-medium bg-[#B0B0B0] text-white px-2 py-0.5 rounded-full">
            {noteCounts?.total || 0}
          </span>
        </Link>

        {/* Projects section header */}
        <div className="pt-6 pb-2 px-3">
          <h2 className="text-[10px] uppercase tracking-widest text-[#9A9A9A] font-semibold">
            Projects
          </h2>
        </div>

        {/* Projects list */}
        {projectsLoading ? (
          <div className="px-3 py-1.5 text-sm text-[#9A9A9A]">Loading...</div>
        ) : projects.length === 0 ? (
          isCreatingProject ? (
            <div className="px-3 py-1.5">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={handleProjectInputKeyDown}
                onBlur={() => {
                  if (!newProjectName.trim()) {
                    setIsCreatingProject(false);
                  }
                }}
                className="w-full px-2 py-1 text-sm border border-[#3D6B66] rounded focus:outline-none"
                style={{
                  fontFamily: "var(--font-ibm-plex-sans)",
                  backgroundColor: "var(--paper)",
                  color: "var(--ink)",
                }}
                placeholder="Project name"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingProject(true)}
              className="w-full text-left px-3 py-1.5 text-sm text-[#9A9A9A] hover:text-[#4A4A4A] transition-colors cursor-pointer"
            >
              + New project
            </button>
          )
        ) : (
          <>
            {projects.map((project) => {
              const projectMeetings = getMeetingsForProject(project.id);
              const projectTopics = getTopicsForProject(project.id);
              const isExpanded = expandedProjects.has(project.id);
              const isRenaming = renamingProjectId === project.id;
              const menuOpen = openMenuProjectId === project.id;

              return (
                <div key={project.id}>
                  {isRenaming ? (
                    <div className="px-3 py-1.5">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => handleRenameKeyDown(e, project.id)}
                        onBlur={() => handleRenameProject(project.id)}
                        className="w-full px-2 py-1 text-sm border border-[#3D6B66] rounded focus:outline-none"
                        style={{
                          fontFamily: "var(--font-ibm-plex-sans)",
                          backgroundColor: "var(--paper)",
                          color: "var(--ink)",
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="group relative">
                      <div className="flex items-center justify-between px-3 py-1.5 text-sm text-[#4A4A4A] hover:bg-[#EAE6E1] rounded transition-colors">
                        <button
                          onClick={() => toggleProject(project.id)}
                          className="flex items-center flex-1 text-left cursor-pointer"
                        >
                          <span className="text-xs mr-1.5">
                            {isExpanded ? "▼" : "▶"}
                          </span>
                          {project.name}
                        </button>
                        <div
                          className="relative pb-1"
                          onMouseLeave={() => setOpenMenuProjectId(null)}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuProjectId(
                                menuOpen ? null : project.id,
                              );
                            }}
                            className="opacity-0 group-hover:opacity-100 px-2 py-1 text-[#8A8A8A] hover:text-[#4A4A4A] transition-opacity -mr-2 cursor-pointer"
                            title="Project options"
                          >
                            ⋯
                          </button>
                          {menuOpen && (
                            <div
                              className="absolute right-0 top-full w-32 bg-white rounded shadow-[0_12px_32px_rgba(27,37,33,0.16),0_2px_8px_rgba(27,37,33,0.08)] border border-[#DEDBCF] py-1 z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => startRenaming(project)}
                                className="w-full text-left px-3 py-1.5 text-sm text-[#1A1A1A] hover:bg-[#EAE6E1] transition-colors cursor-pointer"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => confirmDelete(project.id)}
                                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Meetings and Notes sub-sections - shown when expanded */}
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-2">
                      {/* Meetings section */}
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[#B0B0B0] font-semibold px-3 mb-1">
                          Meetings
                        </div>
                        {meetingsLoading ? (
                          <div className="px-3 py-1 text-xs text-[#9A9A9A]">
                            Loading...
                          </div>
                        ) : projectMeetings.length === 0 ? (
                          <div className="px-3 py-1 text-xs text-[#9A9A9A] italic">
                            No meetings yet
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {projectMeetings.map((meeting) => (
                              <Link
                                key={meeting.id}
                                href={`/projects/${project.id}/meetings/${meeting.id}`}
                                className={`flex items-center justify-between px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                                  pathname ===
                                  `/projects/${project.id}/meetings/${meeting.id}`
                                    ? "bg-[#E4ECEA] text-[#1A1A1A]"
                                    : "text-[#4A4A4A] hover:bg-[#EAE6E1]"
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  {meeting.name}
                                  {meeting.recurring && (
                                    <span
                                      className="text-[#3D6B66]"
                                      title="Recurring meeting"
                                    >
                                      ↻
                                    </span>
                                  )}
                                </span>
                                {noteCounts?.byMeeting[meeting.id] && (
                                  <span className="text-[10px] text-[#9A9A9A]">
                                    {noteCounts.byMeeting[meeting.id]}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Notes/Topics section */}
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[#B0B0B0] font-semibold px-3 mb-1">
                          Notes
                        </div>
                        {topicsLoading ? (
                          <div className="px-3 py-1 text-xs text-[#9A9A9A]">
                            Loading...
                          </div>
                        ) : projectTopics.length === 0 ? (
                          <div className="px-3 py-1 text-xs text-[#9A9A9A] italic">
                            No topics yet
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {projectTopics.map((topic) => (
                              <Link
                                key={topic.id}
                                href={`/projects/${project.id}/topics/${topic.id}`}
                                className={`flex items-center justify-between px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                                  pathname ===
                                  `/projects/${project.id}/topics/${topic.id}`
                                    ? "bg-[#EFE7F5] text-[#1A1A1A]"
                                    : "text-[#4A4A4A] hover:bg-[#EAE6E1]"
                                }`}
                              >
                                <span>{topic.name}</span>
                                {noteCounts?.byTopic[topic.id] && (
                                  <span className="text-[10px] text-[#9A9A9A]">
                                    {noteCounts.byTopic[topic.id]}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {isCreatingProject ? (
              <div className="px-3 py-1.5">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={handleProjectInputKeyDown}
                  onBlur={() => {
                    if (!newProjectName.trim()) {
                      setIsCreatingProject(false);
                    }
                  }}
                  className="w-full px-2 py-1 text-sm border border-[#3D6B66] rounded focus:outline-none"
                  style={{
                    fontFamily: "var(--font-ibm-plex-sans)",
                    backgroundColor: "var(--paper)",
                    color: "var(--ink)",
                  }}
                  placeholder="Project name"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingProject(true)}
                className="w-full text-left px-3 py-1.5 text-sm text-[#9A9A9A] hover:text-[#4A4A4A] transition-colors cursor-pointer"
              >
                + New project
              </button>
            )}
          </>
        )}
      </nav>

      {/* Footer with sign out */}
      <div className="px-3 py-3 border-t border-[#E0DCD7]">
        <button
          onClick={handleSignOut}
          className="w-full px-3 py-1.5 text-[#8A8A8A] hover:text-[#4A4A4A] hover:bg-[#EAE6E1] rounded transition-colors text-left text-sm cursor-pointer"
        >
          Sign out
        </button>
      </div>

      {/* Delete confirmation dialog */}
      {deletingProjectId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg shadow-[0_12px_32px_rgba(27,37,33,0.16),0_2px_8px_rgba(27,37,33,0.08)] p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">
              Delete project?
            </h3>
            <p className="text-sm text-[#5B655F] mb-4">
              This will permanently delete the project and all its meetings,
              topics, and notes. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm text-[#5B655F] hover:text-[#1A1A1A] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
