"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  CheckSquare,
  Quote,
} from "lucide-react";

/**
 * Bubble toolbar that appears when text is selected.
 * Provides quick formatting options.
 * Styled to match the app's design language.
 */

interface BubbleMenuToolbarProps {
  editor: Editor;
}

export function BubbleMenuToolbar({ editor }: BubbleMenuToolbarProps) {
  const buttons = [
    {
      icon: Bold,
      title: "Bold",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive("bold"),
    },
    {
      icon: Italic,
      title: "Italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive("italic"),
    },
    {
      icon: Heading1,
      title: "Heading 1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive("heading", { level: 1 }),
    },
    {
      icon: Heading2,
      title: "Heading 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive("heading", { level: 2 }),
    },
    {
      icon: Heading3,
      title: "Heading 3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive("heading", { level: 3 }),
    },
    {
      icon: List,
      title: "Bullet List",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive("bulletList"),
    },
    {
      icon: CheckSquare,
      title: "Checkbox",
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive("taskList"),
    },
    {
      icon: Quote,
      title: "Quote",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive("blockquote"),
    },
  ];

  return (
    <BubbleMenu editor={editor}>
      <div
        className="bubble-menu-toolbar"
        style={{
          display: "flex",
          gap: "4px",
          backgroundColor: "var(--paper-raised)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-pop)",
          padding: "4px",
        }}
      >
        {buttons.map((button, index) => {
          const Icon = button.icon;
          const isActive = button.isActive();

          return (
            <button
              key={index}
              onClick={button.action}
              title={button.title}
              className="bubble-menu-button"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: isActive ? "var(--accent)" : "transparent",
                color: isActive ? "white" : "var(--ink)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "var(--accent-soft)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </button>
          );
        })}
      </div>
    </BubbleMenu>
  );
}
