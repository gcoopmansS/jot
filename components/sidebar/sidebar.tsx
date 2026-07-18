"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Collapsible from "@radix-ui/react-collapsible";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Inbox,
  Clock,
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
 * - All notes (Recent view)
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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // Start with sidebar closed on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Default to true for SSR, will be corrected on mount
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768; // md breakpoint
  });

  // Adjust sidebar state when window is resized across the md breakpoint
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      // On desktop, always show sidebar; on mobile, keep current state
      if (!isMobile && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen]);

  // Get current user's email
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    fetchUser();
  }, [supabase]);

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
    <>
      {/* Mobile/narrow width toggle button - only shown when sidebar is closed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink)] transition-colors hover:bg-[var(--accent-soft)] shadow-md cursor-pointer"
          aria-label="Open sidebar"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

      {/* Backdrop for mobile - click to close */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "flex h-screen w-60 flex-col border-r border-[var(--line)] bg-[var(--paper)] transition-transform duration-300",
          "md:translate-x-0 md:relative",
          "fixed left-0 top-0 z-40",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* App title with close button on mobile */}
        <div className="border-b border-[var(--line)] px-5 pb-5 pt-6">
          <div className="flex items-start justify-between">
            <div>
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
            {/* Close button - only visible on narrow screens */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--ink-soft)] transition-colors hover:bg-[var(--line)] hover:text-[var(--ink)] cursor-pointer"
              aria-label="Close sidebar"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {/* Unsorted - neutral count badge (legitimate permanent home for notes) */}
          <Link
            href="/unsorted"
            className={cn(
              "flex items-center justify-between gap-2 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
              isActive("/unsorted")
                ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                : "text-[var(--ink)] hover:bg-[var(--accent-soft)]",
            )}
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            onClick={() => setIsSidebarOpen(false)}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Inbox className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Unsorted</span>
            </span>
            {noteCounts?.unsorted !== undefined && (
              <Badge variant="count">{noteCounts.unsorted}</Badge>
            )}
          </Link>

          {/* Recent view */}
          <Link
            href="/everything"
            className={cn(
              "flex items-center justify-between gap-2 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
              isActive("/everything")
                ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                : "text-[var(--ink)] hover:bg-[var(--accent-soft)]",
            )}
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            onClick={() => setIsSidebarOpen(false)}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Recent</span>
            </span>
            {noteCounts?.total !== undefined && (
              <Badge variant="count">{noteCounts.total}</Badge>
            )}
          </Link>

          {/* Recurring meetings section */}
          <div className="pb-2 pt-6">
            <h2
              className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              Recurring
            </h2>
          </div>

          {meetingsLoading ? (
            <div className="flex items-center justify-center py-2">
              <LoadingSpinner size="sm" />
            </div>
          ) : meetings.filter((m) => m.recurring).length === 0 ? (
            <div
              className="px-3 py-2 text-xs italic text-[var(--ink-soft)]"
              style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
            >
              No recurring meetings yet — mark one as recurring from its meeting
              page
            </div>
          ) : (
            <div className="space-y-0.5">
              {meetings
                .filter((m) => m.recurring)
                .map((meeting) => {
                  const project = projects.find(
                    (p) => p.id === meeting.project_id,
                  );
                  return (
                    <Link
                      key={meeting.id}
                      href={`/projects/${meeting.project_id}/meetings/${meeting.id}`}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
                        pathname ===
                          `/projects/${meeting.project_id}/meetings/${meeting.id}`
                          ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                          : "text-[var(--ink)] hover:bg-[var(--accent-soft)]",
                      )}
                      style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Repeat className="h-3.5 w-3.5 flex-shrink-0 text-[var(--accent)]" />
                        <span className="flex flex-col gap-0.5 min-w-0">
                          <span className="truncate">{meeting.name}</span>
                          {project && (
                            <span
                              className="text-[10px] text-[var(--ink-soft)] truncate"
                              style={{
                                fontFamily: "var(--font-ibm-plex-mono)",
                              }}
                            >
                              {project.name}
                            </span>
                          )}
                        </span>
                      </span>
                      {noteCounts?.byMeeting[meeting.id] && (
                        <Badge variant="count">
                          {noteCounts.byMeeting[meeting.id]}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
            </div>
          )}

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
                        <div className="flex w-full items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--ink)] transition-colors group-hover:bg-[var(--accent-soft)]">
                          <Collapsible.Trigger asChild>
                            <button
                              className="text-xs text-[var(--ink-soft)] cursor-pointer hover:text-[var(--ink)] transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isExpanded ? "▼" : "▶"}
                            </button>
                          </Collapsible.Trigger>
                          <Link
                            href={`/projects/${project.id}`}
                            className="flex-1 text-left cursor-pointer truncate"
                            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                            onClick={() => setIsSidebarOpen(false)}
                          >
                            {project.name}
                          </Link>
                        </div>

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
                                onPointerLeave={() =>
                                  setOpenMenuProjectId(null)
                                }
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
                                  onClick={() => setIsSidebarOpen(false)}
                                >
                                  <span className="flex items-center gap-1.5 min-w-0">
                                    {meeting.recurring && (
                                      <Repeat className="h-3 w-3 flex-shrink-0 text-[var(--accent)]" />
                                    )}
                                    <span className="truncate">
                                      {meeting.name}
                                    </span>
                                  </span>
                                  {noteCounts?.byMeeting[meeting.id] && (
                                    <span
                                      className="text-[10px] text-[var(--ink-soft)] flex-shrink-0"
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
                                  onClick={() => setIsSidebarOpen(false)}
                                >
                                  <span className="truncate">{topic.name}</span>
                                  {noteCounts?.byTopic[topic.id] && (
                                    <span
                                      className="text-[10px] text-[var(--ink-soft)] flex-shrink-0"
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

        {/* Footer with user identity and sign out */}
        <div className="border-t border-[var(--line)] px-3 py-4 space-y-2.5">
          {/* User identity indicator - clickable, links to settings */}
          {userEmail && (
            <Link href="/settings" onClick={() => setIsSidebarOpen(false)}>
              <button className="flex w-full items-center gap-3 rounded-[var(--radius)] px-2 py-2 text-left transition-colors hover:bg-[var(--accent-soft)]">
                {/* Circular avatar with first letter */}
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{
                    fontFamily: "var(--font-ibm-plex-sans)",
                    backgroundColor: "var(--accent)",
                  }}
                >
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                {/* Email address, truncated if too long */}
                <span
                  className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                  title={userEmail}
                >
                  {userEmail}
                </span>
              </button>
            </Link>
          )}

          {/* Sign out button */}
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
    </>
  );
}
