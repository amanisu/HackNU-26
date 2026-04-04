import type { Editor } from 'tldraw'

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown> // JSON Schema
  execute: (editor: Editor, params: Record<string, unknown>) => ToolResult | Promise<ToolResult>
}

export interface ToolCallEntry {
  id: string
  name: string
  params: Record<string, unknown>
  result?: unknown
  error?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: ToolCallEntry[]
  /** Which fairy generated this message (for visual attribution) */
  fairy?: string
}
