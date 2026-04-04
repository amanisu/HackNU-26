/**
 * VoiceAssistant Component
 * UI for voice-based canvas management
 */

import type React from "react";
import { useEffect, useRef } from "react";
import type { Editor } from "tldraw";
import { useVoiceCanvas } from "./use-voice-canvas";
import styles from "./VoiceAssistant.module.scss";

export interface VoiceAssistantProps {
  editor?: Editor;
  useAI?: boolean;
  onCommand?: (command: any) => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  editor,
  useAI = true,
  onCommand,
}) => {
  const {
    isListening,
    isProcessing,
    transcript,
    lastCommand,
    error,
    commandHistory,
    toggleListening,
    clearHistory,
  } = useVoiceCanvas({ editor, useAI });

  const historyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll history
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [commandHistory]);

  // Call onCommand callback
  useEffect(() => {
    if (lastCommand && onCommand) {
      onCommand(lastCommand);
    }
  }, [lastCommand, onCommand]);

  return (
    <div className={styles.voiceAssistant}>
      {/* Microphone Button */}
      <div className={styles.controls}>
        <button
          className={`${styles.micButton} ${isListening ? styles.listening : ""} ${
            isProcessing ? styles.processing : ""
          }`}
          onClick={toggleListening}
          title={isListening ? "Stop listening" : "Start listening"}
          disabled={isProcessing}
        >
          <span className={styles.micIcon}>🎤</span>
          <span className={styles.status}>
            {isProcessing
              ? "Processing..."
              : isListening
                ? "Listening..."
                : "Tap to speak"}
          </span>
        </button>

        <button
          className={styles.clearButton}
          onClick={clearHistory}
          title="Clear history"
          disabled={commandHistory.length === 0}
        >
          🗑️ Clear
        </button>
      </div>

      {/* Transcript Display */}
      {transcript && (
        <div className={styles.transcript}>
          <p className={styles.label}>Transcript:</p>
          <p className={styles.text}>{transcript}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          <p className={styles.label}>Error:</p>
          <p className={styles.text}>{error}</p>
        </div>
      )}

      {/* Last Command Result */}
      {lastCommand && (
        <div
          className={`${styles.commandResult} ${lastCommand.success ? styles.success : styles.failed}`}
        >
          <p className={styles.label}>Last Command:</p>
          <p className={styles.command}>"{lastCommand.commandText}"</p>
          {lastCommand.parsedCommand && (
            <div className={styles.details}>
              <p className={styles.tool}>
                Tool: {lastCommand.parsedCommand.toolName}
              </p>
              <p className={styles.explanation}>
                {lastCommand.parsedCommand.explanation}
              </p>
            </div>
          )}
          {lastCommand.success && <p className={styles.message}>✓ Success</p>}
          {!lastCommand.success && (
            <p className={styles.message}>✗ {lastCommand.error}</p>
          )}
        </div>
      )}

      {/* Command History */}
      <div className={styles.history}>
        <p className={styles.label}>History ({commandHistory.length})</p>
        <div ref={historyRef} className={styles.historyList}>
          {commandHistory.map((cmd, idx) => (
            <div
              key={idx}
              className={`${styles.historyItem} ${cmd.success ? styles.success : styles.failed}`}
            >
              <span className={styles.icon}>{cmd.success ? "✓" : "✗"}</span>
              <span className={styles.text}>{cmd.commandText}</span>
              {cmd.parsedCommand && (
                <span className={styles.tool}>
                  {cmd.parsedCommand.toolName}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Command List Reference */}
      <details className={styles.reference}>
        <summary>📚 Quick Commands Reference</summary>
        <div className={styles.referenceContent}>
          <h4>Alignment</h4>
          <ul>
            <li>"align left" - Align selected to left</li>
            <li>"align right" - Align selected to right</li>
            <li>"align top" - Align selected to top</li>
            <li>"align bottom" - Align selected to bottom</li>
            <li>"align center" - Align selected horizontally centered</li>
          </ul>

          <h4>Distribution</h4>
          <ul>
            <li>"distribute horizontal" - Distribute horizontally</li>
            <li>"distribute vertical" - Distribute vertically</li>
          </ul>

          <h4>Grouping</h4>
          <ul>
            <li>"group" - Group selected shapes</li>
            <li>"ungroup" - Ungroup selected shapes</li>
          </ul>

          <h4>Actions</h4>
          <ul>
            <li>"delete" - Delete selected shapes</li>
            <li>"undo" - Undo last action</li>
            <li>"redo" - Redo last action</li>
          </ul>

          <h4>Zoom</h4>
          <ul>
            <li>"zoom in" - Zoom in</li>
            <li>"zoom out" - Zoom out</li>
            <li>"zoom fit" - Fit to content</li>
          </ul>

          <h4>View</h4>
          <ul>
            <li>"overview" - Get canvas overview</li>
            <li>"selection" - Show selection info</li>
            <li>"screenshot" - Capture screenshot</li>
          </ul>

          {useAI && (
            <>
              <h4>AI Commands (Advanced)</h4>
              <p>You can also use natural language for more complex tasks:</p>
              <ul>
                <li>
                  "Make these three boxes aligned vertically and evenly spaced"
                </li>
                <li>"Group all the red shapes"</li>
                <li>"Delete everything except the selected items"</li>
              </ul>
            </>
          )}
        </div>
      </details>
    </div>
  );
};

export default VoiceAssistant;
