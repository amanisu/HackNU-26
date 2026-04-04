/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConnectionLineComponentProps,
  getBezierPath,
  InternalNode,
} from "@xyflow/react";
import { getEdgeParams } from "./floating-edge-util";

function FloatingConnectionLine({
  toX,
  toY,
  fromPosition,
  toPosition,
  fromNode,
}: ConnectionLineComponentProps) {
  if (!fromNode) {
    return null;
  }

  // Create a mock target node at the cursor position
  const targetNode: InternalNode = {
    id: "connection-target",
    measured: {
      width: 1,
      height: 1,
    },
    position: { x: 0, y: 0 },
    data: {},
    internals: {
      positionAbsolute: { x: toX, y: toY },
      z: 0,
      userNode: {} as any,
    },
  };

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    fromNode,
    targetNode
  );

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos || fromPosition,
    targetPosition: targetPos || toPosition,
    targetX: tx || toX,
    targetY: ty || toY,
  });

  return (
    <g>
      <path
        fill="none"
        stroke="#fff"
        strokeDasharray={"10 10"}
        strokeWidth={1.5}
        className="animated"
        d={edgePath}
      />
      <circle
        cx={tx || toX}
        cy={ty || toY}
        fill="#000"
        stroke="#fff"
        r={3}
        strokeWidth={1.5}
      />
    </g>
  );
}

export default FloatingConnectionLine;
