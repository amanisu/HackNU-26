/**
 * VoiceChat Component
 * Minimal circular button for voice interaction
 */

import type React from "react";
import { useState, useRef, useEffect } from "react";
import type { Editor } from "tldraw";
import { useVoiceCanvas } from "./use-voice-canvas";
import { useTextToSpeech } from "./use-text-to-speech";

export interface VoiceChatProps {
  editor?: Editor;
  useAI?: boolean;
}

export const VoiceChat: React.FC<VoiceChatProps> = ({
  editor,
  useAI = true,
}) => {
  const { lastCommand } = useVoiceCanvas({ editor, useAI });

  const { speak } = useTextToSpeech({
    lang: "en-US",
    rate: 1,
  });

  const [, setIsSpeakingState] = useState(false);
  const lastCommandRefRef = useRef<string>("");

  // Speak the result when a command completes
  useEffect(() => {
    if (lastCommand && lastCommand.commandText !== lastCommandRefRef.current) {
      lastCommandRefRef.current = lastCommand.commandText;

      // Build response message
      let responseText = "";
      if (lastCommand.success) {
        responseText = `Done. ${lastCommand.parsedCommand?.explanation || "Command executed."}`;
      } else {
        responseText = `Failed. ${lastCommand.parsedCommand?.explanation || "Could not execute the command."}`;
      }

      // Speak the response
      setIsSpeakingState(true);
      speak(responseText, () => {
        setIsSpeakingState(false);
      });
    }
  }, [lastCommand, speak]);

  return null;
};

export default VoiceChat;
