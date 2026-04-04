/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import styles from "./RootNode.module.scss";
import { nodeFactory } from "./node-factory";
import { InlineTextEdit } from "@/components/InlineTextEdit";
import { useCanvasDataContext } from "../CanvasDataProvider";

export const rootNodes = nodeFactory<RootNodeData>("root", RootNode, {
  forceProps: { deletable: false },
});

export type RootNodeData = {
  prompt: string;
};

function RootNode(props: NodeProps) {
  const { prompt } = props.data as RootNodeData;
  const { updateNode } = useCanvasDataContext();

  return (
    <BaseNode className={styles.node} {...props}>
      <InlineTextEdit
        className={styles.prompt}
        value={prompt}
        placeholder="What do you want to build?"
        onChange={(prompt) => {
          updateNode(props.id, { data: { prompt } });
        }}
      />
    </BaseNode>
  );
}
