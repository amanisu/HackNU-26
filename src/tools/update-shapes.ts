import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

const VALID_COLORS = new Set([
  'black', 'grey', 'light-violet', 'violet', 'blue', 'light-blue',
  'yellow', 'orange', 'green', 'light-green', 'light-red', 'red', 'white',
])

/** Snap invalid colors to the nearest valid tldraw color */
function sanitizeColor(color: string): string {
  if (VALID_COLORS.has(color)) return color
  // Common LLM hallucinations → closest valid color
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

/** Convert plain text to tldraw richText format */
function toRichText(text: string) {
  const lines = text.split('\n')
  const content = lines.map((line) => {
    if (!line) return { type: 'paragraph' }
    return { type: 'paragraph', content: [{ type: 'text', text: line }] }
  })
  return { type: 'doc', content }
}

/** Shape types that use richText instead of text */
const RICH_TEXT_TYPES = new Set(['text', 'note', 'geo'])

export function createUpdateShapesTool(): ToolDefinition {
  return {
    name: 'update_shapes',
    description: 'Modify existing shapes — change position, size, text, color, or style properties.',
    parameters: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          description: 'Array of updates, each with an id and properties to change',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Shape ID to update' },
              x: { type: 'number', description: 'New X position' },
              y: { type: 'number', description: 'New Y position' },
              width: { type: 'number', description: 'New width (sets props.w)' },
              height: { type: 'number', description: 'New height (sets props.h)' },
              text: { type: 'string', description: 'New text content' },
              color: { type: 'string', description: 'New color' },
              fill: { type: 'string', enum: ['none', 'semi', 'solid', 'pattern'], description: 'Fill style' },
              opacity: { type: 'number', description: 'Opacity (0-1)' },
            },
            required: ['id'],
          },
        },
      },
      required: ['updates'],
    },
    execute: (editor: Editor, params: Record<string, unknown>): ToolResult => {
      try {
        const updates = params.updates as Array<Record<string, unknown>>
        if (!Array.isArray(updates) || updates.length === 0) {
          return { success: false, error: 'updates must be a non-empty array' }
        }

        const updated: string[] = []
        const errors: string[] = []

        for (const upd of updates) {
          const id = upd.id as string
          const existing = editor.getShape(id as any)
          if (!existing) {
            errors.push(`Shape not found: ${id}`)
            continue
          }

          const partial: Record<string, unknown> = {
            id: id as any,
            type: existing.type,
          }

          if (upd.x !== undefined) partial.x = upd.x
          if (upd.y !== undefined) partial.y = upd.y
          if (upd.opacity !== undefined) partial.opacity = upd.opacity

          // Build props updates
          const props: Record<string, unknown> = {}
          if (upd.width !== undefined) props.w = upd.width
          // Only set h for shape types that support it (geo, frame — NOT text)
          if (upd.height !== undefined && existing.type !== 'text') props.h = upd.height
          // Convert text → richText for types that need it
          if (upd.text !== undefined) {
            if (RICH_TEXT_TYPES.has(existing.type)) {
              props.richText = toRichText(upd.text as string)
            } else {
              props.text = upd.text
            }
          }
          if (upd.color !== undefined) props.color = sanitizeColor(upd.color as string)
          if (upd.fill !== undefined) props.fill = upd.fill

          if (Object.keys(props).length > 0) {
            partial.props = props
          }

          editor.updateShape(partial as any)
          updated.push(id)
        }

        return {
          success: true,
          data: {
            updated,
            count: updated.length,
            ...(errors.length > 0 ? { errors } : {}),
          },
        }
      } catch (error) {
        return { success: false, error: `Failed to update shapes: ${error}` }
      }
    },
  }
}
