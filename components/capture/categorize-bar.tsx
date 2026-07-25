"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Project } from "@/lib/types";
import { AutocompleteInput } from "./autocomplete-input";
import { Button } from "@/components/ui/button";

/**
 * Categorize bar shown after capturing a note.
 *
 * This is the second deliberate animation: slides up from bottom with
 * custom easing: cubic-bezier(.2, .8, .2, 1), 300ms duration.
 *
 * Features:
 * - Type toggle buttons (Meeting/General) with selected state styling
 * - Autocomplete inputs for Project and Topic/Meeting
 * - "Save note" primary button and "Keep in Unsorted" secondary button
 */

type CategorizeBarProps = {
  isOpen: boolean;
  initialTitle?: string;
  onSave: (data: {
    title?: string;
    type: "meeting" | "general";
    projectId?: string;
    topicId?: string;
    meetingId?: string;
    isUnsorted?: boolean;
  }) => void;
  onSkip: () => void;
  onBack: () => void;
};

export function CategorizeBar({
  isOpen,
  initialTitle = "",
  onSave,
  onSkip,
  onBack,
}: CategorizeBarProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initialTitle);
  const [type, setType] = useState<"meeting" | "general" | null>(null);
  const [projectInput, setProjectInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch("/api/projects");
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  // Fetch topics/meetings when project or type changes
  useEffect(() => {
    const project = projects.find((p) => p.name === projectInput);
    if (!project || !type) {
      return; // No valid project selected or no type chosen
    }

    const fetchItems = async () => {
      try {
        const endpoint = type === "meeting" ? "/api/meetings" : "/api/topics";
        const response = await fetch(`${endpoint}?project_id=${project.id}`);
        if (response.ok) {
          const data = await response.json();
          setTopics(data);
        }
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    fetchItems();
  }, [projectInput, projects, type]);

  const handleSave = async () => {
    // Apply defaults for "File note" action - never leave unsorted
    const finalType: "meeting" | "general" = type || "general";

    // Default project name if user left it blank
    const finalProjectName = projectInput.trim() || "Unfiled Project";

    // Default topic/meeting name based on type
    const finalTopicName =
      topicInput.trim() ||
      (finalType === "meeting" ? "General meeting" : "General");

    // Find or create the project
    let project = projects.find((p) => p.name === finalProjectName);
    let projectId = project?.id;

    if (!projectId) {
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: finalProjectName }),
        });
        if (response.ok) {
          const newProject = await response.json();
          projectId = newProject.id;
          // Invalidate projects cache so sidebar updates
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      } catch (error) {
        console.error("Error creating project:", error);
      }
    }

    let topicId: string | undefined;
    let meetingId: string | undefined;

    // Always create/find a topic or meeting (since we have defaults now)
    if (projectId) {
      if (finalType === "meeting") {
        // Create or find meeting
        const existingMeeting = topics.find((t) => t.name === finalTopicName);
        if (existingMeeting) {
          meetingId = existingMeeting.id;
        } else {
          try {
            const response = await fetch("/api/meetings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                project_id: projectId,
                name: finalTopicName,
                recurring: false,
              }),
            });
            if (response.ok) {
              const newMeeting = await response.json();
              meetingId = newMeeting.id;
              // Invalidate meetings cache so sidebar updates
              queryClient.invalidateQueries({ queryKey: ["meetings"] });
            }
          } catch (error) {
            console.error("Error creating meeting:", error);
          }
        }
      } else {
        // Create or find topic
        const existingTopic = topics.find((t) => t.name === finalTopicName);
        if (existingTopic) {
          topicId = existingTopic.id;
        } else {
          try {
            const response = await fetch("/api/topics", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                project_id: projectId,
                name: finalTopicName,
              }),
            });
            if (response.ok) {
              const newTopic = await response.json();
              topicId = newTopic.id;
              // Invalidate topics cache so sidebar updates
              queryClient.invalidateQueries({ queryKey: ["topics"] });
            }
          } catch (error) {
            console.error("Error creating topic:", error);
          }
        }
      }
    }

    // When "File note" is clicked, ALWAYS file the note (is_unsorted: false)
    // Only mark as unsorted if there was a failure creating the required entities
    const isValidCategorization =
      (finalType === "meeting" && meetingId) ||
      (finalType === "general" && topicId);

    onSave({
      title: title.trim() || undefined, // Include title if provided
      type: finalType,
      projectId,
      topicId,
      meetingId,
      isUnsorted: !isValidCategorization, // Only unsorted if creation failed
    });
  };

  const getTypeHint = () => {
    if (type === "meeting") return "Will save as a Meeting";
    if (type === "general") return "Will save as a General note";
    return "No type chosen — will save as a General note";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          exit={{ y: "110%" }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--paper-raised)]"
          style={{
            boxShadow: "var(--shadow-pop)",
            background:
              "linear-gradient(to bottom, rgba(27, 37, 33, 0.04) 0px, transparent 12px, var(--paper-raised) 12px)",
          }}
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-10 py-4 sm:py-6">
            {/* Heading */}
            <div className="mb-4">
              <h3
                className="text-base font-semibold text-[var(--ink)]"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                What are these notes about?{" "}
                <span
                  className="font-normal text-[var(--ink-soft)] hidden sm:inline"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  — optional, you can always file later
                </span>
              </h3>
            </div>

            {/* Title input - full width, positioned first */}
            <div className="mb-4">
              <label
                className="mb-1.5 block text-[11px] uppercase tracking-wide text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
              >
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional — give this note a name"
                className="w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] transition-colors placeholder:text-[var(--ink-soft)] focus:border-[var(--accent)] focus:outline-none"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              />
            </div>

            {/* Type toggle row */}
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setType(type === "meeting" ? null : "meeting")}
                  data-state={type === "meeting" ? "selected" : "unselected"}
                  className="cursor-pointer rounded-[var(--radius)] border px-4 py-2 text-sm font-medium transition-colors data-[state=selected]:border-[var(--accent)] data-[state=selected]:bg-[var(--accent)] data-[state=selected]:text-white data-[state=unselected]:border-[var(--line)] data-[state=unselected]:bg-transparent data-[state=unselected]:text-[var(--ink-soft)] data-[state=unselected]:hover:border-[var(--accent)] data-[state=unselected]:hover:bg-[var(--accent-soft)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  Meeting
                </button>
                <button
                  onClick={() => setType(type === "general" ? null : "general")}
                  data-state={type === "general" ? "selected" : "unselected"}
                  className="cursor-pointer rounded-[var(--radius)] border px-4 py-2 text-sm font-medium transition-colors data-[state=selected]:border-[var(--purple)] data-[state=selected]:bg-[var(--purple)] data-[state=selected]:text-white data-[state=unselected]:border-[var(--line)] data-[state=unselected]:bg-transparent data-[state=unselected]:text-[var(--ink-soft)] data-[state=unselected]:hover:border-[var(--purple)] data-[state=unselected]:hover:bg-[var(--purple-soft)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  General
                </button>
              </div>
              <div
                className="text-xs text-[var(--ink-soft)]"
                style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
              >
                {getTypeHint()}
              </div>
            </div>

            {/* Input fields */}
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Project */}
              <AutocompleteInput
                value={projectInput}
                onChange={setProjectInput}
                options={projects.map((p) => ({ id: p.id, name: p.name }))}
                placeholder="e.g. Client Migration"
                label="Which project?"
                disabled={isLoadingProjects}
              />

              {/* Topic */}
              <div className="flex flex-col gap-1.5">
                <AutocompleteInput
                  value={topicInput}
                  onChange={setTopicInput}
                  options={topics}
                  placeholder={
                    type === "meeting"
                      ? "e.g. Stakeholder sync"
                      : "e.g. Requirements analysis"
                  }
                  label="Topic"
                  disabled={!projectInput}
                />
                <p
                  className="text-[11px] text-[var(--ink-soft)] -mt-0.5"
                  style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                >
                  Optional — defaults to &lsquo;
                  {type === "meeting" ? "General meeting" : "General"}&rsquo;
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                onClick={onBack}
                className="text-sm text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] cursor-pointer text-center sm:text-left"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                ← Back to note
              </button>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSave}
                  variant="primary"
                  className="flex-1 sm:flex-initial"
                >
                  File note
                </Button>
                <Button
                  onClick={onSkip}
                  variant="secondary"
                  className="flex-1 sm:flex-initial"
                >
                  Skip for now
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
