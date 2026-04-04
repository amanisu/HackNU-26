import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createUngroupShapesTool(): ToolDefinition {
  return {
    name: 'ungroup_shapes',
    description: 'Ungroup a group shape, releasing its children.',
    parameters: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'ID of the group to ungroup',
        },
      },
      required: ['groupId'],
    },
    execute: (editor: Editor, params: Record<string, unknown>): ToolResult => {
      try {
        const groupId = params.groupId as string

        const groupShape = editor.getShape(groupId as any)
        if (!groupShape) {
          return { success: false, error: `Shape not found: ${groupId}` }
        }
        if (groupShape.type !== 'group') {
          return { success: false, error: `Shape ${groupId} is not a group (type: ${groupShape.type})` }
        }

        // Get children before ungrouping
        const childIds = editor.getSortedChildIdsForParent(groupId as any)

        editor.ungroupShapes([groupId as any])

        return {
          success: true,
          data: {
            ungrouped: groupId,
            releasedChildren: [...childIds],
            count: childIds.length,
          },
        }
      } catch (error) {
        return { success: false, error: `Failed to ungroup shapes: ${error}` }
      }
    },
  }
}
