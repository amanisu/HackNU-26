import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createGetShapesTool(): ToolDefinition {
  return {
    name: 'get_shapes',
    description: 'Get shapes matching a query — filter by type, text content, or bounding area.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Filter by shape type (e.g. geo, text, note, frame, arrow)',
        },
        textContains: {
          type: 'string',
          description: 'Filter shapes whose text contains this string (case-insensitive)',
        },
        area: {
          type: 'object',
          description: 'Filter shapes within a bounding area',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
          },
        },
      },
      required: [],
    },
    execute: (editor: Editor, params: Record<string, unknown>): ToolResult => {
      try {
        let shapes = editor.getCurrentPageShapes()

        // Filter by type
        const typeFilter = params.type as string | undefined
        if (typeFilter) {
          shapes = shapes.filter(s => s.type === typeFilter)
        }

        // Filter by text content
        const textContains = params.textContains as string | undefined
        if (textContains) {
          const lower = textContains.toLowerCase()
          shapes = shapes.filter(s => {
            const props = s.props as Record<string, unknown>
            const text = (props.text as string) ?? ''
            const name = (props.name as string) ?? ''
            return text.toLowerCase().includes(lower) || name.toLowerCase().includes(lower)
          })
        }

        // Filter by area
        const area = params.area as { x: number; y: number; width: number; height: number } | undefined
        if (area) {
          shapes = shapes.filter(s => {
            const bounds = editor.getShapePageBounds(s)
            if (!bounds) return false
            return (
              bounds.x >= area.x &&
              bounds.y >= area.y &&
              bounds.x + bounds.w <= area.x + area.width &&
              bounds.y + bounds.h <= area.y + area.height
            )
          })
        }

        const result = shapes.map(s => {
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
          data: { shapes: result, count: result.length },
        }
      } catch (error) {
        return { success: false, error: `Failed to get shapes: ${error}` }
      }
    },
  }
}
