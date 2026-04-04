/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EdgeProps, getBezierPath, useInternalNode } from "@xyflow/react";
import { getEdgeParams } from "./floating-edge-util";

function FloatingEdge({ id, source, target, markerEnd, style }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode
  );

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
  });

  return (
    <g id={id} className="react-flow__edge-path">
      <path d={edgePath} markerEnd={markerEnd} style={style} />
      <path d={edgePath} className="touch-area" />
    </g>
  );
}

export default FloatingEdge;
