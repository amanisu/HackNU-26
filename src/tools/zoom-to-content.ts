import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createZoomToContentTool(): ToolDefinition {
  return {
    name: 'zoom_to_content',
    description:
      'Zoom and pan the viewport to fit all shapes on the current page. Call this after creating a diagram so the user can see everything.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: (editor: Editor): ToolResult => {
      try {
        const shapes = editor.getCurrentPageShapes()
        if (shapes.length === 0) {
          return { success: true, data: { message: 'No shapes on canvas to zoom to.' } }
        }

        editor.zoomToFit({ animation: { duration: 300 } })

        const camera = editor.getCamera()
        return {
          success: true,
          data: {
            message: `Viewport adjusted to fit ${shapes.length} shapes.`,
            zoom: Math.round(camera.z * 100) + '%',
          },
        }
      } catch (error) {
        return { success: false, error: `Failed to zoom to content: ${error}` }
      }
    },
  }
}
