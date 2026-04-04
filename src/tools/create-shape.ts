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

export function createCreateShapeTool(): ToolDefinition {
  return {
    name: 'create_shape',
    description: 'Create a shape on the canvas. Supports geo shapes (rectangle, ellipse, diamond, triangle, trapezoid, rhombus, pentagon, hexagon, octagon, star, cloud, heart, x-box, arrow-left, arrow-right, arrow-up, arrow-down), text, note, and frame.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['geo', 'text', 'note', 'frame'],
          description: 'The shape type to create',
        },
        x: { type: 'number', description: 'X position (default: 0)' },
        y: { type: 'number', description: 'Y position (default: 0)' },
        width: { type: 'number', description: 'Width (default: 200)' },
        height: { type: 'number', description: 'Height (default: 200)' },
        text: { type: 'string', description: 'Text content for the shape' },
        geo: {
          type: 'string',
          enum: [
            'rectangle', 'ellipse', 'diamond', 'triangle', 'trapezoid',
            'rhombus', 'pentagon', 'hexagon', 'octagon', 'star',
            'cloud', 'heart', 'x-box', 'arrow-left', 'arrow-right',
            'arrow-up', 'arrow-down',
          ],
          description: 'Geo shape type (only for type=geo, default: rectangle)',
        },
        color: {
          type: 'string',
          enum: ['black', 'grey', 'light-violet', 'violet', 'blue', 'light-blue', 'yellow', 'orange', 'green', 'light-green', 'light-red', 'red', 'white'],
          description: 'Shape color (default: black)',
        },
        fill: {
          type: 'string',
          enum: ['none', 'semi', 'solid', 'pattern'],
          description: 'Fill style (default: none)',
        },
        label: { type: 'string', description: 'Alias for text' },
      },
      required: ['type'],
    },
    execute: (editor: Editor, params: Record<string, unknown>): ToolResult => {
      try {
        const shapeType = params.type as string
        const x = (params.x as number) ?? 0
        const y = (params.y as number) ?? 0
        const w = (params.width as number) ?? 200
        const h = (params.height as number) ?? 200
        const text = (params.text as string) ?? (params.label as string) ?? ''
        const color = sanitizeColor((params.color as string) ?? 'black')

        const id = createShapeId()

        let shape: TLShapePartial

        if (shapeType === 'geo') {
          const geo = (params.geo as string) ?? 'rectangle'
          const fill = (params.fill as string) ?? 'solid'
          const geoProps: Record<string, unknown> = {
            w,
            h,
            geo,
            color,
            fill,
          }
          // Set text inside the geo shape via richText
          if (text) {
            geoProps.richText = toRichText(text)
          }
          shape = {
            id,
            type: 'geo',
            x,
            y,
            props: geoProps,
          }
        } else if (shapeType === 'text') {
          shape = {
            id,
            type: 'text',
            x,
            y,
            props: {
              richText: toRichText(text || 'Text'),
              color,
              w,
              autoSize: true,
              scale: 1,
            } as any,
          }
        } else if (shapeType === 'note') {
          shape = {
            id,
            type: 'note',
            x,
            y,
            props: {
              richText: toRichText(text || 'Note'),
              color,
            } as any,
          }
        } else if (shapeType === 'frame') {
          shape = {
            id,
            type: 'frame',
            x,
            y,
            props: {
              w,
              h,
              name: text || 'Frame',
            },
          }
        } else {
          return { success: false, error: `Unknown shape type: ${shapeType}` }
        }

        editor.createShape(shape)

        return {
          success: true,
          data: {
            id: id,
            type: shapeType,
            x,
            y,
            width: w,
            height: h,
          },
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to create shape: ${error}`,
        }
      }
    },
  }
}
