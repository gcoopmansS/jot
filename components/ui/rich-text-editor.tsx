"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Markdown } from "tiptap-markdown";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";
import { Extension } from "@tiptap/core";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { CheckSquare, Table as TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SlashCommandMenu,
  SlashCommandItem,
  SlashCommandMenuRef,
} from "./slash-command-menu";
import { BubbleMenuToolbar } from "./bubble-menu-toolbar";
import { TableControls } from "./table-controls";

/**
 * RichTextEditor - Tiptap-based markdown editor for note capture and editing.
 *
 * Key behaviors:
 * - Auto-focuses immediately when mounted (critical for capture flow)
 * - Stores content as markdown (not HTML or JSON)
 * - Formats markdown as the user types (Notion-style live formatting)
 * - Supports: headings, bold, italic, lists, blockquotes, inline code
 * - Uses Source Serif 4 to match the existing note content design
 *
 * CRITICAL: The editor must be ready and focused with zero perceptible delay.
 * We configure Tiptap to be synchronous and avoid any loading states.
 */

interface RichTextEditorProps {
  /** Markdown content to display/edit */
  content: string;
  /** Called when content changes (receives markdown string) */
  onChange: (markdown: string) => void;
  /** Placeholder text shown when editor is empty */
  placeholder?: string;
  /** Whether to autofocus on mount (default: true for capture flow) */
  autofocus?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Called when editor is ready and focused */
  onReady?: () => void;
  /** Called when user presses Cmd+Enter (or Ctrl+Enter) to save */
  onSave?: () => void;
}

// Helper function to get markdown from editor
function getMarkdownFromEditor(editor: Editor): string {
  try {
    // The tiptap-markdown extension adds a getMarkdown method to the editor's storage
    const markdown = (editor as any).storage?.markdown?.getMarkdown?.();
    if (markdown !== undefined) {
      return markdown;
    }

    // Fallback: try to get text content if markdown storage isn't ready
    if (editor.state?.doc) {
      return editor.state.doc.textContent || "";
    }

    return "";
  } catch (error) {
    console.warn("Error getting markdown from editor:", error);
    return "";
  }
}

// Slash command items - formatting options available via "/"
const getSlashCommandItems = (): SlashCommandItem[] => [
  {
    title: "Heading 1",
    icon: "H1",
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    icon: "H2",
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    icon: "H3",
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    icon: "•",
    command: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    icon: "1.",
    command: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    title: "Task List",
    icon: <CheckSquare className="h-4 w-4" strokeWidth={2} />,
    command: (editor) => {
      editor.chain().focus().toggleTaskList().run();
    },
  },
  {
    title: "Quote",
    icon: '"',
    command: (editor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    title: "Code",
    icon: "<>",
    command: (editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    title: "Table",
    icon: <TableIcon className="h-4 w-4" strokeWidth={2} />,
    command: (editor) => {
      // withHeaderRow keeps the table serializable as plain GFM markdown
      // (pipe syntax) rather than falling back to raw HTML in storage.
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
];

// Create the slash command extension using Tiptap's suggestion utility
const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: true,
        command: ({ editor, range, props }: any) => {
          editor.chain().focus().deleteRange(range).run();
          props.command(editor);
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

// Custom extension to handle Cmd+Enter for saving
const SaveShortcut = Extension.create({
  name: "saveShortcut",

  addOptions() {
    return {
      onSave: null as (() => void) | null,
    };
  },

  priority: 1000,

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => {
        if (this.options.onSave) {
          this.options.onSave();
          return true;
        }
        return false;
      },
    };
  },
});

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
  autofocus = true,
  className,
  onReady,
  onSave,
}: RichTextEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Use a ref to store the latest onSave callback
  // This ensures the keyboard shortcut always calls the current version
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const editor = useEditor(
    {
      extensions: [
        SaveShortcut.configure({
          onSave: () => {
            if (onSaveRef.current) {
              onSaveRef.current();
            }
          },
        }),
        StarterKit.configure({
          // Configure heading levels (only h1, h2, h3)
          heading: {
            levels: [1, 2, 3],
          },
        }),
        // Task list extensions for checkboxes
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        // Table extensions - basic (no column resizing). renderWrapper
        // wraps the table in a div.tableWrapper so narrow-width notes can
        // scroll the table horizontally instead of forcing the page to
        // reflow (styled below).
        Table.configure({
          resizable: false,
          renderWrapper: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        // Link extension with autolink support
        Link.configure({
          openOnClick: false, // Use Cmd+click in edit mode
          autolink: true, // Automatically linkify URLs
          linkOnPaste: true, // Convert pasted URLs to links
          HTMLAttributes: {
            target: "_blank", // Open in new tab
            rel: "noopener noreferrer",
            class: "editor-link",
          },
        }),
        // Markdown extension for serialization/deserialization
        Markdown.configure({
          html: false, // Don't allow HTML
          transformPastedText: true, // Convert pasted HTML to markdown
          transformCopiedText: true, // Convert copied content to markdown
        }),
        // Placeholder extension
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
        }),
        // Bubble menu extension (for selection toolbar)
        BubbleMenuExtension.configure({
          element: document.createElement("div"),
        }),
        // Slash command extension
        SlashCommand.configure({
          suggestion: {
            items: ({ query, editor }: { query: string; editor: Editor }) => {
              const allItems = getSlashCommandItems();
              return allItems.filter((item) =>
                item.title.toLowerCase().startsWith(query.toLowerCase()),
              );
            },
            render: () => {
              let component: ReactRenderer<SlashCommandMenuRef> | null = null;
              let popup: TippyInstance[] | null = null;

              return {
                onStart: (props: any) => {
                  component = new ReactRenderer(SlashCommandMenu, {
                    props: {
                      ...props,
                      items: props.items,
                      editor: props.editor,
                    },
                    editor: props.editor,
                  });

                  if (!props.clientRect) {
                    return;
                  }

                  popup = tippy("body", {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: "manual",
                    placement: "bottom-start",
                  });
                },

                onUpdate(props: any) {
                  component?.updateProps({
                    ...props,
                    items: props.items,
                    editor: props.editor,
                  });

                  if (!props.clientRect) {
                    return;
                  }

                  popup?.[0]?.setProps({
                    getReferenceClientRect: props.clientRect,
                  });
                },

                onKeyDown(props: any) {
                  if (props.event.key === "Escape") {
                    popup?.[0]?.hide();
                    return true;
                  }

                  if (!component?.ref) {
                    return false;
                  }

                  return component.ref.onKeyDown(props.event);
                },

                onExit() {
                  popup?.[0]?.destroy();
                  component?.destroy();
                },
              };
            },
          },
        }),
      ],
      content,
      autofocus: autofocus ? "end" : false,
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-sm max-w-none focus:outline-none",
            "min-h-[200px] w-full",
          ),
        },
        handleKeyDown: (view, event) => {
          // Check for Cmd+Enter or Ctrl+Enter
          const isCmdOrCtrl = event.metaKey || event.ctrlKey;
          const isEnter = event.key === "Enter";

          if (isCmdOrCtrl && isEnter && onSaveRef.current) {
            // Stop the event immediately - this runs BEFORE Tiptap processes it
            event.preventDefault();
            event.stopPropagation();

            // Call save
            onSaveRef.current();

            // Return true to tell ProseMirror we handled it
            return true;
          }

          // Let other keys be handled normally
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        // Get markdown content from editor
        const markdown = getMarkdownFromEditor(editor);
        onChange(markdown);
      },
      onCreate: ({ editor }) => {
        // Editor is ready - call onReady if provided
        if (onReady) {
          onReady();
        }
      },
      // Immediate create - no async delays
      immediatelyRender: true,
    },
    // Dependency array - recreate editor when content prop changes externally
    // But only if the content is different from what's in the editor
    [],
  );

  // Update editor content when content prop changes (e.g., loading a note)
  useEffect(() => {
    if (!editor || !editor.isEditable || !editor.state?.doc) return;

    const currentMarkdown = getMarkdownFromEditor(editor);
    // Only update if the content is different to avoid cursor jumping
    if (content !== currentMarkdown && content !== "") {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  if (!editor) {
    // This should never be visible due to immediatelyRender: true
    // But keep as fallback to avoid layout shift
    return (
      <div
        className={cn(
          "min-h-[200px] w-full rounded-[var(--radius)]",
          "bg-[var(--paper)] p-4",
          className,
        )}
      />
    );
  }

  return (
    <div ref={editorContainerRef} className={cn("rich-text-editor", className)}>
      {editor && <BubbleMenuToolbar editor={editor} />}
      {editor && <TableControls editor={editor} />}
      <EditorContent editor={editor} />
      <style jsx global>{`
        /* Rich text editor styles - match the design language */
        .rich-text-editor {
          width: 100%;
        }

        .rich-text-editor .ProseMirror {
          font-family: var(--font-source-serif);
          font-size: 16px;
          line-height: 1.6;
          color: var(--ink);
          padding: 0;
          min-height: 200px;
        }

        /* Placeholder styling */
        .rich-text-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--ink-soft);
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Headings */
        .rich-text-editor .ProseMirror h1 {
          font-size: 28px;
          font-weight: 600;
          line-height: 1.3;
          margin-top: 24px;
          margin-bottom: 12px;
        }

        .rich-text-editor .ProseMirror h1:first-child {
          margin-top: 0;
        }

        .rich-text-editor .ProseMirror h2 {
          font-size: 22px;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 20px;
          margin-bottom: 10px;
        }

        .rich-text-editor .ProseMirror h2:first-child {
          margin-top: 0;
        }

        .rich-text-editor .ProseMirror h3 {
          font-size: 18px;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 16px;
          margin-bottom: 8px;
        }

        .rich-text-editor .ProseMirror h3:first-child {
          margin-top: 0;
        }

        /* Paragraphs */
        .rich-text-editor .ProseMirror p {
          margin-top: 0;
          margin-bottom: 12px;
        }

        /* Bold and italic */
        .rich-text-editor .ProseMirror strong {
          font-weight: 600;
        }

        .rich-text-editor .ProseMirror em {
          font-style: italic;
        }

        /* Lists */
        .rich-text-editor .ProseMirror ul,
        .rich-text-editor .ProseMirror ol {
          padding-left: 0;
          margin-left: 24px;
          margin-top: 8px;
          margin-bottom: 12px;
          list-style-position: outside;
        }

        .rich-text-editor .ProseMirror ul {
          list-style-type: disc;
        }

        .rich-text-editor .ProseMirror ol {
          list-style-type: decimal;
        }

        .rich-text-editor .ProseMirror li {
          margin-bottom: 4px;
          padding-left: 4px;
        }

        .rich-text-editor .ProseMirror li p {
          margin-bottom: 4px;
        }

        /* Task list / checkboxes */
        .rich-text-editor .ProseMirror ul[data-type="taskList"] {
          list-style-type: none;
          margin-left: 0;
          padding-left: 0;
        }

        .rich-text-editor .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 6px;
          padding-left: 0;
        }

        .rich-text-editor .ProseMirror ul[data-type="taskList"] li > label {
          flex: 0 0 auto;
          margin-right: 0;
          user-select: none;
          margin-top: 2px;
        }

        .rich-text-editor .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1;
        }

        .rich-text-editor
          .ProseMirror
          ul[data-type="taskList"]
          input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
          margin: 0;
          accent-color: var(--accent);
        }

        /* Links */
        .rich-text-editor .ProseMirror a,
        .rich-text-editor .ProseMirror a.editor-link {
          color: var(--accent);
          text-decoration: underline;
          cursor: pointer;
          transition: color 0.15s;
        }

        .rich-text-editor .ProseMirror a:hover,
        .rich-text-editor .ProseMirror a.editor-link:hover {
          color: var(--ink);
        }

        /* Blockquotes */
        .rich-text-editor .ProseMirror blockquote {
          border-left: 3px solid var(--line);
          padding-left: 16px;
          margin-left: 0;
          margin-top: 12px;
          margin-bottom: 12px;
          color: var(--ink-soft);
          font-style: italic;
        }

        /* Inline code */
        .rich-text-editor .ProseMirror code {
          font-family: var(--font-ibm-plex-mono);
          font-size: 14px;
          background-color: var(--paper);
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid var(--line);
        }

        /* Code blocks */
        .rich-text-editor .ProseMirror pre {
          font-family: var(--font-ibm-plex-mono);
          font-size: 14px;
          background-color: var(--paper);
          padding: 12px;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          overflow-x: auto;
          margin-top: 12px;
          margin-bottom: 12px;
        }

        .rich-text-editor .ProseMirror pre code {
          background: none;
          padding: 0;
          border: none;
          font-size: inherit;
        }

        /* Tables - the wrapper scrolls horizontally on narrow widths rather
           than forcing the whole page to reflow */
        .rich-text-editor .ProseMirror .tableWrapper {
          margin-top: 12px;
          margin-bottom: 12px;
          overflow-x: auto;
          /* Without this, some browsers fail to paint the table's content
             until a scroll event fires on this container, leaving it blank
             on first render whenever the table is wider than its wrapper. */
          transform: translateZ(0);
        }

        .rich-text-editor .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          table-layout: fixed;
        }

        .rich-text-editor .ProseMirror th,
        .rich-text-editor .ProseMirror td {
          border: 1px solid var(--line);
          padding: 6px 10px;
          text-align: left;
          vertical-align: top;
          min-width: 80px;
        }

        .rich-text-editor .ProseMirror th {
          background-color: var(--paper);
          font-weight: 600;
        }

        .rich-text-editor .ProseMirror td p,
        .rich-text-editor .ProseMirror th p {
          margin: 0;
        }

        /* Horizontal rule */
        .rich-text-editor .ProseMirror hr {
          border: none;
          border-top: 1px solid var(--line);
          margin: 24px 0;
        }

        /* Focus state */
        .rich-text-editor .ProseMirror:focus {
          outline: none;
        }

        /* Selection */
        .rich-text-editor .ProseMirror ::selection {
          background-color: var(--accent-soft);
        }
      `}</style>
    </div>
  );
}
