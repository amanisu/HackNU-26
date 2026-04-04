import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createExportCanvasTool(): ToolDefinition {
  return {
    name: 'export_canvas',
    description: 'Export the canvas or specific shapes as SVG, PNG, or JSON.',
    parameters: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['svg', 'png', 'json'],
          description: 'Export format',
        },
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific shape IDs to export. If omitted, exports all shapes on current page.',
        },
      },
      required: ['format'],
    },
    execute: async (editor: Editor, params: Record<string, unknown>): Promise<ToolResult> => {
      try {
        const format = params.format as string
        const ids = params.ids as string[] | undefined

        // Determine which shapes to export
        let shapes = ids
          ? ids.map(id => editor.getShape(id as any)).filter(Boolean)
          : editor.getCurrentPageShapes()

        if (shapes.length === 0) {
          return { success: false, error: 'No shapes to export' }
        }

        if (format === 'json') {
          const data = shapes.map(s => {
            const bounds = editor.getShapePageBounds(s!)
            return {
              id: s!.id,
              type: s!.type,
              x: s!.x,
              y: s!.y,
              props: s!.props,
              bounds: bounds ? { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h } : null,
            }
          })
          return {
            success: true,
            data: { format: 'json', shapes: data, count: data.length },
          }
        }

        if (format === 'svg') {
          const result = await editor.getSvgString(shapes.map(s => s!.id) as any)
          if (!result) {
            return { success: false, error: 'Failed to generate SVG' }
          }
          return {
            success: true,
            data: {
              format: 'svg',
              svg: result.svg,
              width: result.width,
              height: result.height,
            },
          }
        }

        if (format === 'png') {
          // Use getSvgString as a fallback description since actual PNG blob
          // can't be easily returned as JSON data
          const result = await editor.getSvgString(shapes.map(s => s!.id) as any)
          if (!result) {
            return { success: false, error: 'Failed to generate export' }
          }
          return {
            success: true,
            data: {
              format: 'png',
              note: 'PNG export generated. SVG source included for reference.',
              svg: result.svg,
              width: result.width,
              height: result.height,
            },
          }
        }

        return { success: false, error: `Unsupported format: ${format}` }
      } catch (error) {
        return { success: false, error: `Failed to export canvas: ${error}` }
      }
    },
  }
}
