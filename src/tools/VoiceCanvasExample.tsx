/**
 * Example: Integrating Voice Assistant into Canvas
 *
 * This file shows how to integrate the VoiceAssistant component
 * with your existing canvas and editor.
 */

import React, { useState } from "react";
import type { Editor } from "tldraw";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { VoiceAssistant } from "./VoiceAssistant";
import styles from "./VoiceCanvasExample.module.scss";

/**
 * Example 1: Simple integration with tldraw Canvas
 */
export function SimpleVoiceCanvasExample() {
  const [editor, setEditor] = useState<Editor | null>(null);

  return (
    <div className={styles.container}>
      <div className={styles.canvasContainer}>
        <Tldraw onMount={setEditor} />
      </div>

      {editor && (
        <div className={styles.sidePanel}>
          <VoiceAssistant
            editor={editor}
            useAI={true}
            onCommand={(cmd) => {
              console.log("Command executed:", cmd);
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: Advanced integration with custom handler
 */
export function AdvancedVoiceCanvasExample({
  onCommandSuccess,
  onCommandError,
}: {
  onCommandSuccess?: (cmd: any) => void;
  onCommandError?: (error: string) => void;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [commandLog, setCommandLog] = useState<string[]>([]);

  const handleCommand = (cmd: any) => {
    const logEntry = `${new Date().toLocaleTimeString()} - ${cmd.commandText}`;
    setCommandLog((prev) => [logEntry, ...prev.slice(0, 9)]);

    if (cmd.success) {
      onCommandSuccess?.(cmd);
    } else {
      onCommandError?.(cmd.error);
    }
  };

  return (
    <div className={styles.advancedContainer}>
      <div className={styles.mainArea}>
        <div className={styles.canvasContainer}>
          <Tldraw onMount={setEditor} />
        </div>

        {editor && (
          <div className={styles.controlPanel}>
            <VoiceAssistant
              editor={editor}
              useAI={true}
              onCommand={handleCommand}
            />

            <div className={styles.commandLog}>
              <h3>Recent Commands</h3>
              <ul>
                {commandLog.map((entry, i) => (
                  <li key={i}>{entry}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Example 3: Using voice assistant without UI component
 */
import { useVoiceCanvas } from "./use-voice-canvas";

export function ProgrammaticVoiceCanvasExample() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const {
    isListening,
    transcript,
    lastCommand,
    toggleListening,
    commandHistory,
  } = useVoiceCanvas({
    editor: editor || undefined,
    useAI: true,
  });

  return (
    <div className={styles.container}>
      <div className={styles.canvasContainer}>
        <Tldraw onMount={setEditor} />
      </div>

      <div className={styles.customUI}>
        <button onClick={toggleListening}>
          {isListening ? "🎤 Stop" : "🎤 Speak"}
        </button>

        {transcript && <p>Hearing: {transcript}</p>}

        {lastCommand && (
          <div>
            <p>Command: {lastCommand.commandText}</p>
            <p>Status: {lastCommand.success ? "✓ Success" : "✗ Failed"}</p>
            {!lastCommand.success && <p>Error: {lastCommand.error}</p>}
          </div>
        )}

        <details>
          <summary>History ({commandHistory.length})</summary>
          <ul>
            {commandHistory.map((cmd, i) => (
              <li key={i}>
                {cmd.commandText} - {cmd.success ? "✓" : "✗"}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}

/**
 * Example 4: Mini voice command widget
 */
export function MiniVoiceWidget({ editor }: { editor: Editor }) {
  const { isListening, toggleListening, lastCommand } = useVoiceCanvas({
    editor,
    useAI: false, // Use quick commands only for minimal overhead
  });

  return (
    <div className={styles.miniWidget}>
      <button
        className={`${styles.fab} ${isListening ? styles.active : ""}`}
        onClick={toggleListening}
        title="Click to speak"
      >
        🎤
      </button>

      {lastCommand && (
        <div
          className={`${styles.toast} ${lastCommand.success ? styles.success : styles.error}`}
        >
          {lastCommand.success ? "✓" : "✗"} {lastCommand.commandText}
        </div>
      )}
    </div>
  );
}

/**
 * Example 5: Voice assistant with keyboard shortcuts
 */
export function KeyboardAwareVoiceCanvas({ editor }: { editor: Editor }) {
  const {
    isListening,
    toggleListening,
    transcript,
    lastCommand,
    clearHistory,
  } = useVoiceCanvas({ editor, useAI: true });

  // Register keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space to toggle voice listening
      if (e.code === "Space" && e.ctrlKey) {
        e.preventDefault();
        toggleListening();
      }

      // Escape to clear history
      if (e.code === "Escape") {
        clearHistory();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleListening, clearHistory]);

  return (
    <div className={styles.container}>
      <div className={styles.canvasContainer}>
        <Tldraw onMount={() => {}} />
      </div>

      <div className={styles.hud}>
        <div className={styles.status}>
          {isListening && (
            <>
              <span className={styles.pulse}>🎤 Listening...</span>
              {transcript && <p className={styles.transcript}>{transcript}</p>}
            </>
          )}

          {!isListening && lastCommand && (
            <div className={styles.lastCmd}>
              <p>{lastCommand.commandText}</p>
              {lastCommand.success ? (
                <p className={styles.success}>✓ Executed</p>
              ) : (
                <p className={styles.error}>✗ {lastCommand.error}</p>
              )}
            </div>
          )}
        </div>

        <div className={styles.hint}>
          Press <code>Ctrl+Space</code> to toggle voice | <code>Esc</code> to
          clear
        </div>
      </div>
    </div>
  );
}
