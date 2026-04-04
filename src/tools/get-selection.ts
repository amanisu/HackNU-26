import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createGetSelectionTool(): ToolDefinition {
  return {
    name: 'get_selection',
    description: 'Get the currently selected shapes on the canvas.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: (editor: Editor): ToolResult => {
      try {
        const selectedShapes = editor.getSelectedShapes()

        const shapes = selectedShapes.map(s => {
          const bounds = editor.getShapePageBounds(s)
          const props = s.props as Record<string, unknown>
          return {
            id: s.id,
            type: s.type,
            x: Math.round(s.x),
            y: Math.round(s.y),
            width: bounds ? Math.round(bounds.w) : undefined,
            height: bounds ? Math.round(bounds.h) : undefined,
            ...(props.text ? { text: props.text } : {}),
            ...(props.name ? { name: props.name } : {}),
            ...(props.color ? { color: props.color } : {}),
            ...(props.geo ? { geo: props.geo } : {}),
          }
        })

        return {
          success: true,
          data: { shapes, count: shapes.length },
        }
      } catch (error) {
        return { success: false, error: `Failed to get selection: ${error}` }
      }
    },
  }
}
