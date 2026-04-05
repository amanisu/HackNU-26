import React, { useState } from "react";
import styles from "./GeminiTextPanel.module.scss";
import { useGeminiApi } from "@/ai";
import { useEditor } from "tldraw";
import { executeAICommand } from "@/tools/canvas-ai-commander";
import { ToolRegistry } from "@/tools/registry";

interface GeminiTextPanelProps {
  editor: any;
}

export const GeminiTextPanel: React.FC<GeminiTextPanelProps> = ({ editor }) => {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ai = useGeminiApi();
  let registry: ToolRegistry | undefined;
  try {
    registry = (ToolRegistry as any).instance;
  } catch (e) {
    setResponse("Tool registry is not available. Please check your setup.");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      if (!registry) {
        setResponse("Tool registry is not available. Please check your setup.");
        setLoading(false);
        return;
      }
      const result = await executeAICommand(
        { editor, registry, ai },
        input.trim()
      );
      setResponse(result.response || "No response");
    } catch (err: any) {
      setResponse(err.message || "Error");
    }
    setLoading(false);
    setInput("");
  };

  return (
    <div className={styles.geminiTextPanel}>
      {/* Нет кнопки закрытия/скрытия! */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Gemini to create or edit on canvas..."
          className={styles.input}
          disabled={loading}
        />
        <button type="submit" className={styles.button} disabled={loading || !input.trim()}>
          {loading ? "Generating..." : "Send"}
        </button>
      </form>
      {response && <div className={styles.response}>{response}</div>}
    </div>
  );
};

export default GeminiTextPanel;
