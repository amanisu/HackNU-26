/**
 * capture_screenshot — Capture a screenshot of the current canvas.
 * Returns a base64 JPEG data URL that can be sent to vision-capable models.
 */

import type { Editor } from 'tldraw'
import type { ToolDefinition, ToolResult } from './types'

export function createCaptureScreenshotTool(): ToolDefinition {
  return {
    name: 'capture_screenshot',
    description:
      'Capture a screenshot of the current canvas as a JPEG image. Returns a base64 data URL. Use this to see what the canvas looks like after making changes, or to verify a diagram visually.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: async (editor: Editor, _params: Record<string, unknown>): Promise<ToolResult> => {
      try {
        const shapes = editor.getCurrentPageShapes()
        if (shapes.length === 0) {
          return {
            success: true,
            data: { note: 'Canvas is empty — no shapes to capture.' },
          }
        }

        const result = await editor.toImage(shapes, {
          format: 'jpeg',
          quality: 0.7,
          background: true,
          pixelRatio: 1,
        })

        // Convert blob to base64 data URL
        const arrayBuffer = await result.blob.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64 = btoa(binary)
        const dataUrl = `data:image/jpeg;base64,${base64}`

        return {
          success: true,
          data: {
            imageDataUrl: dataUrl,
            width: result.width,
            height: result.height,
            shapeCount: shapes.length,
          },
        }
      } catch (error) {
        // Fallback: return a text description of the canvas
        try {
          const shapes = editor.getCurrentPageShapes()
          const typeCounts: Record<string, number> = {}
          for (const s of shapes) {
            typeCounts[s.type] = (typeCounts[s.type] || 0) + 1
          }
          return {
            success: true,
            data: {
              note: 'Screenshot capture failed. Here is a text summary instead.',
              shapeCount: shapes.length,
              shapeCounts: typeCounts,
              error: String(error),
            },
          }
        } catch {
          return {
            success: false,
            error: `Failed to capture screenshot: ${error}`,
          }
        }
      }
    },
  }
}
