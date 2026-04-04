/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import GeminiIcon from "@/icons/GeminiIcon";
import { Editor, Extension, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";
import {
  Code,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Text,
} from "lucide-react";
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import tippy from "tippy.js";
import { InlineMenuItem, InlineMenuPopup } from "../InlineMenu";
import { NotebookContext } from "../Notebook";
import { generateEntitySpec } from "../spec-generator";

interface CommandItem {
  title: string;
  description: string;
  searchTerms?: string[];
  icon: ReactNode;
  command: (props: CommandProps) => void;
}

interface CommandProps {
  editor: Editor;
  range: Range;
  notebookContext: NotebookContext;
}

interface CommandListProps {
  items: CommandItem[];
  command: any;
  editor: any;
  range: any;
  setCommitHandler: (handler: Function) => void;
}

const Command = Extension.create({
  name: "slash-command",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        allow: ({ state: { selection } }) =>
          selection?.$anchor?.parent?.type?.name === "paragraph",
      } satisfies Partial<SuggestionOptions>,
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

const getSuggestionItems = ({ query }: { query: string }) => {
  let items: CommandItem[] = [
    {
      title: "Generate spec",
      description: "Ask Gemini to generate a spec",
      searchTerms: ["ai", "generate"],
      icon: <GeminiIcon size={18} />,
      command: async ({ editor, range, notebookContext }) => {
        let { entity, ai } = notebookContext;
        if (!entity) {
          console.warn("No entity");
          return;
        }
        let loaderText = "Generating...";
        let loaderRange = {
          from: range.from,
          to: range.from + loaderText.length,
        };
        editor
          .chain()
          .insertContentAt(range, loaderText)
          .setTextSelection(loaderRange)
          .run();
        await new Promise((resolve) => setTimeout(resolve, 1000));
        let spec = await generateEntitySpec(ai, { entity });
        editor.chain().deleteRange(loaderRange).run();
        editor.chain().insertContentAt(range, spec).run();
      },
    },
    {
      title: "Execute code",
      description: "Execute Javascript or TypeScript.",
      searchTerms: [
        "javascript",
        "js",
        "ts",
        "typescript",
        "execute",
        "code",
        "codeblock",
      ],
      icon: <Code size={18} />,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: "Text",
      description: "Just start typing with plain text.",
      searchTerms: ["p", "paragraph"],
      icon: <Text size={18} />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleNode("paragraph", "paragraph")
          .run();
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading.",
      searchTerms: ["subtitle", "medium"],
      icon: <Heading2 size={18} />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 2 })
          .run();
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading.",
      searchTerms: ["subtitle", "small"],
      icon: <Heading3 size={18} />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 3 })
          .run();
      },
    },
    {
      title: "Bullet List",
      description: "Create a simple bullet list.",
      searchTerms: ["unordered", "point"],
      icon: <List size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered List",
      description: "Create a list with numbering.",
      searchTerms: ["ordered"],
      icon: <ListOrdered size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
  ];
  return items.filter((item) => {
    if (typeof query === "string" && query.length > 0) {
      const search = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        (item.searchTerms &&
          item.searchTerms.some((term: string) => term.includes(search)))
      );
    }
    return true;
  });
};

export const updateScrollView = (container: HTMLElement, item: HTMLElement) => {
  const containerHeight = container.offsetHeight;
  const itemHeight = item ? item.offsetHeight : 0;

  const top = item.offsetTop;
  const bottom = top + itemHeight;

  if (top < container.scrollTop) {
    container.scrollTop -= container.scrollTop - top + 5;
  } else if (bottom > containerHeight + container.scrollTop) {
    container.scrollTop += bottom - containerHeight - container.scrollTop + 5;
  }
};

const CommandList = ({
  items,
  command,
  editor,
  range,
  setCommitHandler,
}: CommandListProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const notebookContext = useContext(NotebookContext);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      item?.command?.({ editor, range, notebookContext });
    },
    [command, editor, items, notebookContext]
  );

  useEffect(() => {
    setCommitHandler?.(() => selectItem(selectedIndex));
  }, [setCommitHandler, selectedIndex]);

  useEffect(() => {
    const abort = new AbortController();
    document.addEventListener(
      "keydown",
      (ev) => {
        if (ev.key === "ArrowUp") {
          ev.preventDefault();
          setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        } else if (ev.key === "ArrowDown") {
          ev.preventDefault();
          setSelectedIndex((selectedIndex + 1) % items.length);
        }
      },
      abort
    );
    return () => abort.abort();
  }, [items, selectedIndex, setSelectedIndex, selectItem]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const commandListContainer = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = commandListContainer?.current;
    const item = container?.children[selectedIndex] as HTMLElement;
    if (item && container) updateScrollView(container, item);
  }, [selectedIndex]);

  return items.length > 0 ? (
    <InlineMenuPopup ref={commandListContainer}>
      {items.map((item: CommandItem, index: number) => (
        <InlineMenuItem
          selected={index === selectedIndex}
          key={index}
          onMouseEnter={() => setSelectedIndex(index)}
          onClick={() => selectItem(index)}
          icon={item.icon}
          description={item.description}
        >
          {item.title}
        </InlineMenuItem>
      ))}
    </InlineMenuPopup>
  ) : null;
};

const renderItems = () => {
  let component: ReactRenderer | null = null;
  let popup: any | null = null;
  let commitHandler: Function | null = null;

  return {
    onStart: (props) => {
      component = new ReactRenderer(CommandList, {
        props: {
          ...props,
          setCommitHandler: (h: Function) => (commitHandler = h),
        } satisfies CommandListProps,
        editor: props.editor,
      });

      // @ts-ignore
      popup = tippy("body", {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.querySelector(".radix-themes"),
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      });
    },
    onUpdate: (props) => {
      component?.updateProps({
        ...props,
        setCommitHandler: (h: Function) => (commitHandler = h),
      });

      popup &&
        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
    },
    onKeyDown: ({ event }) => {
      if (event.key === "Escape") {
        popup?.[0].hide();
        return true;
      } else if (event.key === "Enter" && commitHandler) {
        commitHandler();
        return true;
      }

      // @ts-ignore
      return component?.ref?.onKeyDown(props);
    },
    onExit: () => {
      popup?.[0].destroy();
      component?.destroy();
    },
  } satisfies ReturnType<NonNullable<SuggestionOptions["render"]>>;
};

const SlashCommand = Command.configure({
  suggestion: {
    items: getSuggestionItems,
    render: renderItems,
  },
});

export default SlashCommand;
