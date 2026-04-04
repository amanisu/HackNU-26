/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, SegmentedControl } from "@radix-ui/themes";
import { Node } from "@tiptap/pm/model";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewProps,
} from "@tiptap/react";
import { CommandIcon, CornerDownLeftIcon } from "lucide-react";
import { useMemo } from "react";
import Preview from "./Preview";
import styles from "./CodeBlockNode.module.scss";

const getText = (node: Node) => {
  let result = "";
  node.descendants((n) => {
    if (n.type.name === "text") {
      result += n.text;
    }
  });
  return result;
};

export default ({ node, updateAttributes }: ReactNodeViewProps) => {
  const nodeText = useMemo(() => getText(node), [node]);

  return (
    <NodeViewWrapper className={styles.codeBlock}>
      <div className={styles.header} contentEditable={false}>
        <Button
          color="gray"
          variant="ghost"
          style={{ marginTop: -4 }}
          onClick={() => {
            updateAttributes({ runId: crypto.randomUUID() });
          }}
        >
          Run{" "}
          <span style={{ display: "inline-flex", gap: 2, marginLeft: 2 }}>
            <CommandIcon size={12} />
            <CornerDownLeftIcon size={12} />
          </span>
        </Button>
        <div style={{ flex: 1 }} />
        <SegmentedControl.Root size="1" value={node.attrs.language || "js"}>
          <SegmentedControl.Item
            value="js"
            onClick={() =>
              updateAttributes({
                language: "js",
              })
            }
          >
            JS
          </SegmentedControl.Item>
          <SegmentedControl.Item
            value="html"
            onClick={() =>
              updateAttributes({
                language: "html",
              })
            }
          >
            HTML
          </SegmentedControl.Item>
        </SegmentedControl.Root>
      </div>
      <pre className={styles.edit} spellCheck="false">
        <NodeViewContent />
      </pre>
      <div contentEditable={false}>
        <Preview
          input={nodeText}
          attributes={node.attrs}
          updateAttributes={updateAttributes}
        />
      </div>
    </NodeViewWrapper>
  );
};
