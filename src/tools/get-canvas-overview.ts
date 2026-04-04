import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createGetCanvasOverviewTool(): ToolDefinition {
  return {
    name: 'get_canvas_overview',
    description: 'Returns a summary of all shapes on the current page, including shape counts by type, bounding box, and page name.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: (editor: Editor): ToolResult => {
      try {
        const shapes = editor.getCurrentPageShapes()
        const currentPage = editor.getCurrentPage()

        // Count shapes by type
        const shapeCounts: Record<string, number> = {}
        for (const shape of shapes) {
          const type = shape.type
          shapeCounts[type] = (shapeCounts[type] || 0) + 1
        }

        // Get bounding box of all shapes
        let bounds = null
        if (shapes.length > 0) {
          const allBounds = editor.getSelectionPageBounds()
          // Select all, get bounds, then deselect
          const selectedIds = editor.getSelectedShapeIds()
          editor.selectAll()
          const pageBounds = editor.getSelectionPageBounds()
          // Restore previous selection
          editor.setSelectedShapes(selectedIds)
          if (pageBounds) {
            bounds = {
              x: Math.round(pageBounds.x),
              y: Math.round(pageBounds.y),
              width: Math.round(pageBounds.w),
              height: Math.round(pageBounds.h),
            }
          }
        }

        return {
          success: true,
          data: {
            pageName: currentPage.name,
            pageId: currentPage.id,
            totalShapes: shapes.length,
            shapesByType: shapeCounts,
            bounds,
            shapes: shapes.map(s => ({
              id: s.id,
              type: s.type,
              x: Math.round(s.x),
              y: Math.round(s.y),
              ...(s.type === 'text' || s.type === 'note' || s.type === 'geo'
                ? { text: (s.props as Record<string, unknown>).text }
                : {}),
              ...(s.type === 'geo'
                ? { geo: (s.props as Record<string, unknown>).geo }
                : {}),
            })),
          },
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to get canvas overview: ${error}`,
        }
      }
    },
  }
}
