import type { Editor, TLShapePartial } from 'tldraw'
import { createShapeId } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

const VALID_COLORS = new Set([
  'black', 'grey', 'light-violet', 'violet', 'blue', 'light-blue',
  'yellow', 'orange', 'green', 'light-green', 'light-red', 'red', 'white',
])

function sanitizeColor(color: string): string {
  if (VALID_COLORS.has(color)) return color
  const map: Record<string, string> = {
    'dark-violet': 'violet', 'purple': 'violet', 'pink': 'light-red',
    'dark-blue': 'blue', 'dark-green': 'green', 'dark-red': 'red',
    'light-orange': 'orange', 'brown': 'orange', 'cyan': 'light-blue',
    'teal': 'light-blue', 'magenta': 'violet', 'lime': 'light-green',
    'navy': 'blue', 'maroon': 'red', 'gold': 'yellow', 'silver': 'grey',
    'dark-grey': 'grey', 'light-grey': 'grey', 'gray': 'grey',
  }
  return map[color] || 'black'
}

/** Convert plain text to tldraw richText format (TLRichText) */
function toRichText(text: string) {
  const lines = text.split('\n')
  const content = lines.map((line) => {
    if (!line) return { type: 'paragraph' }
    return { type: 'paragraph', content: [{ type: 'text', text: line }] }
  })
  return { type: 'doc', content }
}

export function createCreateShapesTool(): ToolDefinition {
  return {
    name: 'create_shapes',
    description: 'Batch create multiple shapes at once. Accepts an array of shape definitions (same params as create_shape).',
    parameters: {
      type: 'object',
      properties: {
        shapes: {
          type: 'array',
          description: 'Array of shape definitions',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['geo', 'text', 'note', 'frame'],
                description: 'The shape type',
              },
              x: { type: 'number', description: 'X position (default: 0)' },
              y: { type: 'number', description: 'Y position (default: 0)' },
              width: { type: 'number', description: 'Width (default: 200)' },
              height: { type: 'number', description: 'Height (default: 200)' },
              text: { type: 'string', description: 'Text content' },
              geo: { type: 'string', description: 'Geo shape type (for type=geo)' },
              color: { type: 'string', description: 'Shape color' },
              fill: { type: 'string', enum: ['none', 'semi', 'solid', 'pattern'], description: 'Fill style' },
            },
            required: ['type'],
          },
        },
      },
      required: ['shapes'],
    },
    execute: (editor: Editor, params: Record<string, unknown>): ToolResult => {
      try {
        const shapeDefs = params.shapes as Array<Record<string, unknown>>
        if (!Array.isArray(shapeDefs) || shapeDefs.length === 0) {
          return { success: false, error: 'shapes must be a non-empty array' }
        }

        const created: Array<{ id: string; type: string; x: number; y: number }> = []

        for (const def of shapeDefs) {
          const shapeType = def.type as string
          const x = (def.x as number) ?? 0
          const y = (def.y as number) ?? 0
          const w = (def.width as number) ?? 200
          const h = (def.height as number) ?? 200
          const text = (def.text as string) ?? ''
          const color = sanitizeColor((def.color as string) ?? 'black')
          const fill = (def.fill as string) ?? 'solid'

          const id = createShapeId()
          let shape: TLShapePartial

          if (shapeType === 'geo') {
            const geo = (def.geo as string) ?? 'rectangle'
            const geoProps: Record<string, unknown> = { w, h, geo, color, fill }
            if (text) geoProps.richText = toRichText(text)
            shape = { id, type: 'geo', x, y, props: geoProps } as any
          } else if (shapeType === 'text') {
            shape = { id, type: 'text', x, y, props: { richText: toRichText(text || 'Text'), color, w, autoSize: true, scale: 1 } as any }
          } else if (shapeType === 'note') {
            shape = { id, type: 'note', x, y, props: { richText: toRichText(text || 'Note'), color } as any }
          } else if (shapeType === 'frame') {
            shape = { id, type: 'frame', x, y, props: { w, h, name: text || 'Frame' } }
          } else {
            continue // skip unknown types
          }

          editor.createShape(shape)
          created.push({ id, type: shapeType, x, y })
        }

        return {
          success: true,
          data: { created, count: created.length },
        }
      } catch (error) {
        return { success: false, error: `Failed to batch create shapes: ${error}` }
      }
    },
  }
}
