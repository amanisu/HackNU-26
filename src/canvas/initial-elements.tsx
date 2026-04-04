/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Edge, Node } from "@xyflow/react";
import { rootNodes } from "./nodes/RootNode";

export function initialElements() {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push(
    rootNodes.make({
      id: "root",
      data: { prompt: "" },
      deletable: false,
      position: { x: 0, y: 0 },
    }),
  );

  return { nodes, edges };
}
