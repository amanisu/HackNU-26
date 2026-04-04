/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useGeminiApi } from "@/ai";
import {
  type CanvasDataContext,
  useCanvasDataContext,
} from "@/canvas/CanvasDataProvider";
import { EntityNodeData } from "@/canvas/nodes/EntityNode";
import { debounce } from "@/util/debounce";
import { GoogleGenAI } from "@google/genai";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import cn from "classnames";
import js from "highlight.js/lib/languages/javascript";
import xml from "highlight.js/lib/languages/xml";
import { lowlight } from "lowlight";
import { createContext, useEffect, useMemo, useRef } from "react";
import { Markdown, MarkdownStorage } from "tiptap-markdown";
import CodeBlockNode from "./block/CodeBlockNode";
import SlashCommand from "./editor/SlashCommand";
import { makeMentionsExtension } from "./mentions/mentions";
import styles from "./Notebook.module.scss";

lowlight.registerLanguage("js", js);
lowlight.registerLanguage("html", xml);

export type NotebookContext = {
  ai: GoogleGenAI;
  entity?: EntityNodeData;
};

export const NotebookContext = createContext<NotebookContext>({} as any);

const extensions = [
  Markdown,
  StarterKit.configure({
    bulletList: {
      HTMLAttributes: {
        class: "-mt-2",
      },
    },
    orderedList: {
      HTMLAttributes: {
        class: "-mt-2",
      },
    },
    listItem: {
      HTMLAttributes: {
        class: "-mb-2",
      },
    },
    code: {
      HTMLAttributes: {
        spellcheck: "false",
      },
    },
    codeBlock: false,
    dropcursor: {
      color: "#DBEAFE",
      width: 4,
    },
    gapcursor: false,
  }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "heading") {
        return "Untitled notebook";
      } else if (node.type.name === "paragraph") {
        return "Press '/' for commands, '@' to mention, or start typing...";
      }
      return "";
    },
  }),
  CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockNode);
    },
    addKeyboardShortcuts() {
      return {
        "Mod-Enter": () => {
          this.editor.commands.updateAttributes(this.name, {
            runId: crypto.randomUUID(),
          });
          return true;
        },
      };
    },
    addAttributes() {
      return {
        ...this.parent?.(), // includes language
        result: {
          default: null,
        },
        runId: {
          default: null,
        },
      };
    },
  }).configure({ lowlight, defaultLanguage: "js" }),
  Highlight,
  Typography,
  SlashCommand,
];

declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

export function Notebook({
  content,
  onUpdate,
  entity,
  className,
}: {
  content: string;
  className?: string;
  entity?: EntityNodeData;
  onUpdate?: (markdown: string) => void;
}) {
  let canvasDataContext = useCanvasDataContext();
  let canvasDataContextRef = useRef<CanvasDataContext>(canvasDataContext);
  let ai = useGeminiApi();

  useEffect(() => {
    canvasDataContextRef.current = canvasDataContext;
  }, [canvasDataContext]);

  const editor = useEditor({
    extensions: [
      ...extensions,
      makeMentionsExtension({ canvasDataContextRef }),
    ],
    content,
    onUpdate: debounce(() => {
      const markdownOutput = editor.storage?.markdown.getMarkdown();
      onUpdate?.(markdownOutput);
    }),
    autofocus: !content ? "start" : false,
  });

  useEffect(() => {
    if (editor && content === "<p></p><p></p><p></p>") {
      editor.commands.focus();
    }
  }, [editor, content]);

  const notebookContext = useMemo(
    () => ({ entity, ai }) satisfies NotebookContext,
    [entity, ai],
  );

  return (
    <NotebookContext.Provider value={notebookContext}>
      <div className={cn(styles.notebook, className)}>
        <EditorContent editor={editor} />
      </div>
    </NotebookContext.Provider>
  );
}
