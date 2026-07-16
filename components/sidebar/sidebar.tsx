"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Collapsible from "@radix-ui/react-collapsible";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Inbox,
  Grid3x3,
  Plus,
  Repeat,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Project, Meeting, NoteTopic } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

/**
 * Sidebar component for the Jot app.
 *
 * Shows navigation links for:
 * - Unsorted notes (inbox)
 * - All notes (Everything view)
 * - Projects list (collapsible)
 * - Sign out
 *
 * Following the design language: Space Grotesk for headers, IBM Plex Sans for links,
 * IBM Plex Mono for counts, proper CSS variables, lucide icons.
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
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  };

  // Helper to check if a link is active
  const isActive = (path: string) => pathname === path;

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

  // Handle renaming a project
  const handleRenameProject = async (projectId: string, newName: string) => {
    if (!newName.trim()) return;

    // Immediately close the input field
    setEditingProjectId(null);
    setEditingProjectName("");

    // Get the current projects from cache
    const previousProjects = queryClient.getQueryData<Project[]>(["projects"]);

    // Optimistically update the cache immediately
    queryClient.setQueryData<Project[]>(
      ["projects"],
      (old) =>
        old?.map((p) =>
          p.id === projectId ? { ...p, name: newName.trim() } : p,
        ) ?? [],
    );

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!response.ok) {
        // Rollback on error
        queryClient.setQueryData(["projects"], previousProjects);
      }
    } catch (error) {
      console.error("Error renaming project:", error);
      // Rollback on error
      queryClient.setQueryData(["projects"], previousProjects);
    }
  };

  // Handle deleting a project
  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["meetings"] });
        queryClient.invalidateQueries({ queryKey: ["topics"] });
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.invalidateQueries({ queryKey: ["note-counts"] });

        // Navigate away if we're on a page for this project
        if (pathname.startsWith(`/projects/${projectToDelete.id}`)) {
          router.push("/everything");
        }
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-[var(--line)] bg-[var(--paper)]">
      {/* App title */}
      <div className="border-b border-[var(--line)] px-5 pb-5 pt-6">
        <h1
          className="text-xl font-semibold tracking-tight text-[var(--ink)]"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          Jot
        </h1>
        <p
          className="mt-1 text-[10px] uppercase tracking-widest text-[var(--ink-soft)]"
          style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
        >
          Capture first, file later
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {/* Unsorted - amber badge for "needs attention" */}
        <Link
          href="/unsorted"
          className={cn(
            "flex items-center justify-between gap-2 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
            isActive("/unsorted")
              ? "bg-[var(--accent-soft)] text-[var(--ink)]"
              : "text-[var(--ink)] hover:bg-[var(--accent-soft)]",
          )}
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          <span className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Unsorted
          </span>
          {noteCounts?.unsorted && noteCounts.unsorted > 0 && (
            <Badge variant="unsorted">{noteCounts.unsorted}</Badge>
          )}
        </Link>

        {/* Everything view */}
        <Link
          href="/everything"
          className={cn(
            "flex items-center justify-between gap-2 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
            isActive("/everything")
              ? "bg-[var(--accent-soft)] text-[var(--ink)]"
              : "text-[var(--ink)] hover:bg-[var(--accent-soft)]",
          )}
          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
        >
          <span className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            Everything
          </span>
          {noteCounts?.total && noteCounts.total > 0 && (
            <Badge variant="count">{noteCounts.total}</Badge>
          )}
        </Link>

        {/* Projects section header */}
        <div className="pb-2 pt-6">
          <h2
            className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Projects
          </h2>
        </div>

        {/* Projects list */}
        {projectsLoading ? (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        ) : projects.length === 0 ? (
          isCreatingProject ? (
            <div className="px-3 py-1">
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={handleProjectInputKeyDown}
                onBlur={() => {
                  if (!newProjectName.trim()) {
                    setIsCreatingProject(false);
                  }
                }}
                placeholder="Project name"
                autoFocus
                className="h-8 text-sm"
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreatingProject(true)}
              className="w-full justify-start gap-2 px-3"
            >
              <Plus className="h-4 w-4" />
              New project
            </Button>
          )
        ) : (
          <>
            {projects.map((project) => {
              const projectMeetings = getMeetingsForProject(project.id);
              const projectTopics = getTopicsForProject(project.id);
              const isExpanded = expandedProjects.has(project.id);

              return (
                <Collapsible.Root
                  key={project.id}
                  open={isExpanded}
                  onOpenChange={() => toggleProject(project.id)}
                >
                  {editingProjectId === project.id ? (
                    <Input
                      value={editingProjectName}
                      onChange={(e) => setEditingProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleRenameProject(project.id, editingProjectName);
                        } else if (e.key === "Escape") {
                          setEditingProjectId(null);
                          setEditingProjectName("");
                        }
                      }}
                      onBlur={() => {
                        if (editingProjectName.trim()) {
                          handleRenameProject(project.id, editingProjectName);
                        } else {
                          setEditingProjectId(null);
                          setEditingProjectName("");
                        }
                      }}
                      autoFocus
                      className="h-9 text-sm"
                    />
                  ) : (
                    <div className="group relative">
                      <Collapsible.Trigger asChild>
                        <button
                          className="flex w-full items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--ink)] transition-colors group-hover:bg-[var(--accent-soft)] cursor-pointer"
                          style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                        >
                          <span className="text-xs text-[var(--ink-soft)]">
                            {isExpanded ? "▼" : "▶"}
                          </span>
                          <span className="flex-1 text-left">
                            {project.name}
                          </span>
                        </button>
                      </Collapsible.Trigger>

                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                        <DropdownMenu.Root
                          open={openMenuProjectId === project.id}
                          onOpenChange={(open) =>
                            setOpenMenuProjectId(open ? project.id : null)
                          }
                        >
                          <DropdownMenu.Trigger asChild>
                            <button
                              className="flex h-6 w-6 items-center justify-center rounded text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-raised)] hover:text-[var(--ink)] cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenu.Trigger>

                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              className="min-w-[160px] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)] p-1 shadow-[var(--shadow-pop)]"
                              sideOffset={5}
                              align="end"
                              onPointerLeave={() => setOpenMenuProjectId(null)}
                            >
                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--ink)] outline-none transition-colors hover:bg-[var(--accent-soft)] focus:bg-[var(--accent-soft)]"
                                style={{
                                  fontFamily: "var(--font-ibm-plex-sans)",
                                }}
                                onSelect={() => {
                                  setEditingProjectId(project.id);
                                  setEditingProjectName(project.name);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                                Rename
                              </DropdownMenu.Item>

                              <DropdownMenu.Separator className="my-1 h-px bg-[var(--line)]" />

                              <DropdownMenu.Item
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-red-600 outline-none transition-colors hover:bg-red-50 focus:bg-red-50"
                                style={{
                                  fontFamily: "var(--font-ibm-plex-sans)",
                                }}
                                onSelect={() => handleDeleteProject(project)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>
                    </div>
                  )}

                  {/* Meetings and Notes sub-sections - shown when expanded */}
                  <Collapsible.Content className="ml-6 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
                    <div className="space-y-4 pt-2">
                      {/* Meetings section */}
                      <div>
                        <div
                          className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-soft)]"
                          style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                        >
                          Meetings
                        </div>
                        {meetingsLoading ? (
                          <div className="px-2 py-1 text-xs text-[var(--ink-soft)]">
                            Loading...
                          </div>
                        ) : projectMeetings.length === 0 ? (
                          <div className="px-2 py-1 text-xs italic text-[var(--ink-soft)]">
                            No meetings yet
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {projectMeetings.map((meeting) => (
                              <Link
                                key={meeting.id}
                                href={`/projects/${project.id}/meetings/${meeting.id}`}
                                className={cn(
                                  "flex items-center justify-between gap-2 rounded-[var(--radius)] px-2 py-1.5 text-xs transition-colors",
                                  pathname ===
                                    `/projects/${project.id}/meetings/${meeting.id}`
                                    ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                                    : "text-[var(--ink)] hover:bg-[var(--accent-soft)]",
                                )}
                                style={{
                                  fontFamily: "var(--font-ibm-plex-sans)",
                                }}
                              >
                                <span className="flex items-center gap-1.5">
                                  {meeting.name}
                                  {meeting.recurring && (
                                    <Repeat className="h-3 w-3 text-[var(--accent)]" />
                                  )}
                                </span>
                                {noteCounts?.byMeeting[meeting.id] && (
                                  <span
                                    className="text-[10px] text-[var(--ink-soft)]"
                                    style={{
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                    }}
                                  >
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
                        <div
                          className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-soft)]"
                          style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                        >
                          Notes
                        </div>
                        {topicsLoading ? (
                          <div className="px-2 py-1 text-xs text-[var(--ink-soft)]">
                            Loading...
                          </div>
                        ) : projectTopics.length === 0 ? (
                          <div className="px-2 py-1 text-xs italic text-[var(--ink-soft)]">
                            No topics yet
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {projectTopics.map((topic) => (
                              <Link
                                key={topic.id}
                                href={`/projects/${project.id}/topics/${topic.id}`}
                                className={cn(
                                  "flex items-center justify-between gap-2 rounded-[var(--radius)] px-2 py-1.5 text-xs transition-colors",
                                  pathname ===
                                    `/projects/${project.id}/topics/${topic.id}`
                                    ? "bg-[var(--purple-soft)] text-[var(--ink)]"
                                    : "text-[var(--ink)] hover:bg-[var(--accent-soft)]",
                                )}
                                style={{
                                  fontFamily: "var(--font-ibm-plex-sans)",
                                }}
                              >
                                <span>{topic.name}</span>
                                {noteCounts?.byTopic[topic.id] && (
                                  <span
                                    className="text-[10px] text-[var(--ink-soft)]"
                                    style={{
                                      fontFamily: "var(--font-ibm-plex-mono)",
                                    }}
                                  >
                                    {noteCounts.byTopic[topic.id]}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Collapsible.Content>
                </Collapsible.Root>
              );
            })}
            {isCreatingProject ? (
              <div className="px-3 py-1">
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={handleProjectInputKeyDown}
                  onBlur={() => {
                    if (!newProjectName.trim()) {
                      setIsCreatingProject(false);
                    }
                  }}
                  placeholder="Project name"
                  autoFocus
                  className="h-8 text-sm"
                />
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingProject(true)}
                className="w-full justify-start gap-2 px-3"
              >
                <Plus className="h-4 w-4" />
                New project
              </Button>
            )}
          </>
        )}
      </nav>

      {/* Footer with sign out */}
      <div className="border-t border-[var(--line)] px-3 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start"
        >
          Sign out
        </Button>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Project"
        description={
          projectToDelete
            ? `Are you sure you want to delete "${projectToDelete.name}" and all its meetings, topics, and notes? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete Project"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteProject}
        variant="danger"
      />
    </aside>
  );
}
