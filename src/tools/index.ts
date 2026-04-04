/**
 * Tools Module - Main Entry Point
 *
 * Complete tooling system for canvas management:
 * - Tool Registry & Execution
 * - Voice Command Parsing
 * - AI-powered Command Understanding
 * - React Hooks for Integration
 * - UI Components
 */

// Tool Registry & Types
export { ToolRegistry } from "./registry";
export type {
  ToolDefinition,
  ToolResult,
  ToolCallEntry,
  ChatMessage,
} from "./types";

// Individual Tools (for direct use if needed)
export { createGetCanvasOverviewTool } from "./get-canvas-overview";
export { createGetShapesTool } from "./get-shapes";
export { createGetSelectionTool } from "./get-selection";
export { createCreateShapeTool } from "./create-shape";
export { createCreateShapesTool } from "./create-shapes";
export { createCreateConnectionTool } from "./create-connection";
export { createUpdateShapesTool } from "./update-shapes";
export { createDeleteShapesTool } from "./delete-shapes";
export { createSelectShapesTool } from "./select-shapes";
export { createGroupShapesTool } from "./group-shapes";
export { createUngroupShapesTool } from "./ungroup-shapes";
export { createAlignShapesTool } from "./align-shapes";
export { createDistributeShapesTool } from "./distribute-shapes";
export { createExportCanvasTool } from "./export-canvas";
export { createValidateLayoutTool } from "./validate-layout";
export { createZoomToContentTool } from "./zoom-to-content";
export { createUndoTool, createRedoTool } from "./undo-redo";
export { createDrawFreehandTool } from "./draw-freehand";
export { createCaptureScreenshotTool } from "./capture-screenshot";

// Voice Assistant - Core functionality
export { executeVoiceCommand } from "./voice-command-parser";
export type {
  VoiceCommandContext,
  ParsedCommand,
  VoiceCommandResult,
} from "./voice-command-parser";

export { executeAICommand } from "./canvas-ai-commander";
export type {
  AICommanderOptions,
  AICommandResult,
} from "./canvas-ai-commander";

export { useVoiceCanvas } from "./use-voice-canvas";
export type { UseVoiceCanvasOptions, VoiceState } from "./use-voice-canvas";

// UI Components
export { VoiceAssistant, default } from "./VoiceAssistant";
export type { VoiceAssistantProps } from "./VoiceAssistant";

// Examples
export {
  SimpleVoiceCanvasExample,
  AdvancedVoiceCanvasExample,
  ProgrammaticVoiceCanvasExample,
  MiniVoiceWidget,
  KeyboardAwareVoiceCanvas,
} from "./VoiceCanvasExample";
