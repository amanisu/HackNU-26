/**
 * Canvas AI Commander
 * Uses Gemini API to understand complex voice commands and execute tools
 */

import type { Editor } from "tldraw";
import type { GoogleGenAI } from "@google/genai";
import { ToolRegistry } from "./registry";
import type { ParsedCommand } from "./voice-command-parser";

export interface AICommanderOptions {
  editor: Editor;
  registry: ToolRegistry;
  ai: GoogleGenAI;
}

export interface AICommandResult {
  success: boolean;
  command?: ParsedCommand;
  response: string;
  error?: string;
  executionResult?: any;
}

/**
 * Use AI to parse complex voice commands
 */
export async function executeAICommand(
  options: AICommanderOptions,
  userMessage: string,
): Promise<AICommandResult> {
  const { editor, registry, ai } = options;

  // Get available tools
  const tools = registry.getToolSchemas();
  const canvasOverview = getCanvasOverview(editor);
  const selection = getSelectionInfo(editor);

  const systemPrompt = `You are a canvas drawing and management AI assistant. The user can control a canvas with shapes and connections.

Available tools:
${tools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

Current canvas state:
${canvasOverview}

Current selection:
${selection}

IMPORTANT - DRAWING COMMANDS:
For requests to draw/create/make shapes, ALWAYS use create_shape tool with:
- type: "geo" (for geometric shapes)
- geo: shape type (ellipse, rectangle, triangle, star, heart, diamond, etc.)
- x, y: position (use random values like 50-350)
- width, height: 150 is good default
- color: yellow, orange, red, violet, blue, green, black, grey, white, light-violet, light-blue, light-green, light-red
- fill: "solid" for filled shapes

SHAPE MAPPINGS:
- circle/круг → geo: "ellipse"
- rectangle/прямоугольник/квадрат → geo: "rectangle"
- triangle/треугольник → geo: "triangle"
- star/звезда → geo: "star"
- heart/сердце → geo: "heart"
- diamond/ромб → geo: "diamond"
- pentagon → geo: "pentagon"
- hexagon → geo: "hexagon"

EXAMPLES:
User: "draw a red circle"
Response: {
  "understanding": "Draw a red circle on the canvas",
  "tool": "create_shape",
  "params": {
    "type": "geo",
    "geo": "ellipse",
    "x": 150,
    "y": 150,
    "width": 150,
    "height": 150,
    "color": "red",
    "fill": "solid"
  }
}

User: "нарисуй фиолетовый треугольник"
Response: {
  "understanding": "Нарисовать фиолетовый треугольник на холсте",
  "tool": "create_shape",
  "params": {
    "type": "geo",
    "geo": "triangle",
    "x": 200,
    "y": 200,
    "width": 150,
    "height": 150,
    "color": "violet",
    "fill": "solid"
  }
}

When the user gives a command:
1. Understand their intent (drawing? aligning? etc)
2. For drawing requests, ALWAYS use create_shape with proper geo value
3. For other requests, identify which tool(s) to use
4. Extract parameters needed for the tool
5. Return ONLY valid JSON with:
{
  "understanding": "Brief explanation",
  "tool": "tool_name",
  "params": { /* parameters */ }
}`;

  try {
    const response = await (ai as any).models.generateContent({
      model: "gemini-2.0-flash",
      system: systemPrompt,
      contents: userMessage,
    } as any);

    const responseText =
      response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Try to parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        response: responseText,
        error: "Could not parse AI response",
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.tool) {
      return {
        success: false,
        response: parsed.understanding || responseText,
        error: "No tool identified",
      };
    }

    // Execute the tool
    const result = await registry.executeTool(parsed.tool, parsed.params);

    return {
      success: result.success,
      command: {
        toolName: parsed.tool,
        params: parsed.params,
        confidence: 0.85,
        explanation: parsed.understanding,
      },
      response: `✓ ${parsed.understanding}`,
      executionResult: result,
    };
  } catch (error) {
    return {
      success: false,
      response: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function getCanvasOverview(editor: Editor): string {
  try {
    const shapes = (editor as any).getShapes?.() || [];
    const count = shapes.length;

    const breakdown = shapes.reduce(
      (acc: Record<string, number>, shape: any) => {
        acc[shape.type] = (acc[shape.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return `
Total shapes: ${count}
Types: ${Object.entries(breakdown)
      .map(([type, count]) => `${count} ${type}s`)
      .join(", ")}
`;
  } catch {
    return "Unable to get canvas overview";
  }
}

function getSelectionInfo(editor: Editor): string {
  try {
    const selected = (editor as any).getSelectedShapes?.() || [];
    if (selected.length === 0) {
      return "Nothing selected";
    }

    const types = selected.reduce(
      (acc: Record<string, number>, shape: any) => {
        acc[shape.type] = (acc[shape.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return `
Selected: ${selected.length} shape(s)
Types: ${Object.entries(types)
      .map(([type, count]) => `${count} ${type}`)
      .join(", ")}
`;
  } catch {
    return "Unable to get selection info";
  }
}
