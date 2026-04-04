/**
 * useTextToSpeech Hook
 * Handles text-to-speech synthesis with browser Web Speech API
 */

import { useCallback, useRef } from "react";

export interface UseTextToSpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export const useTextToSpeech = (options?: UseTextToSpeechOptions) => {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isActiveRef = useRef(false);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!synth) {
        console.warn("Text-to-Speech not supported");
        return false;
      }

      // Cancel any existing speech
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.lang || "en-US";
      utterance.rate = options?.rate || 1;
      utterance.pitch = options?.pitch || 1;
      utterance.volume = options?.volume || 1;

      utterance.onstart = () => {
        isActiveRef.current = true;
      };

      utterance.onend = () => {
        isActiveRef.current = false;
        onEnd?.();
      };

      utterance.onerror = (event) => {
        isActiveRef.current = false;
        console.error("Speech synthesis error:", event);
        onEnd?.();
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
      return true;
    },
    [synth, options?.lang, options?.rate, options?.pitch, options?.volume],
  );

  const stop = useCallback(() => {
    if (synth) {
      synth.cancel();
      isActiveRef.current = false;
    }
  }, [synth]);

  const isSpeaking = () => isActiveRef.current;

  return { speak, stop, isSpeaking };
};
