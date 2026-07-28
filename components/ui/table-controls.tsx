"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import { Editor } from "@tiptap/react";
import { Rows3, Columns3, Plus, Minus, Trash2, LucideIcon } from "lucide-react";

/**
 * Small floating toolbar shown whenever the cursor is inside a table.
 * Deliberately minimal (add/remove one row or column, delete the whole
 * table) - not a full spreadsheet-editing toolbar, matching the "quick
 * simple comparisons" scope tables were built for.
 */

interface TableControlsProps {
  editor: Editor;
}

/** Base icon (rows/columns) with a small plus/minus badge - reads as "add
 * a row" or "remove a column" rather than a bare +/- character. */
function BadgedIcon({ base: Base, badge: Badge }: { base: LucideIcon; badge: LucideIcon }) {
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <Base className="h-4 w-4" strokeWidth={2} />
      <span
        style={{
          position: "absolute",
          bottom: -4,
          right: -4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "11px",
          height: "11px",
          borderRadius: "50%",
          backgroundColor: "var(--paper-raised)",
          border: "1px solid var(--paper-raised)",
        }}
      >
        <Badge className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    </span>
  );
}

export function TableControls({ editor }: TableControlsProps) {
  const structureButtons = [
    {
      icon: () => <BadgedIcon base={Rows3} badge={Plus} />,
      title: "Add row below",
      action: () => editor.chain().focus().addRowAfter().run(),
    },
    {
      icon: () => <BadgedIcon base={Rows3} badge={Minus} />,
      title: "Delete this row",
      action: () => editor.chain().focus().deleteRow().run(),
    },
    {
      icon: () => <BadgedIcon base={Columns3} badge={Plus} />,
      title: "Add column after",
      action: () => editor.chain().focus().addColumnAfter().run(),
    },
    {
      icon: () => <BadgedIcon base={Columns3} badge={Minus} />,
      title: "Delete this column",
      action: () => editor.chain().focus().deleteColumn().run(),
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
          alignItems: "center",
          gap: "4px",
          backgroundColor: "var(--paper-raised)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-pop)",
          padding: "4px",
        }}
      >
        {structureButtons.map((button, index) => (
          <button
            key={index}
            onClick={button.action}
            title={button.title}
            aria-label={button.title}
            className="table-controls-button"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "transparent",
              color: "var(--ink)",
              cursor: "pointer",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--accent-soft)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {button.icon()}
          </button>
        ))}

        {/* Divider before the destructive action, kept visually subdued
            (ink-soft + paper hover, same treatment NoteCard uses for its
            own delete button) so it doesn't carry equal weight to the
            structural row/column controls above. */}
        <div
          style={{
            width: "1px",
            height: "20px",
            backgroundColor: "var(--line)",
            margin: "0 2px",
          }}
        />
        <button
          onClick={() => editor.chain().focus().deleteTable().run()}
          title="Delete table"
          aria-label="Delete table"
          className="table-controls-button"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            border: "none",
            borderRadius: "6px",
            backgroundColor: "transparent",
            color: "var(--ink-soft)",
            cursor: "pointer",
            transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--paper)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </BubbleMenu>
  );
}
