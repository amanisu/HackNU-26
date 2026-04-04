import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createDistributeShapesTool(): ToolDefinition {
  return {
    name: 'distribute_shapes',
    description: 'Distribute shapes evenly along an axis (horizontal or vertical).',
    parameters: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Shape IDs to distribute',
        },
        axis: {
          type: 'string',
          enum: ['horizontal', 'vertical'],
          description: 'Distribution axis',
        },
      },
      required: ['ids', 'axis'],
    },
    execute: (editor: Editor, params: Record<string, unknown>): ToolResult => {
      try {
        const ids = params.ids as string[]
        const axis = params.axis as string

        if (!Array.isArray(ids) || ids.length < 3) {
          return { success: false, error: 'Need at least 3 shape IDs to distribute' }
        }

        if (axis !== 'horizontal' && axis !== 'vertical') {
          return { success: false, error: `Invalid axis: ${axis}. Must be "horizontal" or "vertical"` }
        }

        // Verify shapes exist
        for (const id of ids) {
          if (!editor.getShape(id as any)) {
            return { success: false, error: `Shape not found: ${id}` }
          }
        }

        editor.distributeShapes(ids as any, axis as any)

        return {
          success: true,
          data: { distributed: ids.length, axis },
        }
      } catch (error) {
        return { success: false, error: `Failed to distribute shapes: ${error}` }
      }
    },
  }
}
