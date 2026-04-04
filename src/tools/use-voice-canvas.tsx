/**
 * useVoiceCanvas Hook
 * React hook for voice-based canvas management
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "tldraw";
import { useGeminiApi } from "@/ai";
import {
  executeVoiceCommand,
  type VoiceCommandResult,
  type VoiceCommandContext,
} from "./voice-command-parser";
import { executeAICommand } from "./canvas-ai-commander";
import { ToolRegistry } from "./registry";

export interface UseVoiceCanvasOptions {
  editor?: Editor;
  useAI?: boolean;
}

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  lastCommand?: VoiceCommandResult;
  error?: string;
  commandHistory: VoiceCommandResult[];
}

const TRANSCRIPT_TIMEOUT = 3000; // Clear transcript after 3s of silence

export function useVoiceCanvas(options: UseVoiceCanvasOptions = {}) {
  const { editor, useAI = true } = options;
  let ai: any = null;
  try {
    ai = useAI ? useGeminiApi() : null;
  } catch (err) {
    // AI not available, will use quick commands only
    ai = null;
  }
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    transcript: "",
    commandHistory: [],
  });

  const registryRef = useRef(new ToolRegistry());
  const recognitionRef = useRef<any>(null);
  const transcriptTimeoutRef = useRef<number | null>(null);

  // Initialize tool registry with editor
  useEffect(() => {
    if (editor) {
      registryRef.current.setEditor(editor);
    }
  }, [editor]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setState((prev) => ({
        ...prev,
        error: "Speech Recognition not supported in this browser",
      }));
      return;
    }

    const recognition = new SpeechRecognitionAPI() as any;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.language = "en-US";

    recognition.onstart = () => {
      setState((prev) => ({ ...prev, isListening: true, error: undefined }));
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          handleFinalTranscript(transcript);
        } else {
          interimTranscript += transcript;
        }
      }

      setState((prev) => ({
        ...prev,
        transcript: interimTranscript,
      }));
    };

    recognition.onerror = (event: any) => {
      setState((prev) => ({
        ...prev,
        error: `Speech recognition error: ${event.error}`,
      }));
    };

    recognition.onend = () => {
      setState((prev) => ({ ...prev, isListening: false }));
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const handleFinalTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      setState((prev) => ({
        ...prev,
        transcript: "",
        isProcessing: true,
      }));

      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }

      try {
        let result: VoiceCommandResult;

        if (useAI && ai && editor) {
          // Try AI first for complex commands
          const aiResult = await executeAICommand(
            {
              editor,
              registry: registryRef.current,
              ai,
            },
            transcript,
          );

          // If AI succeeded, use that result
          if (aiResult.success) {
            result = {
              success: aiResult.success,
              commandText: transcript,
              data: aiResult.executionResult?.data || aiResult.response,
              error: aiResult.error,
              parsedCommand: aiResult.command,
            };
          } else {
            // AI failed, try quick commands as fallback
            const context: VoiceCommandContext = {
              editor,
              registry: registryRef.current,
            };

            result = await executeVoiceCommand(context, transcript);
          }
        } else if (editor) {
          // Use quick command parsing only
          const context: VoiceCommandContext = {
            editor,
            registry: registryRef.current,
          };

          result = await executeVoiceCommand(context, transcript);
        } else {
          result = {
            success: false,
            error: "Editor not initialized",
            commandText: transcript,
          };
        }

        setState((prev) => ({
          ...prev,
          lastCommand: result,
          commandHistory: [result, ...prev.commandHistory.slice(0, 19)], // Keep last 20
          error: result.error,
          isProcessing: false,
        }));

        // Auto-clear transcript after timeout
        transcriptTimeoutRef.current = window.setTimeout(() => {
          setState((prev) => ({ ...prev, transcript: "" }));
        }, TRANSCRIPT_TIMEOUT);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Unknown error",
          isProcessing: false,
        }));
      }
    },
    [useAI, ai, editor],
  );

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  const clearHistory = useCallback(() => {
    setState((prev) => ({
      ...prev,
      commandHistory: [],
      lastCommand: undefined,
    }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    clearHistory,
  };
}
