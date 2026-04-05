import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'
import { createGetCanvasOverviewTool } from './get-canvas-overview'
import { createCreateShapeTool } from './create-shape'
import { createCreateConnectionTool } from './create-connection'
import { createCreateShapesTool } from './create-shapes'
import { createUpdateShapesTool } from './update-shapes'
import { createDeleteShapesTool } from './delete-shapes'
import { createGetShapesTool } from './get-shapes'
import { createGetSelectionTool } from './get-selection'
import { createSelectShapesTool } from './select-shapes'
import { createGroupShapesTool } from './group-shapes'
import { createUngroupShapesTool } from './ungroup-shapes'
import { createAlignShapesTool } from './align-shapes'
import { createDistributeShapesTool } from './distribute-shapes'
import { createExportCanvasTool } from './export-canvas'
import { createValidateLayoutTool } from './validate-layout'
import { createZoomToContentTool } from './zoom-to-content'
import { createUndoTool, createRedoTool } from './undo-redo'
import { createDrawFreehandTool } from './draw-freehand'
import { createCaptureScreenshotTool } from './capture-screenshot'

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()
  private editor: Editor | null = null

  static instance: ToolRegistry;
  constructor() {
    this.registerDefaults();
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = this;
    }
    return ToolRegistry.instance;
  }

  setEditor(editor: Editor) {
    this.editor = editor
  }

  private register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool)
  }

  private registerDefaults() {
    // Read tools
    this.register(createGetCanvasOverviewTool())
    this.register(createGetShapesTool())
    this.register(createGetSelectionTool())

    // Create tools
    this.register(createCreateShapeTool())
    this.register(createCreateShapesTool())
    this.register(createCreateConnectionTool())

    // Update tools
    this.register(createUpdateShapesTool())

    // Delete tools
    this.register(createDeleteShapesTool())

    // Selection tools
    this.register(createSelectShapesTool())

    // Layout tools
    this.register(createGroupShapesTool())
    this.register(createUngroupShapesTool())
    this.register(createAlignShapesTool())
    this.register(createDistributeShapesTool())

    // Export tools
    this.register(createExportCanvasTool())

    // Validation tools
    this.register(createValidateLayoutTool())

    // Viewport tools
    this.register(createZoomToContentTool())

    // History tools
    this.register(createUndoTool())
    this.register(createRedoTool())

    // Drawing tools
    this.register(createDrawFreehandTool())

    // Screenshot tools
    this.register(createCaptureScreenshotTool())
  }

  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  getToolSchemas() {
    return this.getToolDefinitions().map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }))
  }

  async executeTool(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    if (!this.editor) {
      return { success: false, error: 'Editor not initialized' }
    }

    const tool = this.tools.get(name)
    if (!tool) {
      return { success: false, error: `Unknown tool: ${name}` }
    }

    return tool.execute(this.editor, params)
  }
}

// Singleton
ToolRegistry.instance = new ToolRegistry();
export const toolRegistry = ToolRegistry.instance;
