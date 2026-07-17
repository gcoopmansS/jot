"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Editor } from "@tiptap/react";

/**
 * Slash command menu for the rich-text editor.
 * Appears when user types "/" at the start of a line.
 * Styled to match the app's design language.
 */

export interface SlashCommandItem {
  title: string;
  description?: string;
  icon?: string;
  command: (editor: Editor) => void;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  editor: Editor;
}

export interface SlashCommandMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuRef,
  SlashCommandMenuProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length,
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div
      className="slash-command-menu"
      style={{
        backgroundColor: "var(--paper-raised)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-pop)",
        padding: "4px",
        minWidth: "200px",
        fontFamily: "var(--font-ibm-plex-sans)",
        fontSize: "14px",
      }}
    >
      {props.items.map((item, index) => (
        <button
          key={index}
          onClick={() => selectItem(index)}
          className={`slash-command-item ${
            index === selectedIndex ? "selected" : ""
          }`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            padding: "8px 12px",
            border: "none",
            borderRadius: "6px",
            backgroundColor:
              index === selectedIndex ? "var(--accent-soft)" : "transparent",
            color: "var(--ink)",
            cursor: "pointer",
            textAlign: "left",
            transition: "background-color 0.15s",
            fontFamily: "var(--font-ibm-plex-sans)",
            fontSize: "14px",
          }}
        >
          {item.icon && <span>{item.icon}</span>}
          <span style={{ fontWeight: 500 }}>{item.title}</span>
        </button>
      ))}
    </div>
  );
});

SlashCommandMenu.displayName = "SlashCommandMenu";
