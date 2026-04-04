/**
 * Voice Command Parser for Canvas Management
 * Converts natural language voice commands to tool executions
 */

import type { Editor } from "tldraw";
import type { ToolResult } from "./types";
import { ToolRegistry } from "./registry";

export interface VoiceCommandContext {
  editor: Editor;
  registry: ToolRegistry;
  lastSelection?: string[];
  currentZoom?: number;
}

export interface ParsedCommand {
  toolName: string;
  params: Record<string, unknown>;
  confidence: number;
  explanation: string;
}

export interface VoiceCommandResult extends ToolResult {
  commandText: string;
  parsedCommand?: ParsedCommand;
}

/**
 * Parse voice command from text and execute it
 */
export async function executeVoiceCommand(
  context: VoiceCommandContext,
  commandText: string,
): Promise<VoiceCommandResult> {
  if (!commandText?.trim()) {
    return {
      success: false,
      error: "Empty command",
      commandText: "",
    };
  }

  const normalizedCommand = commandText.toLowerCase().trim();

  try {
    // Quick command patterns for common operations
    const quickCommand = matchQuickCommand(normalizedCommand, context);
    if (quickCommand) {
      const result = await context.registry.executeTool(
        quickCommand.toolName,
        quickCommand.params,
      );
      return {
        ...result,
        commandText,
        parsedCommand: quickCommand,
      };
    }

    // If no quick match, return error
    return {
      success: false,
      error: `Command not understood: "${commandText}"`,
      commandText,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error executing command: ${error instanceof Error ? error.message : "Unknown error"}`,
      commandText,
    };
  }
}

/**
 * Match quick command patterns (without AI)
 * Used for common, predictable operations
 */
function matchQuickCommand(
  command: string,
  context: VoiceCommandContext,
): ParsedCommand | null {
  const patterns: Array<{
    regex: RegExp;
    build: (
      match: RegExpMatchArray,
      context: VoiceCommandContext,
    ) => ParsedCommand | null;
  }> = [
    // Alignment commands
    {
      regex: /(?:align|выровн).*(?:left|левый|влево)/i,
      build: () => buildAlignmentCommand("left", context),
    },
    {
      regex: /(?:align|выровн).*(?:right|правый|вправо)/i,
      build: () => buildAlignmentCommand("right", context),
    },
    {
      regex: /(?:align|выровн).*(?:top|верх|вверх)/i,
      build: () => buildAlignmentCommand("top", context),
    },
    {
      regex: /(?:align|выровн).*(?:bottom|низ|вниз)/i,
      build: () => buildAlignmentCommand("bottom", context),
    },
    {
      regex: /(?:align|выровн).*(?:center|centre|середин|центр)/i,
      build: (match) => {
        if (/(horizontal|горизонт)/.test(match[0])) {
          return buildAlignmentCommand("center-horizontal", context);
        }
        if (/(vertical|верт)/.test(match[0])) {
          return buildAlignmentCommand("center-vertical", context);
        }
        return buildAlignmentCommand("center-horizontal", context);
      },
    },

    // Distribution commands
    {
      regex: /(?:distribute|распред).*(?:horizontal|горизонт)/i,
      build: () => buildDistributionCommand("horizontal", context),
    },
    {
      regex: /(?:distribute|распред).*(?:vertical|верт)/i,
      build: () => buildDistributionCommand("vertical", context),
    },

    // Group/Ungroup
    {
      regex: /(?:group|группиров)/i,
      build: () => buildGroupCommand(context),
    },
    {
      regex: /(?:ungroup|разгруппиров|распутать)/i,
      build: () => buildUngroupCommand(context),
    },

    // Delete
    {
      regex: /(?:delete|удали|remove|убей|стереть)/i,
      build: () => buildDeleteCommand(context),
    },

    // Undo/Redo
    {
      regex: /(?:undo|отмен|назад)/i,
      build: () => ({
        toolName: "undo",
        params: {},
        confidence: 0.95,
        explanation: "Undo last action",
      }),
    },
    {
      regex: /(?:redo|повтор|вперед)/i,
      build: () => ({
        toolName: "redo",
        params: {},
        confidence: 0.95,
        explanation: "Redo",
      }),
    },

    // Zoom
    {
      regex: /(?:zoom|масштаб).*(?:in|in|приблиз)/i,
      build: () => ({
        toolName: "zoom_to_content",
        params: { level: 1.2 },
        confidence: 0.9,
        explanation: "Zoom in",
      }),
    },
    {
      regex: /(?:zoom|масштаб).*(?:out|out|отдали)/i,
      build: () => ({
        toolName: "zoom_to_content",
        params: { level: 0.8 },
        confidence: 0.9,
        explanation: "Zoom out",
      }),
    },
    {
      regex: /(?:zoom|масштаб).*(?:fit|content|контент|подогнать)/i,
      build: () => ({
        toolName: "zoom_to_content",
        params: {},
        confidence: 0.9,
        explanation: "Zoom to fit content",
      }),
    },

    // Canvas overview
    {
      regex: /(?:overview|обзор|что здесь|show me|покажи)/i,
      build: () => ({
        toolName: "get_canvas_overview",
        params: {},
        confidence: 0.9,
        explanation: "Get canvas overview",
      }),
    },

    // Get selection
    {
      regex: /(?:show selection|выбранное|what.*selected|что выбран)/i,
      build: () => ({
        toolName: "get_selection",
        params: {},
        confidence: 0.9,
        explanation: "Show current selection",
      }),
    },

    // Screenshot
    {
      regex: /(?:screenshot|снимок|capture|захват)/i,
      build: () => ({
        toolName: "capture_screenshot",
        params: {},
        confidence: 0.9,
        explanation: "Capture screenshot",
      }),
    },

    // Drawing commands - COLOR + SHAPE patterns (MUST BE FIRST to extract colors properly)
    {
      regex:
        /(?:draw|рисуй|нарисуй|create).*(?:red|красн).*(?:circle|круг|окружность)/i,
      build: () => buildDrawCommand("ellipse", "red", context),
    },
    {
      regex:
        /(?:draw|рисуй|нарисуй|create).*(?:red|красн).*(?:rectangle|прямоугольник|квадрат|box)/i,
      build: () => buildDrawCommand("rectangle", "red", context),
    },
    {
      regex:
        /(?:draw|рисуй|нарисуй|create).*(?:red|красн).*(?:triangle|треугольник)/i,
      build: () => buildDrawCommand("triangle", "red", context),
    },
    {
      regex: /(?:draw|рисуй|нарисуй|create).*(?:red|красн).*(?:star|звезда)/i,
      build: () => buildDrawCommand("star", "red", context),
    },
    {
      regex: /(?:draw|рисуй|нарисуй|create).*(?:red|красн).*(?:heart|сердце)/i,
      build: () => buildDrawCommand("heart", "red", context),
    },

    {
      regex:
        /(?:draw|рисуй|нарисуй|create).*(?:blue|голубой|синий).*(?:circle|круг|окружность)/i,
      build: () => buildDrawCommand("ellipse", "blue", context),
    },
    {
      regex:
        /(?:draw|рисуй|нарисуй|create).*(?:blue|голубой|синий).*(?:rectangle|прямоугольник|квадрат|box)/i,
      build: () => buildDrawCommand("rectangle", "blue", context),
    },
    {
      regex:
        /(?:draw|рисуй|нарисуй|create).*(?:blue|голубой|синий).*(?:triangle|треугольник)/i,
      build: () => buildDrawCommand("triangle", "blue", context),
    },

    {
      regex: /(?:draw|рисуй|нарисуй|create).*(?:green|зелёный|зеленый)/i,
      build: (match) => {
        if (/(circle|круг)/.test(match[0]))
          return buildDrawCommand("ellipse", "green", context);
        if (/(triangle|треугольник)/.test(match[0]))
          return buildDrawCommand("triangle", "green", context);
        if (/(star|звезда)/.test(match[0]))
          return buildDrawCommand("star", "green", context);
        return buildDrawCommand("rectangle", "green", context);
      },
    },

    {
      regex: /(?:draw|рисуй|нарисуй|create).*(?:yellow|жёлт|жёлт)/i,
      build: (match) => {
        if (/(circle|круг)/.test(match[0]))
          return buildDrawCommand("ellipse", "yellow", context);
        if (/(triangle|треугольник)/.test(match[0]))
          return buildDrawCommand("triangle", "yellow", context);
        if (/(star|звезда)/.test(match[0]))
          return buildDrawCommand("star", "yellow", context);
        return buildDrawCommand("rectangle", "yellow", context);
      },
    },

    {
      regex: /(?:draw|рисуй|нарисуй|create).*(?:violet|фиолет|purple|пурпур)/i,
      build: (match) => {
        if (/(circle|круг|окружность)/.test(match[0]))
          return buildDrawCommand("ellipse", "violet", context);
        if (/(triangle|треугольник)/.test(match[0]))
          return buildDrawCommand("triangle", "violet", context);
        if (/(star|звезда)/.test(match[0]))
          return buildDrawCommand("star", "violet", context);
        if (/(heart|сердце)/.test(match[0]))
          return buildDrawCommand("heart", "violet", context);
        return buildDrawCommand("rectangle", "violet", context);
      },
    },

    {
      regex: /(?:draw|рисуй|нарисуй|create).*(?:orange|оранжев)/i,
      build: (match) => {
        if (/(circle|круг)/.test(match[0]))
          return buildDrawCommand("ellipse", "orange", context);
        if (/(triangle|треугольник)/.test(match[0]))
          return buildDrawCommand("triangle", "orange", context);
        return buildDrawCommand("rectangle", "orange", context);
      },
    },

    {
      regex:
        /(?:draw|рисуй|нарисуй|create).*(?:black|чёрн|черн|grey|gray|серый|сер)/i,
      build: (match) => {
        if (/(circle|круг)/.test(match[0]))
          return buildDrawCommand("ellipse", "black", context);
        if (/(triangle|треугольник)/.test(match[0]))
          return buildDrawCommand("triangle", "black", context);
        return buildDrawCommand("rectangle", "black", context);
      },
    },

    // Drawing commands - Simple shapes WITHOUT colors (fallback)
    {
      regex: /(?:draw|рисуй|нарисуй).*(?:circle|круг|окружность)/i,
      build: () => buildDrawCommand("ellipse", "black", context),
    },
    {
      regex: /(?:draw|рисуй|нарисуй).*(?:rectangle|прямоугольник|квадрат|box)/i,
      build: () => buildDrawCommand("rectangle", "black", context),
    },
    {
      regex: /(?:draw|рисуй|нарисуй).*(?:triangle|треугольник)/i,
      build: () => buildDrawCommand("triangle", "black", context),
    },
    {
      regex: /(?:draw|рисуй|нарисуй).*(?:star|звезда)/i,
      build: () => buildDrawCommand("star", "black", context),
    },
  ];

  for (const pattern of patterns) {
    const match = pattern.regex.exec(command);
    if (match) {
      const result = pattern.build(match, context);
      if (result) return result;
    }
  }

  return null;
}

function buildDrawCommand(
  shapeType: string,
  color: string,
  context: VoiceCommandContext,
): ParsedCommand {
  // Get random position in canvas (visually better UX)
  const x = Math.random() * 300 + 50;
  const y = Math.random() * 300 + 50;

  return {
    toolName: "create_shape",
    params: {
      type: "geo",
      geo: shapeType,
      x,
      y,
      width: 150,
      height: 150,
      color: color,
      fill: "solid",
    },
    confidence: 0.95,
    explanation: `Draw a ${color} ${shapeType}`,
  };
}

function buildAlignmentCommand(
  alignment: string,
  context: VoiceCommandContext,
): ParsedCommand | null {
  const selection = context.lastSelection || getSelectedShapeIds(context);
  if (!selection || selection.length < 2) {
    return null;
  }

  return {
    toolName: "align_shapes",
    params: {
      ids: selection,
      alignment,
    },
    confidence: 0.9,
    explanation: `Align ${selection.length} shapes to ${alignment}`,
  };
}

function buildDistributionCommand(
  direction: string,
  context: VoiceCommandContext,
): ParsedCommand | null {
  const selection = context.lastSelection || getSelectedShapeIds(context);
  if (!selection || selection.length < 2) {
    return null;
  }

  return {
    toolName: "distribute_shapes",
    params: {
      ids: selection,
      direction,
    },
    confidence: 0.9,
    explanation: `Distribute ${selection.length} shapes ${direction}`,
  };
}

function buildGroupCommand(context: VoiceCommandContext): ParsedCommand | null {
  const selection = context.lastSelection || getSelectedShapeIds(context);
  if (!selection || selection.length < 2) {
    return null;
  }

  return {
    toolName: "group_shapes",
    params: {
      ids: selection,
    },
    confidence: 0.9,
    explanation: `Group ${selection.length} shapes`,
  };
}

function buildUngroupCommand(
  context: VoiceCommandContext,
): ParsedCommand | null {
  const selection = context.lastSelection || getSelectedShapeIds(context);
  if (!selection) return null;

  return {
    toolName: "ungroup_shapes",
    params: {
      ids: selection,
    },
    confidence: 0.85,
    explanation: `Ungroup shapes`,
  };
}

function buildDeleteCommand(
  context: VoiceCommandContext,
): ParsedCommand | null {
  const selection = context.lastSelection || getSelectedShapeIds(context);
  if (!selection || selection.length === 0) {
    return null;
  }

  return {
    toolName: "delete_shapes",
    params: {
      ids: selection,
    },
    confidence: 0.9,
    explanation: `Delete ${selection.length} shapes`,
  };
}

function getSelectedShapeIds(context: VoiceCommandContext): string[] {
  try {
    const selected = context.editor?.getSelectedShapes?.() || [];
    return selected.map((shape: any) => shape.id);
  } catch {
    return [];
  }
}
