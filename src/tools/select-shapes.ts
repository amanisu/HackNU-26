import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createSelectShapesTool(): ToolDefinition {
  return {
    name: 'select_shapes',
    description: 'Select shapes by ID, select all shapes, or clear the selection.',
    parameters: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Shape IDs to select. Omit to select all or none.',
        },
        mode: {
          type: 'string',
          enum: ['set', 'all', 'none'],
          description: 'Selection mode: "set" (select specific ids, default), "all" (select all), "none" (clear selection)',
        },
      },
      required: [],
    },
    execute: (editor: Editor, params: Record<string, unknown>): ToolResult => {
      try {
        const mode = (params.mode as string) ?? 'set'
        const ids = params.ids as string[] | undefined

        if (mode === 'all') {
          editor.selectAll()
          const selected = editor.getSelectedShapeIds()
          return {
            success: true,
            data: { selected: selected.length, mode: 'all' },
          }
        }

        if (mode === 'none') {
          editor.selectNone()
          return {
            success: true,
            data: { selected: 0, mode: 'none' },
          }
        }

        // mode === 'set'
        if (!ids || ids.length === 0) {
          editor.selectNone()
          return {
            success: true,
            data: { selected: 0, mode: 'set' },
          }
        }

        // Verify shapes exist
        const validIds: string[] = []
        const notFound: string[] = []
        for (const id of ids) {
          if (editor.getShape(id as any)) {
            validIds.push(id)
          } else {
            notFound.push(id)
          }
        }

        if (validIds.length > 0) {
          editor.select(...(validIds as any))
        }

        return {
          success: true,
          data: {
            selected: validIds.length,
            ids: validIds,
            ...(notFound.length > 0 ? { notFound } : {}),
          },
        }
      } catch (error) {
        return { success: false, error: `Failed to select shapes: ${error}` }
      }
    },
  }
}
