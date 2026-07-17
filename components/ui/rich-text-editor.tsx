"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import { Markdown } from "tiptap-markdown";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";
import { Extension } from "@tiptap/core";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { cn } from "@/lib/utils";
import {
  SlashCommandMenu,
  SlashCommandItem,
  SlashCommandMenuRef,
} from "./slash-command-menu";
import { BubbleMenuToolbar } from "./bubble-menu-toolbar";

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
const getSlashCommandItems = (editor: Editor): SlashCommandItem[] => [
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

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          // Configure heading levels (only h1, h2, h3)
          heading: {
            levels: [1, 2, 3],
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
              const allItems = getSlashCommandItems(editor);
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
          // Handle Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) to trigger save
          if (
            onSave &&
            (event.metaKey || event.ctrlKey) &&
            event.key === "Enter"
          ) {
            event.preventDefault();
            onSave();
            return true;
          }
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
