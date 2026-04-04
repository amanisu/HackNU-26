/**
 * draw_freehand — Freehand drawing tool for the tldraw canvas.
 * Accepts waypoints from the AI and interpolates smooth curves between them.
 */

import type { Editor, VecModel } from 'tldraw'
import { createShapeId, Vec } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

const VALID_COLORS = new Set([
  'black', 'grey', 'light-violet', 'violet', 'blue', 'light-blue',
  'yellow', 'orange', 'green', 'light-green', 'light-red', 'red', 'white',
])

const COLOR_MAP: Record<string, string> = {
  'purple': 'violet', 'pink': 'light-red', 'gray': 'grey',
  'cyan': 'light-blue', 'teal': 'light-blue', 'magenta': 'violet',
  'lime': 'light-green', 'brown': 'orange', 'navy': 'blue',
  'maroon': 'red', 'gold': 'yellow', 'silver': 'grey',
}

function sanitizeColor(color: string): string {
  if (VALID_COLORS.has(color)) return color
  return COLOR_MAP[color] || 'black'
}

const VALID_SIZES = new Set(['s', 'm', 'l', 'xl'])

export function createDrawFreehandTool(): ToolDefinition {
  return {
    name: 'draw_freehand',
    description:
      'Draw a freehand stroke on the canvas. Provide a list of waypoints (x, y coordinates) and the tool will interpolate smooth curves between them. Use this for illustrations, annotations, underlines, circles, or any organic/hand-drawn content.',
    parameters: {
      type: 'object',
      properties: {
        points: {
          type: 'array',
          description: 'Waypoints for the stroke. Provide 2-30 points; the tool interpolates between them.',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number', description: 'X coordinate' },
              y: { type: 'number', description: 'Y coordinate' },
            },
            required: ['x', 'y'],
          },
        },
        color: {
          type: 'string',
          enum: [
            'black', 'grey', 'light-violet', 'violet', 'blue', 'light-blue',
            'yellow', 'orange', 'green', 'light-green', 'light-red', 'red', 'white',
          ],
          description: 'Stroke color (default: black)',
        },
        size: {
          type: 'string',
          enum: ['s', 'm', 'l', 'xl'],
          description: 'Stroke thickness (default: s)',
        },
        style: {
          type: 'string',
          enum: ['smooth', 'straight'],
          description: 'Interpolation style: smooth (curves) or straight (linear). Default: smooth',
        },
        closed: {
          type: 'boolean',
          description: 'Close the path (connect last point to first). Default: false',
        },
        fill: {
          type: 'string',
          enum: ['none', 'semi', 'solid', 'pattern'],
          description: 'Fill style for closed shapes (default: none)',
        },
      },
      required: ['points'],
    },
    execute: (editor: Editor, params: Record<string, unknown>): ToolResult => {
      try {
        const rawPoints = params.points as Array<{ x: number; y: number }>
        if (!rawPoints || rawPoints.length < 2) {
          return { success: false, error: 'Need at least 2 points' }
        }

        const color = sanitizeColor((params.color as string) ?? 'black')
        const size = VALID_SIZES.has(params.size as string) ? (params.size as string) : 's'
        const style = (params.style as string) === 'straight' ? 'straight' : 'smooth'
        const closed = (params.closed as boolean) ?? false
        const fill = (params.fill as string) ?? 'none'

        // If closed, append first point at end
        const waypoints: VecModel[] = rawPoints.map(p => ({ x: p.x, y: p.y }))
        if (closed) {
          waypoints.push({ ...waypoints[0] })
        }

        // Interpolate between waypoints for realistic freehand appearance
        const maxDist = style === 'smooth' ? 10 : 2
        const interpolated: VecModel[] = []

        for (let i = 0; i < waypoints.length - 1; i++) {
          const current = waypoints[i]
          const next = waypoints[i + 1]
          interpolated.push(current)

          const dist = Vec.Dist(current, next)
          const numExtra = Math.floor(dist / maxDist)
          for (let j = 0; j < numExtra; j++) {
            const t = (j + 1) / (numExtra + 1)
            interpolated.push(Vec.Lrp(current, next, t))
          }
        }
        // Add the last point
        interpolated.push(waypoints[waypoints.length - 1])

        // Normalize to origin (shape position = min x/y)
        const minX = Math.min(...interpolated.map(p => p.x))
        const minY = Math.min(...interpolated.map(p => p.y))

        // v3.x format: inline point arrays with z (pressure)
        const segmentPoints = interpolated.map(p => ({
          x: p.x - minX,
          y: p.y - minY,
          z: 0.75, // simulated pen pressure for even stroke width
        }))

        const segments = [{
          type: 'free' as const,
          points: segmentPoints,
        }]

        const id = createShapeId()

        editor.createShape({
          id,
          type: 'draw',
          x: minX,
          y: minY,
          props: {
            color,
            fill,
            dash: 'draw',
            size,
            segments,
            isComplete: true,
            isClosed: closed,
            isPen: true,
          },
        })

        return {
          success: true,
          data: {
            id,
            type: 'draw',
            x: minX,
            y: minY,
            pointCount: segmentPoints.length,
            closed,
          },
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to draw freehand: ${error}`,
        }
      }
    },
  }
}
