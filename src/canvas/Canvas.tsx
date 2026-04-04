/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { forwardRef, useImperativeHandle } from "react";
import { Tldraw, useEditor } from "tldraw";
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

function CanvasInner({ className }: Props, ref: any) {
  const editor = useEditor();

  useImperativeHandle(
    ref,
    () => ({
      fit: () => {
        editor?.zoomToFit();
      },
      panTo: (...positions: XYPosition[]) => {
        if (positions.length > 0) {
          const pos = positions[0];
          editor?.setCamera({ x: pos.x, y: pos.y, z: 1 });
        }
      },
      pointAtCenter: () => {
        const camera = editor?.getCamera();
        return { x: camera?.x ?? 0, y: camera?.y ?? 0 };
      },
      captureScreenshot: async () => {
        try {
          // Capture the current canvas viewport as PNG
          const canvas = document.querySelector(
            '[data-testid="canvas"]',
          ) as HTMLCanvasElement | null;
          if (canvas) {
            return canvas.toDataURL("image/png");
          }
          return "data:image/png;base64,";
        } catch (e) {
          return "data:image/png;base64,";
        }
      },
    }),
    [editor],
  );

  return (
    <div
      className={cn(styles.canvas, className)}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%" }}
    />
  );
}

const CanvasInnerComponent = forwardRef<CanvasRef, Props>(CanvasInner);

export const Canvas = forwardRef<CanvasRef, Props>(({ className }, ref) => {
  return (
    <Tldraw autoFocus persistenceKey="product-canvas-tldraw">
      <CanvasInnerComponent className={className} ref={ref} />
    </Tldraw>
  );
});

Canvas.displayName = "Canvas";
