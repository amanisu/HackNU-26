/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { type CanvasDataContext } from "@/canvas/CanvasDataProvider";
import { ENTITY_TYPE_META, EntityNodeData } from "@/canvas/nodes/EntityNode";
import { computePosition, flip, shift } from "@floating-ui/dom";
import Mention, { MentionOptions } from "@tiptap/extension-mention";
import { Editor, posToDOMRect, ReactRenderer } from "@tiptap/react";
import { SuggestionProps } from "@tiptap/suggestion";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { InlineMenu, InlineMenuProps, InlineMenuRef } from "../InlineMenu";
import "./mentions.scss";

type MentionRender = ReturnType<
  NonNullable<MentionOptions<NotebookMenuItem>["suggestions"][number]["render"]>
>;

const updatePosition = (editor: Editor, element: HTMLElement) => {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(
        editor.view,
        editor.state.selection.from,
        editor.state.selection.to
      ),
  };

  computePosition(virtualElement, element, {
    placement: "bottom-start",
    strategy: "absolute",
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.width = "max-content";
    element.style.position = strategy;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  });
};

type NotebookMentionsConfig = {
  canvasDataContextRef: React.MutableRefObject<CanvasDataContext>;
};

type NotebookMenuItem = EntityNodeData & { id: string };

const ENTITY_ICON_SVG_CACHE: Record<string, string> = {};

export const makeMentionsExtension = ({
  canvasDataContextRef,
}: NotebookMentionsConfig) => {
  return Mention.configure({
    renderHTML({ node }) {
      let canvasNode = canvasDataContextRef.current.nodes.find(
        (n) => n.id === node.attrs.id
      );
      const entity = canvasNode?.data as EntityNodeData | undefined;

      let iconSvg = ENTITY_ICON_SVG_CACHE[entity?.type || ""];
      if (!iconSvg && entity?.type) {
        let lucideIcon = ENTITY_TYPE_META[entity.type]?.icon;
        if (lucideIcon) {
          iconSvg = ReactDOMServer.renderToString(
            React.createElement(lucideIcon)
          );
          ENTITY_ICON_SVG_CACHE[entity.type] = iconSvg;
        }
      }

      let span = document.createElement("span");
      span.className = "mention";
      span.dataset.type = "mention";
      span.dataset.id = node.attrs.id;
      span.dataset.label = entity?.title || "Unknown entity";
      if (iconSvg) {
        let icon = document.createElement("span");
        icon.className = "mention-icon";
        icon.innerHTML = iconSvg + "&nbsp;"; // keep the icon from showing up on its own
        span.appendChild(icon);
      }
      span.appendChild(
        document.createTextNode(entity?.title || "Unknown entity")
      );
      return span;
    },
    suggestions: [
      {
        items: ({ query }: { query: string }) => {
          let entities = canvasDataContextRef.current.nodes.filter(
            (node) => node.type === "entity"
          );
          return entities
            .map((n) => ({ ...(n.data as EntityNodeData), id: n.id }))
            .filter((item) =>
              item.title.toLowerCase().startsWith(query.toLowerCase())
            )
            .slice(0, 5);
        },
        render: () => {
          let component: ReactRenderer<InlineMenuRef, InlineMenuProps>;

          let propsToInlineMenuProps = (
            props: SuggestionProps<NotebookMenuItem>
          ): InlineMenuProps => ({
            items: props.items.map((item) => ({
              id: item.id,
              title: item.title,
              description: ENTITY_TYPE_META[item.type]?.label,
              icon: ENTITY_TYPE_META[item.type]?.icon,
            })),
            command: props.command,
          });

          return {
            onStart: (props) => {
              component = new ReactRenderer<InlineMenuRef, InlineMenuProps>(
                InlineMenu,
                {
                  props: propsToInlineMenuProps(props),
                  editor: props.editor,
                }
              );
              if (!props.clientRect) return;
              component.element.style.position = "absolute";
              document
                .querySelector(".radix-themes")!
                .appendChild(component.element);
              updatePosition(props.editor, component.element);
            },
            onUpdate(props) {
              component.updateProps(propsToInlineMenuProps(props));
              if (!props.clientRect) return;
              updatePosition(props.editor, component.element);
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                component.destroy();
                return true;
              }
              return component.ref?.onKeyDown(props) || false;
            },
            onExit: () => component?.destroy(),
          } satisfies MentionRender;
        },
      },
    ] satisfies MentionOptions<NotebookMenuItem>["suggestions"],
  });
};
