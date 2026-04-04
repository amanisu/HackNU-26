import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createUndoTool(): ToolDefinition {
  return {
    name: 'undo',
    description: 'Undo the last action on the canvas.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: (editor: Editor): ToolResult => {
      try {
        editor.undo()
        return { success: true, data: { message: 'Undid last action.' } }
      } catch (error) {
        return { success: false, error: `Failed to undo: ${error}` }
      }
    },
  }
}

export function createRedoTool(): ToolDefinition {
  return {
    name: 'redo',
    description: 'Redo the last undone action on the canvas.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: (editor: Editor): ToolResult => {
      try {
        editor.redo()
        return { success: true, data: { message: 'Redid last action.' } }
      } catch (error) {
        return { success: false, error: `Failed to redo: ${error}` }
      }
    },
  }
}
