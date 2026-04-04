/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Spinner, Tooltip } from "@radix-ui/themes";
import { Text } from "@radix-ui/themes/components/callout";
import { NodeProps } from "@xyflow/react";
import { BananaIcon } from "lucide-react";
import { BaseNode } from "./BaseNode";
import styles from "./ImageGenNode.module.scss";
import { nodeFactory } from "./node-factory";

export const imageGenNodes = nodeFactory<ImageGenNodeData>(
  "image-gen",
  ImageGenNode
);

export type ImageGenNodeData = {
  prompt: string;
  state: "generating" | "ready" | "error";
  imageUrl?: string;
};

function ImageGenNode(props: NodeProps) {
  const { prompt, imageUrl, state } = props.data as ImageGenNodeData;
  return (
    <BaseNode className={styles.node} {...props}>
      <div className={styles.header}>
        <BananaIcon size={16} />
        <span>Nano Banana</span>
      </div>
      <div className={styles.content}>
        {state === "generating" && (
          <>
            <Spinner />
            <Text className={styles.subtitle} color="gray">
              Generating
            </Text>
          </>
        )}
        {state === "ready" && (
          <div
            className={styles.theImage}
            style={{
              maskImage: `url(${imageUrl})`,
            }}
          />
        )}
      </div>
      <Tooltip content={prompt} delayDuration={500}>
        <div className={styles.prompt}>{prompt}</div>
      </Tooltip>
    </BaseNode>
  );
}
