import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createGroupShapesTool(): ToolDefinition {
  return {
    name: 'group_shapes',
    description: 'Group multiple shapes together into a group.',
    parameters: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Shape IDs to group together',
        },
      },
      required: ['ids'],
    },
    execute: (editor: Editor, params: Record<string, unknown>): ToolResult => {
      try {
        const ids = params.ids as string[]
        if (!Array.isArray(ids) || ids.length < 2) {
          return { success: false, error: 'Need at least 2 shape IDs to group' }
        }

        // Verify shapes exist
        for (const id of ids) {
          if (!editor.getShape(id as any)) {
            return { success: false, error: `Shape not found: ${id}` }
          }
        }

        // Select shapes and group them
        editor.select(...(ids as any))
        editor.groupShapes(editor.getSelectedShapeIds())

        // The new group should be the selected shape now
        const selectedAfter = editor.getSelectedShapes()
        const groupShape = selectedAfter.find(s => s.type === 'group')

        return {
          success: true,
          data: {
            groupId: groupShape?.id ?? null,
            childCount: ids.length,
          },
        }
      } catch (error) {
        return { success: false, error: `Failed to group shapes: ${error}` }
      }
    },
  }
}
