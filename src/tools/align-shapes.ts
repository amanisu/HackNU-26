import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createAlignShapesTool(): ToolDefinition {
  return {
    name: 'align_shapes',
    description: 'Align shapes along an axis (left, center-horizontal, right, top, center-vertical, bottom).',
    parameters: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Shape IDs to align',
        },
        alignment: {
          type: 'string',
          enum: ['left', 'center-horizontal', 'right', 'top', 'center-vertical', 'bottom'],
          description: 'Alignment direction',
        },
      },
      required: ['ids', 'alignment'],
    },
    execute: (editor: Editor, params: Record<string, unknown>): ToolResult => {
      try {
        const ids = params.ids as string[]
        const alignment = params.alignment as string

        if (!Array.isArray(ids) || ids.length < 2) {
          return { success: false, error: 'Need at least 2 shape IDs to align' }
        }

        const validAlignments = ['left', 'center-horizontal', 'right', 'top', 'center-vertical', 'bottom']
        if (!validAlignments.includes(alignment)) {
          return { success: false, error: `Invalid alignment: ${alignment}. Must be one of: ${validAlignments.join(', ')}` }
        }

        // Verify shapes exist
        for (const id of ids) {
          if (!editor.getShape(id as any)) {
            return { success: false, error: `Shape not found: ${id}` }
          }
        }

        editor.alignShapes(ids as any, alignment as any)

        return {
          success: true,
          data: { aligned: ids.length, alignment },
        }
      } catch (error) {
        return { success: false, error: `Failed to align shapes: ${error}` }
      }
    },
  }
}
