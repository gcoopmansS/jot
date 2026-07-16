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
  onSave: (data: {
    type: "meeting" | "general";
    projectId?: string;
    topicId?: string;
    meetingId?: string;
  }) => void;
  onSkip: () => void;
  onBack: () => void;
};

export function CategorizeBar({
  isOpen,
  onSave,
  onSkip,
  onBack,
}: CategorizeBarProps) {
  const queryClient = useQueryClient();
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
    const project = projects.find((p) => p.name === projectInput);
    let projectId = project?.id;

    // If project doesn't exist and user entered a name, create it
    if (!projectId && projectInput.trim()) {
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: projectInput.trim() }),
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

    // If user entered a topic/meeting name
    if (topicInput.trim() && projectId) {
      if (type === "meeting") {
        // Create or find meeting
        const existingMeeting = topics.find((t) => t.name === topicInput);
        if (existingMeeting) {
          meetingId = existingMeeting.id;
        } else {
          try {
            const response = await fetch("/api/meetings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                project_id: projectId,
                name: topicInput.trim(),
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
        const existingTopic = topics.find((t) => t.name === topicInput);
        if (existingTopic) {
          topicId = existingTopic.id;
        } else {
          try {
            const response = await fetch("/api/topics", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                project_id: projectId,
                name: topicInput.trim(),
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

    onSave({
      type: type || "general",
      projectId,
      topicId,
      meetingId,
    });
  };

  const getTypeHint = () => {
    if (type === "meeting")
      return "Meeting notes — add to a recurring thread or one-time meeting";
    if (type === "general") return "General notes — analysis, drafts, findings";
    return "Choose Meeting or General to categorize";
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
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--line)] bg-[var(--paper-raised)]"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          <div className="mx-auto max-w-3xl px-10 py-6">
            {/* Title */}
            <div className="mb-4">
              <h3
                className="text-base font-semibold text-[var(--ink)]"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                What are these notes about?{" "}
                <span
                  className="font-normal text-[var(--ink-soft)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  — optional, you can always file later
                </span>
              </h3>
            </div>

            {/* Type toggle row */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex overflow-hidden rounded-[var(--radius)] border border-[var(--line)]">
                <button
                  onClick={() => setType(type === "meeting" ? null : "meeting")}
                  data-state={type === "meeting" ? "selected" : "unselected"}
                  className="cursor-pointer px-4 py-2 text-sm font-medium transition-colors data-[state=selected]:bg-[var(--accent)] data-[state=selected]:text-white data-[state=unselected]:bg-[var(--paper)] data-[state=unselected]:text-[var(--ink-soft)] data-[state=unselected]:hover:bg-[var(--accent-soft)]"
                  style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
                >
                  Meeting
                </button>
                <button
                  onClick={() => setType(type === "general" ? null : "general")}
                  data-state={type === "general" ? "selected" : "unselected"}
                  className="cursor-pointer px-4 py-2 text-sm font-medium transition-colors data-[state=selected]:bg-[var(--purple)] data-[state=selected]:text-white data-[state=unselected]:bg-[var(--paper)] data-[state=unselected]:text-[var(--ink-soft)] data-[state=unselected]:hover:bg-[var(--purple-soft)]"
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
            <div className="mb-4 grid grid-cols-2 gap-4">
              {/* Project */}
              <AutocompleteInput
                value={projectInput}
                onChange={setProjectInput}
                options={projects.map((p) => ({ id: p.id, name: p.name }))}
                placeholder="e.g. Client Migration"
                label="Which project?"
                disabled={isLoadingProjects}
              />

              {/* Topic or Meeting */}
              <AutocompleteInput
                value={topicInput}
                onChange={setTopicInput}
                options={topics}
                placeholder={
                  type === "meeting"
                    ? "e.g. Stakeholder sync"
                    : "e.g. Requirements analysis"
                }
                label={type === "meeting" ? "Meeting or topic?" : "Topic?"}
                disabled={!projectInput}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={onBack}
                className="text-sm text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] cursor-pointer"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                ← Back to note
              </button>
              <div className="flex items-center gap-3">
                <Button onClick={handleSave} variant="primary">
                  File note
                </Button>
                <Button onClick={onSkip} variant="secondary">
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
