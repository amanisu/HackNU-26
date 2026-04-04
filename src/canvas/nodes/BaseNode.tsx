/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Handle, NodeProps, Position } from "@xyflow/react";
import cn from "classnames";
import { memo, PropsWithChildren } from "react";
import styles from "./BaseNode.module.scss";

export const BaseNode = memo(
  ({
    children,
    className,
    selected,
    isConnectable,
    onDoubleClick,
  }: PropsWithChildren<
    NodeProps &
      Pick<React.HTMLAttributes<HTMLDivElement>, "className" | "onDoubleClick">
  >) => {
    return (
      <div
        onDoubleClick={onDoubleClick}
        onContextMenu={(ev) => {
          ev.preventDefault();
          onDoubleClick?.(ev);
        }}
        className={cn(className, styles.node, {
          [styles.isSelected]: selected,
        })}
      >
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
        />
        {children}
      </div>
    );
  }
);
