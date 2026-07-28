"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import { Editor } from "@tiptap/react";
import { Plus, Minus, Trash2 } from "lucide-react";

/**
 * Small floating toolbar shown whenever the cursor is inside a table.
 * Deliberately minimal (add/remove one row or column, delete the whole
 * table) - not a full spreadsheet-editing toolbar, matching the "quick
 * simple comparisons" scope tables were built for.
 */

interface TableControlsProps {
  editor: Editor;
}

export function TableControls({ editor }: TableControlsProps) {
  const buttons = [
    {
      icon: Plus,
      label: "Row",
      title: "Add row below",
      action: () => editor.chain().focus().addRowAfter().run(),
    },
    {
      icon: Minus,
      label: "Row",
      title: "Delete this row",
      action: () => editor.chain().focus().deleteRow().run(),
    },
    {
      icon: Plus,
      label: "Column",
      title: "Add column after",
      action: () => editor.chain().focus().addColumnAfter().run(),
    },
    {
      icon: Minus,
      label: "Column",
      title: "Delete this column",
      action: () => editor.chain().focus().deleteColumn().run(),
    },
    {
      icon: Trash2,
      label: "Table",
      title: "Delete table",
      action: () => editor.chain().focus().deleteTable().run(),
    },
  ];

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableControls"
      shouldShow={({ editor }) => editor.isActive("table")}
    >
      <div
        className="table-controls-toolbar"
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
          return (
            <button
              key={index}
              onClick={button.action}
              title={button.title}
              className="table-controls-button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                padding: "0 8px",
                height: "32px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "transparent",
                color: "var(--ink)",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "var(--font-ibm-plex-sans)",
                transition: "background-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--accent-soft)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              {button.label}
            </button>
          );
        })}
      </div>
    </BubbleMenu>
  );
}
