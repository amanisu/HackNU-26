import { forwardRef, useState } from "react";
import { Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { XYPosition } from "@xyflow/react";
import cn from "classnames";
import styles from "./Canvas.module.scss";
import type { DatabaseReference } from "firebase/database";
import { useTldrawFirebaseSync } from "./useTldrawFirebaseSync";


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
  tldrawDocRef?: DatabaseReference;
};

export const Canvas = forwardRef<CanvasRef, Props>(
  ({ className, onEditorReady, tldrawDocRef }, ref) => {
    const [editor, setEditor] = useState<Editor | undefined>(undefined);

    useTldrawFirebaseSync(editor, tldrawDocRef);
    console.log("[Canvas] editor =", !!editor);
    console.log("[Canvas] tldrawDocRef =", tldrawDocRef?.toString());

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
      console.log("[Canvas] editor mounted");
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