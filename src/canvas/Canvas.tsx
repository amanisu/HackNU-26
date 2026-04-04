/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { forwardRef } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { XYPosition } from "@xyflow/react";
import cn from "classnames";
import styles from "./Canvas.module.scss";

export type CanvasRef = {
  fit: () => void;
  panTo: (...positions: XYPosition[]) => void;
  pointAtCenter: () => XYPosition;
  captureScreenshot: () => Promise<string>;
};

type Props = { className?: string };

export const Canvas = forwardRef<CanvasRef, Props>(({ className }, ref) => {
  // Set ref methods (can be no-op as tldraw handles these internally)
  if (ref && typeof ref !== "function") {
    ref.current = {
      fit: () => {},
      panTo: () => {},
      pointAtCenter: () => ({ x: 0, y: 0 }),
      captureScreenshot: async () => "data:image/png;base64,",
    };
  }

  return (
    <div
      className={cn(styles.canvas, className)}
      style={{ position: "fixed", inset: 0 }}
    >
      <Tldraw />
    </div>
  );
});

Canvas.displayName = "Canvas";
