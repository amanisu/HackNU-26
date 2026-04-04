/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { forwardRef, useState } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { XYPosition } from "@xyflow/react";
import cn from "classnames";
import styles from "./Canvas.module.scss";

export type CanvasRef = {
  fit: () => void;
  panTo: (...positions: XYPosition[]) => void;
  pointAtCenter: () => XYPosition;
  captureScreenshot: () => Promise<string>;
  editor: Editor | undefined;
};

type Props = {
  className?: string;
  onEditorReady?: (editor: Editor) => void;
};

export const Canvas = forwardRef<CanvasRef, Props>(
  ({ className, onEditorReady }, ref) => {
    const [editor, setEditor] = useState<Editor | undefined>(undefined);

    // Set ref methods (can be no-op as tldraw handles these internally)
    if (ref && typeof ref !== "function") {
      ref.current = {
        fit: () => editor?.zoomToFit(),
        panTo: () => {},
        pointAtCenter: () => ({ x: 0, y: 0 }),
        captureScreenshot: async () => "data:image/png;base64,",
        editor,
      };
    }

    const handleEditorReady = (editor: Editor) => {
      setEditor(editor);
      onEditorReady?.(editor);
    };

    return (
      <div
        className={cn(styles.canvas, className)}
        style={{ position: "fixed", inset: 0 }}
      >
        <Tldraw onMount={handleEditorReady} />
      </div>
    );
  },
);

Canvas.displayName = "Canvas";
