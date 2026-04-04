import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

interface Issue {
  severity: 'error' | 'warning'
  type: string
  message: string
  shapeIds?: string[]
}

/** Estimate required width for text content */
function estimateTextWidth(text: string): number {
  const charWidth = 10
  const padding = 40
  return Math.max(120, text.length * charWidth + padding)
}

/** Extract plain text from richText object or string */
function extractText(props: Record<string, unknown>): string {
  if (typeof props.text === 'string') return props.text
  if (props.richText && typeof props.richText === 'object') {
    const rt = props.richText as any
    if (rt.content && Array.isArray(rt.content)) {
      return rt.content
        .map((block: any) => {
          if (block.content && Array.isArray(block.content)) {
            return block.content.map((n: any) => n.text || '').join('')
          }
          return ''
        })
        .join('\n')
    }
  }
  if (typeof props.name === 'string') return props.name
  return ''
}

export function createValidateLayoutTool(): ToolDefinition {
  return {
    name: 'validate_layout',
    description: 'Check the current canvas for layout issues: overlapping shapes, text overflow, inconsistent alignment, tight spacing. Returns a list of issues to fix. Call this AFTER creating shapes to verify quality.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: (editor: Editor): ToolResult => {
      try {
        const shapes = editor.getCurrentPageShapes()
        const issues: Issue[] = []

        if (shapes.length === 0) {
          return { success: true, data: { issues: [], summary: 'Canvas is empty.' } }
        }

        // Get bounds for all shapes
        const boundsMap: Map<string, { id: string; type: string; text: string; x: number; y: number; w: number; h: number }> = new Map()

        for (const shape of shapes) {
          const bounds = editor.getShapeGeometry(shape).bounds
          const text = extractText(shape.props as Record<string, unknown>)
          boundsMap.set(shape.id, {
            id: shape.id,
            type: shape.type,
            text,
            x: shape.x + bounds.x,
            y: shape.y + bounds.y,
            w: bounds.w,
            h: bounds.h,
          })
        }

        const allBounds = Array.from(boundsMap.values())

        // 1. Check overlaps (min 40px gap for breathing room)
        const MIN_GAP = 40
        for (let i = 0; i < allBounds.length; i++) {
          for (let j = i + 1; j < allBounds.length; j++) {
            const a = allBounds[i]
            const b = allBounds[j]
            // Skip arrows and groups
            if (a.type === 'arrow' || b.type === 'arrow' || a.type === 'group' || b.type === 'group') continue

            const overlapX = (a.x + a.w + MIN_GAP) > b.x && (b.x + b.w + MIN_GAP) > a.x
            const overlapY = (a.y + a.h + MIN_GAP) > b.y && (b.y + b.h + MIN_GAP) > a.y

            if (overlapX && overlapY) {
              const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w))
              const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h))
              const gap = Math.max(gapX, gapY)

              if (gap < MIN_GAP) {
                issues.push({
                  severity: gap < 0 ? 'error' : 'warning',
                  type: 'overlap',
                  message: `Shapes overlap or too close (${gap < 0 ? 'overlapping by ' + Math.abs(Math.round(gap)) + 'px' : 'only ' + Math.round(gap) + 'px gap'}): "${a.text || a.type}" and "${b.text || b.type}"`,
                  shapeIds: [a.id, b.id],
                })
              }
            }
          }
        }

        // 1b. Check arrow labels on short arrows (using arrow geometry bounds)
        const MIN_ARROW_LABEL_WIDTH = 120
        for (const shape of shapes) {
          if (shape.type !== 'arrow') continue
          const props = shape.props as Record<string, unknown>
          const arrowText = typeof props.text === 'string' ? props.text : ''
          if (!arrowText) continue // only check arrows with labels

          try {
            const arrowBounds = editor.getShapeGeometry(shape).bounds
            if (arrowBounds.w < MIN_ARROW_LABEL_WIDTH) {
              issues.push({
                severity: 'warning',
                type: 'arrow_label_truncated',
                message: `Arrow label '${arrowText}' may be truncated — connected shapes are too close (arrow width: ${Math.round(arrowBounds.w)}px, need ${MIN_ARROW_LABEL_WIDTH}px)`,
                shapeIds: [shape.id],
              })
            }
          } catch {
            // geometry not available, skip
          }
        }

        // 2. Check text overflow (text wider than shape)
        for (const b of allBounds) {
          if (b.type === 'arrow' || b.type === 'group' || b.type === 'frame') continue
          if (!b.text) continue

          const neededWidth = estimateTextWidth(b.text)
          if (neededWidth > b.w + 20) { // 20px tolerance
            issues.push({
              severity: 'warning',
              type: 'text_overflow',
              message: `Text "${b.text}" (${b.text.length} chars) likely overflows shape width ${Math.round(b.w)}px. Recommended width: ${neededWidth}px.`,
              shapeIds: [b.id],
            })
          }
        }

        // 3. Check alignment consistency
        // Group shapes by approximate Y position (within 15px = same row)
        const rows: Map<number, typeof allBounds> = new Map()
        for (const b of allBounds) {
          if (b.type === 'arrow' || b.type === 'group') continue
          const rowKey = Math.round(b.y / 15) * 15
          if (!rows.has(rowKey)) rows.set(rowKey, [])
          rows.get(rowKey)!.push(b)
        }

        for (const [, rowShapes] of rows) {
          if (rowShapes.length < 2) continue
          const ys = rowShapes.map(s => s.y)
          const minY = Math.min(...ys)
          const maxY = Math.max(...ys)
          if (maxY - minY > 5 && maxY - minY < 30) {
            issues.push({
              severity: 'warning',
              type: 'alignment',
              message: `Shapes in row near y=${Math.round(minY)} are slightly misaligned (${Math.round(maxY - minY)}px drift): ${rowShapes.map(s => `"${s.text || s.type}"`).join(', ')}`,
              shapeIds: rowShapes.map(s => s.id),
            })
          }
        }

        // 4. Check for shapes outside reasonable viewport
        for (const b of allBounds) {
          if (b.type === 'arrow' || b.type === 'group') continue
          if (b.x < -500 || b.y < -500 || b.x + b.w > 3000 || b.y + b.h > 2500) {
            issues.push({
              severity: 'warning',
              type: 'out_of_view',
              message: `Shape "${b.text || b.type}" at (${Math.round(b.x)}, ${Math.round(b.y)}) may be outside typical viewport`,
              shapeIds: [b.id],
            })
          }
        }

        // 5. Summary stats
        const shapeCount = allBounds.filter(b => b.type !== 'arrow' && b.type !== 'group').length
        const arrowCount = allBounds.filter(b => b.type === 'arrow').length
        const errorCount = issues.filter(i => i.severity === 'error').length
        const warningCount = issues.filter(i => i.severity === 'warning').length

        const xs = allBounds.filter(b => b.type !== 'arrow').map(b => b.x)
        const ys = allBounds.filter(b => b.type !== 'arrow').map(b => b.y)
        const maxXs = allBounds.filter(b => b.type !== 'arrow').map(b => b.x + b.w)
        const maxYs = allBounds.filter(b => b.type !== 'arrow').map(b => b.y + b.h)

        const canvasWidth = xs.length > 0 ? Math.round(Math.max(...maxXs) - Math.min(...xs)) : 0
        const canvasHeight = ys.length > 0 ? Math.round(Math.max(...maxYs) - Math.min(...ys)) : 0

        return {
          success: true,
          data: {
            summary: `${shapeCount} shapes, ${arrowCount} arrows. Canvas area: ${canvasWidth}×${canvasHeight}px. ${errorCount} errors, ${warningCount} warnings.`,
            issues,
            stats: { shapeCount, arrowCount, canvasWidth, canvasHeight, errorCount, warningCount },
          },
        }
      } catch (error) {
        return { success: false, error: `Validation failed: ${error}` }
      }
    },
  }
}
