"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Project } from "@/lib/types";
import { AutocompleteInput } from "./autocomplete-input";

/**
 * Categorize bar shown after capturing a note.
 * Features:
 * - Slide-up animation from bottom
 * - Custom autocomplete inputs that clearly show existing vs new options
 * - Type toggle buttons with full color fills when selected
 * - Refined spacing and typography matching design system
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
};

export function CategorizeBar({ isOpen, onSave, onSkip }: CategorizeBarProps) {
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
      return 'Will save as a Meeting — topic is optional, defaults to "General meeting"';
    if (type === "general")
      return 'Will save as a General note — topic is optional, defaults to "General"';
    return "No type chosen — will save as a General note";
  };

  return (
    <div
      className={`fixed left-0 right-0 bottom-0 bg-white border-t transition-transform duration-300 ease-out z-50 ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
      style={{
        borderColor: "var(--line)",
        boxShadow: "0 -12px 30px rgba(27, 37, 33, 0.10)",
      }}
    >
      <div className="max-w-3xl mx-auto px-10 py-6">
        {/* Title */}
        <div className="mb-4">
          <h3
            className="text-base font-semibold mb-0"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              color: "var(--ink)",
            }}
          >
            What are these notes about?{" "}
            <span className="font-normal" style={{ color: "var(--ink-soft)" }}>
              — optional, you can always file later
            </span>
          </h3>
        </div>

        {/* Type toggle row */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex border rounded-lg overflow-hidden"
            style={{ borderColor: "var(--line)" }}
          >
            <button
              onClick={() => setType(type === "meeting" ? null : "meeting")}
              className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                type === "meeting" ? "text-white" : "hover:bg-opacity-50"
              }`}
              style={{
                backgroundColor:
                  type === "meeting" ? "var(--accent)" : "var(--paper)",
                color: type === "meeting" ? "#fff" : "var(--ink-soft)",
              }}
            >
              Meeting
            </button>
            <button
              onClick={() => setType(type === "general" ? null : "general")}
              className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                type === "general" ? "text-white" : "hover:bg-opacity-50"
              }`}
              style={{
                backgroundColor:
                  type === "general" ? "var(--purple)" : "var(--paper)",
                color: type === "general" ? "#fff" : "var(--ink-soft)",
              }}
            >
              General
            </button>
          </div>
          <div
            className="text-xs"
            style={{
              fontFamily: "var(--font-ibm-plex-mono)",
              color: "var(--ink-soft)",
            }}
          >
            {getTypeHint()}
          </div>
        </div>

        {/* Input fields */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Project */}
          <AutocompleteInput
            value={projectInput}
            onChange={setProjectInput}
            options={projects.map((p) => ({ id: p.id, name: p.name }))}
            placeholder="e.g. Client Migration"
            label="Project"
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
            label={type === "meeting" ? "Meeting" : "Topic"}
            disabled={!projectInput}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold rounded-lg transition-colors hover:opacity-90 cursor-pointer"
            style={{
              fontFamily: "var(--font-space-grotesk)",
              backgroundColor: "var(--ink)",
              color: "var(--paper)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--ink)";
            }}
          >
            Save note
          </button>
          <button
            onClick={onSkip}
            className="px-3 py-2 text-sm underline transition-colors cursor-pointer"
            style={{
              color: "var(--ink-soft)",
              textDecorationColor: "var(--line)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--ink-soft)";
            }}
          >
            Keep in Unsorted
          </button>
        </div>
      </div>
    </div>
  );
}
