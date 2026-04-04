import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createDeleteShapesTool(): ToolDefinition {
  return {
    name: 'delete_shapes',
    description: 'Delete shapes by their IDs.',
    parameters: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Shape IDs to delete',
        },
      },
      required: ['ids'],
    },
    execute: (editor: Editor, params: Record<string, unknown>): ToolResult => {
      try {
        const ids = params.ids as string[]
        if (!Array.isArray(ids) || ids.length === 0) {
          return { success: false, error: 'ids must be a non-empty array' }
        }

        // Verify which shapes exist
        const existing: string[] = []
        const notFound: string[] = []
        for (const id of ids) {
          if (editor.getShape(id as any)) {
            existing.push(id)
          } else {
            notFound.push(id)
          }
        }

        if (existing.length > 0) {
          editor.deleteShapes(existing as any)
        }

        return {
          success: true,
          data: {
            deleted: existing,
            count: existing.length,
            ...(notFound.length > 0 ? { notFound } : {}),
          },
        }
      } catch (error) {
        return { success: false, error: `Failed to delete shapes: ${error}` }
      }
    },
  }
}
