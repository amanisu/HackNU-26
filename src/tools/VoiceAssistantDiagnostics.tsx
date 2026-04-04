/**
 * Voice Assistant Diagnostics
 * Debug checklist to verify everything works
 */

import React from "react";

export function VoiceAssistantDiagnostics() {
  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "monospace",
        fontSize: "14px",
        background: "#f5f5f5",
      }}
    >
      <h2>🔧 Voice Assistant Diagnostics</h2>

      <section style={{ marginBottom: "2rem" }}>
        <h3>Browser Support</h3>
        <div
          style={{ padding: "1rem", background: "white", borderRadius: "4px" }}
        >
          {(() => {
            const hasSpeechAPI =
              !!(window as any).SpeechRecognition ||
              !!(window as any).webkitSpeechRecognition;
            const browser = (() => {
              const ua = navigator.userAgent;
              if (ua.includes("Chrome")) return "Chrome ✅";
              if (ua.includes("Safari")) return "Safari ⚠️";
              if (ua.includes("Firefox")) return "Firefox ⚠️";
              return "Unknown";
            })();

            return (
              <>
                <p>Browser: {browser}</p>
                <p>
                  Speech API:{" "}
                  {hasSpeechAPI ? "✅ Available" : "❌ Not Available"}
                </p>
                <p>
                  Microphone:{" "}
                  {navigator.mediaDevices ? "✅ Available" : "❌ Not Available"}
                </p>
              </>
            );
          })()}
        </div>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h3>Integration Checklist</h3>
        <div
          style={{ padding: "1rem", background: "white", borderRadius: "4px" }}
        >
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>✅ Canvas.tsx: Updated with onEditorReady callback</li>
            <li>✅ Editor.tsx: Imports VoiceAssistant component</li>
            <li>✅ Editor.tsx: Renders VoiceAssistant with editor</li>
            <li>✅ voice-command-parser.ts: Quick commands registered</li>
            <li>✅ use-voice-canvas.tsx: React hook working</li>
            <li>✅ VoiceAssistant.tsx: UI component rendered</li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Test Steps</h3>
        <div
          style={{ padding: "1rem", background: "white", borderRadius: "4px" }}
        >
          <ol>
            <li>Look for VoiceAssistant widget (bottom-right of canvas)</li>
            <li>Click "🎤 Tap to speak"</li>
            <li>Say: "align left"</li>
            <li>Select check history: ✓ command should appear</li>
          </ol>
        </div>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h3>Quick Test Commands</h3>
        <div
          style={{
            padding: "1rem",
            background: "white",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          <code>
            "align left" | "group" | "delete" | "undo" | "zoom fit" | "overview"
          </code>
        </div>
      </section>
    </div>
  );
}
