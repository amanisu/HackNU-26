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

    // Write/Type text command
    {
      regex:
        /(?:write|type|тип|пиши|напиши|написать)\s+(?:a\s+)?text\s+(.+)|(?:write|type|тип|пиши|напиши|написать)\s+(.+)/i,
      build: (match) => {
        let text = match[1] || match[2] || "";
        text = text
          .trim()
          .replace(/^["'\s]+|["'\s]+$/g, "")
          .substring(0, 50); // Limit to 50 chars

        if (!text) {
          return null;
        }

        return {
          toolName: "create_shape",
          params: {
            type: "text",
            text: text,
            x: Math.random() * 300 + 50,
            y: Math.random() * 300 + 50,
            color: "black",
          },
          confidence: 0.85,
          explanation: `Write text: "${text}"`,
        };
      },
    },

    // Drawing commands - Universal pattern for all colors + shapes
    {
      regex:
        /(?:draw|рисуй|нарисуй|create).*(?:red|красн|blue|синий|голубой|green|зелён|зелен|yellow|жёлт|violet|фиолет|purple|orange|оранжев|black|чёрн|черн|grey|gray|серый|white|белый).*(?:circle|круг|окружность|rectangle|прямоугольник|квадрат|box|triangle|треугольник|star|звезда|heart|сердце|diamond|ромб|rhombus|hexagon|шестиугольник|pentagon|пятиугольник|octagon|восьмиугольник|trapezoid|трапеция|x-box|х-box|check-?box|arrow\s*(?:left|right|up|down)|arrow-(?:left|right|up|down)|стрелка\s*(?:влево|вправо|вверх|вниз)|стрелка-(?:влево|вправо|вверх|вниз)|cloud|облако|line)/i,
      build: (match) => {
        const cmd = match[0];

        // Extract color
        const colorMatch = cmd.match(
          /(?:red|красн|blue|синий|голубой|green|зелён|зелен|yellow|жёлт|violet|фиолет|purple|orange|оранжев|black|чёрн|черн|grey|gray|серый|white|белый)/i,
        );
        const colorName = colorMatch ? colorMatch[0] : "black";
        const color = mapColorNames(colorName);

        // Extract shape - prioritize arrows with spaces/dashes
        let shapeMatch = cmd.match(
          /arrow\s*(?:left|right|up|down)|arrow-(?:left|right|up|down)|стрелка\s*(?:влево|вправо|вверх|вниз)|стрелка-(?:влево|вправо|вверх|вниз)/i,
        );
        if (!shapeMatch) {
          shapeMatch = cmd.match(
            /(?:circle|круг|окружность|rectangle|прямоугольник|квадрат|box|triangle|треугольник|star|звезда|heart|сердце|diamond|ромб|rhombus|hexagon|шестиугольник|pentagon|пятиугольник|octagon|восьмиугольник|trapezoid|трапеция|x-box|х-box|check-?box|cloud|облако|line)/i,
          );
        }
        const shapeName = shapeMatch ? shapeMatch[0] : "rectangle";
        const shapeType = mapShapeNames(shapeName);

        return buildDrawCommand(shapeType, color, context, cmd);
      },
    },

    // Drawing commands - Simple shapes WITHOUT colors (fallback)
    {
      regex:
        /(?:draw|рисуй|нарисуй).*(?:circle|круг|окружность|rectangle|прямоугольник|квадрат|triangle|треугольник|star|звезда|heart|сердце|diamond|ромб|hexagon|pentagon|octagon|trapezoid|arrow|стрелка|cloud|облако|line)/i,
      build: (match) => {
        const cmd = match[0];
        let shapeMatch = cmd.match(
          /arrow\s*(?:left|right|up|down)|arrow-(?:left|right|up|down)|стрелка\s*(?:влево|вправо|вверх|вниз)|стрелка-(?:влево|вправо|вверх|вниз)/i,
        );
        if (!shapeMatch) {
          shapeMatch = cmd.match(
            /(?:circle|круг|окружность|rectangle|прямоугольник|квадрат|triangle|треугольник|star|звезда|heart|сердце|diamond|ромб|hexagon|pentagon|octagon|trapezoid|cloud|облако|line)/i,
          );
        }
        const shapeName = shapeMatch ? shapeMatch[0] : "rectangle";
        const shapeType = mapShapeNames(shapeName);

        return buildDrawCommand(shapeType, "black", context, cmd);
      },
    },
  ];

  for (const pattern of patterns) {
    const match = pattern.regex.exec(command);
    if (match) {
      const result = pattern.build(match, context);
      if (result) {
        // DEBUG: Log which pattern matched
        console.log("🎯 Pattern matched:", result.explanation);
        return result;
      }
    }
  }

  return null;
}

function extractTextFromCommand(command: string): string {
  // Extract text from patterns like:
  // "draw red circle that says hello"
  // "red circle with text hello"
  // "red circle labeled hello"
  // "violet star с текстом привет"
  // "blue arrow-left label start"

  const patterns = [
    // English patterns: "that says", "with text", "labeled", "label"
    /(?:that\s+says?|with\s+text|labeled|label)\s+([^\s][^\n]*?)(?:\s+(?:that|with|label)|$)/i,
    /(?:that\s+says?|with\s+text|labeled|label)\s+([^\s][^\n]*?)$/i,

    // Russian patterns: "с текстом", "говорит", "подписано"
    /(?:с\s+текстом|говорит)\s+([^\s][^\n]*?)(?:\s+(?:с\s+текстом|говорит)|$)/i,
    /(?:с\s+текстом|говорит)\s+([^\s][^\n]*?)$/i,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match && match[1]) {
      const text = match[1]
        .trim()
        .replace(/^["'\s]+|["'\s]+$/g, "")
        .replace(/\b(that|with|label|labeled|говорит|с|текстом)\b/gi, "")
        .trim();

      if (text && text.length > 0) {
        return text;
      }
    }
  }
  return "";
}

function mapShapeNames(shapeName: string): string {
  const map: Record<string, string> = {
    circle: "ellipse",
    круг: "ellipse",
    окружность: "ellipse",
    rectangle: "rectangle",
    прямоугольник: "rectangle",
    квадрат: "rectangle",
    box: "rectangle",
    triangle: "triangle",
    треугольник: "triangle",
    star: "star",
    звезда: "star",
    heart: "heart",
    сердце: "heart",
    diamond: "diamond",
    rhombus: "rhombus",
    ромб: "diamond",
    hexagon: "hexagon",
    шестиугольник: "hexagon",
    pentagon: "pentagon",
    пятиугольник: "pentagon",
    octagon: "octagon",
    восьмиугольник: "octagon",
    trapezoid: "trapezoid",
    трапеция: "trapezoid",
    "x-box": "x-box",
    "х-box": "x-box",
    "check-box": "x-box",
    checkbox: "x-box",
    "arrow-left": "arrow-left",
    "стрелка-влево": "arrow-left",
    "arrow-right": "arrow-right",
    "стрелка-вправо": "arrow-right",
    "arrow-up": "arrow-up",
    "стрелка-вверх": "arrow-up",
    "arrow-down": "arrow-down",
    "стрелка-вниз": "arrow-down",
    cloud: "cloud",
    облако: "cloud",
    line: "arrow-right", // line as arrow
  };
  return map[shapeName.toLowerCase()] || "rectangle";
}

function mapColorNames(colorName: string): string {
  const map: Record<string, string> = {
    red: "red",
    красный: "red",
    красн: "red",
    красная: "red",
    blue: "blue",
    синий: "blue",
    синяя: "blue",
    голубой: "blue",
    green: "green",
    зелёный: "green",
    зеленый: "green",
    yellow: "yellow",
    жёлтый: "yellow",
    жёлтая: "yellow",
    violet: "violet",
    фиолетовый: "violet",
    фиолет: "violet",
    purple: "violet",
    orange: "orange",
    оранжевый: "orange",
    black: "black",
    чёрный: "black",
    черный: "black",
    grey: "grey",
    gray: "grey",
    серый: "grey",
    white: "white",
    белый: "white",
  };
  return map[colorName.toLowerCase()] || "black";
}

function buildDrawCommand(
  shapeType: string,
  color: string,
  _context: VoiceCommandContext,
  fullCommand?: string,
): ParsedCommand {
  // Get random position in canvas (visually better UX)
  const x = Math.random() * 300 + 50;
  const y = Math.random() * 300 + 50;

  const text = fullCommand ? extractTextFromCommand(fullCommand) : "";

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
      ...(text && { text }),
    },
    confidence: 0.95,
    explanation: `Draw a ${color} ${shapeType}${text ? ` saying "${text}"` : ""}`,
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
