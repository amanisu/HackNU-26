import type { Editor } from 'tldraw'
import { createShapeId } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createCreateConnectionTool(): ToolDefinition {
  return {
    name: 'create_connection',
    description: 'Create an arrow connecting two shapes. The arrow will bind to the specified shapes.',
    parameters: {
      type: 'object',
      properties: {
        fromShapeId: {
          type: 'string',
          description: 'ID of the shape where the arrow starts',
        },
        toShapeId: {
          type: 'string',
          description: 'ID of the shape where the arrow ends',
        },
        text: {
          type: 'string',
          description: 'Optional label text on the arrow',
        },
        color: {
          type: 'string',
          enum: ['black', 'grey', 'light-violet', 'violet', 'blue', 'light-blue', 'yellow', 'orange', 'green', 'light-green', 'light-red', 'red', 'white'],
          description: 'Arrow color (default: black)',
        },
        arrowheadStart: {
          type: 'string',
          enum: ['none', 'arrow', 'triangle', 'square', 'dot', 'diamond', 'inverted', 'bar', 'pipe'],
          description: 'Start arrowhead style (default: none)',
        },
        arrowheadEnd: {
          type: 'string',
          enum: ['none', 'arrow', 'triangle', 'square', 'dot', 'diamond', 'inverted', 'bar', 'pipe'],
          description: 'End arrowhead style (default: arrow)',
        },
      },
      required: ['fromShapeId', 'toShapeId'],
    },
    execute: (editor: Editor, params: Record<string, unknown>): ToolResult => {
      try {
        const fromId = params.fromShapeId as string
        const toId = params.toShapeId as string
        const text = (params.text as string) ?? ''
        const color = (params.color as string) ?? 'black'
        const arrowheadStart = (params.arrowheadStart as string) ?? 'none'
        const arrowheadEnd = (params.arrowheadEnd as string) ?? 'arrow'

        // Verify shapes exist
        const fromShape = editor.getShape(fromId as any)
        const toShape = editor.getShape(toId as any)

        if (!fromShape) {
          return { success: false, error: `Source shape not found: ${fromId}` }
        }
        if (!toShape) {
          return { success: false, error: `Target shape not found: ${toId}` }
        }

        const arrowId = createShapeId()

        editor.createShape({
          id: arrowId,
          type: 'arrow',
          props: {
            text,
            color,
            arrowheadStart,
            arrowheadEnd,
          },
        })

        // Create bindings to connect arrow to shapes
        editor.createBindings([
          {
            fromId: arrowId,
            toId: fromId as any,
            type: 'arrow',
            props: {
              terminal: 'start',
              normalizedAnchor: { x: 0.5, y: 0.5 },
              isExact: false,
              isPrecise: false,
            },
          },
          {
            fromId: arrowId,
            toId: toId as any,
            type: 'arrow',
            props: {
              terminal: 'end',
              normalizedAnchor: { x: 0.5, y: 0.5 },
              isExact: false,
              isPrecise: false,
            },
          },
        ])

        return {
          success: true,
          data: {
            arrowId: arrowId,
            from: fromId,
            to: toId,
          },
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to create connection: ${error}`,
        }
      }
    },
  }
}
