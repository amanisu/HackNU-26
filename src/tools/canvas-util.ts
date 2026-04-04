/**
 * Canvas Utility Functions
 * Extract and analyze canvas state for AI understanding
 */

import type { Editor, TLShape } from "tldraw";

export interface CanvasElement {
  id: string;
  type: string;
  geo?: string;
  color?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasState {
  elements: CanvasElement[];
  elementCount: number;
  description: string;
}

/**
 * Extract current canvas state for AI context
 */
export function getCanvasState(editor: Editor): CanvasState {
  try {
    // Get all shapes on current page
    const shapes = editor.getCurrentPageShapesSorted();

    const elements: CanvasElement[] = shapes
      .filter((shape: TLShape) => shape.type !== "frame") // Exclude frames for clarity
      .slice(0, 50) // Limit to 50 shapes for token efficiency
      .map((shape: TLShape) => ({
        id: shape.id,
        type: shape.type,
        geo: (shape.props as any)?.geo,
        color: (shape.props as any)?.color,
        text: (shape.props as any)?.text
          ? extractPlainText((shape.props as any).text)
          : undefined,
        x: Math.round(shape.x),
        y: Math.round(shape.y),
        width: Math.round((shape.props as any)?.w || 100),
        height: Math.round((shape.props as any)?.h || 100),
      }));

    // Generate human-readable description
    const description = generateCanvasDescription(elements);

    return {
      elements,
      elementCount: shapes.length,
      description,
    };
  } catch (error) {
    console.error("Failed to get canvas state:", error);
    return {
      elements: [],
      elementCount: 0,
      description: "Canvas is empty or inaccessible",
    };
  }
}

/**
 * Extract plain text from tldraw richText format
 */
function extractPlainText(richText: any): string {
  if (typeof richText === "string") return richText;
  if (!richText || typeof richText !== "object") return "";

  try {
    if (richText.type === "doc" && richText.content) {
      return richText.content
        .map((para: any) => {
          if (para.type === "paragraph" && para.content) {
            return para.content.map((item: any) => item.text || "").join("");
          }
          return "";
        })
        .join(" ");
    }
  } catch {
    return "";
  }

  return "";
}

/**
 * Generate human-readable canvas description for AI
 */
function generateCanvasDescription(elements: CanvasElement[]): string {
  if (elements.length === 0) {
    return "Canvas is empty";
  }

  const grouped = groupByType(elements);
  const descriptions: string[] = [];

  for (const [type, items] of Object.entries(grouped)) {
    if (items.length === 1) {
      const item = items[0];
      descriptions.push(
        `1 ${type} (${item.color || "black"})${item.text ? ` saying "${item.text}"` : ""}`,
      );
    } else {
      const colors = [...new Set(items.map((i) => i.color || "black"))];
      descriptions.push(`${items.length} ${type}s (${colors.join(", ")})`);
    }
  }

  return `Canvas has ${elements.length} shapes: ${descriptions.join(", ")}`;
}

/**
 * Group shapes by type
 */
function groupByType(
  elements: CanvasElement[],
): Record<string, CanvasElement[]> {
  return elements.reduce(
    (acc, el) => {
      const key = el.geo || el.type;
      acc[key] = acc[key] || [];
      acc[key].push(el);
      return acc;
    },
    {} as Record<string, CanvasElement[]>,
  );
}

/**
 * Get selected shapes info
 */
export function getSelectedShapesInfo(editor: Editor): string {
  try {
    const selected = editor.getSelectedShapeIds();
    if (selected.length === 0) {
      return "No shapes selected";
    }

    const shapes = selected
      .map((id) => editor.getShape(id))
      .filter(Boolean) as TLShape[];

    const info = shapes
      .map((shape: TLShape) => {
        const text = (shape.props as any)?.text
          ? extractPlainText((shape.props as any).text)
          : "(no text)";
        return `${(shape.props as any)?.geo || shape.type} (${(shape.props as any)?.color || "black"}) ${text}`;
      })
      .join(", ");

    return `${selected.length} shape(s) selected: ${info}`;
  } catch (error) {
    return "Unable to get selection info";
  }
}
