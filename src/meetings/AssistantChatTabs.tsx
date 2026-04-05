import React, { useState } from "react";
import styles from "./AssistantChatTabs.module.scss";
import { VoiceAssistant } from "@/tools";
import { MeetingChatContainer } from "./MeetingChatContainer";
import type { Editor } from "tldraw";
import { child } from "firebase/database";

interface AssistantChatTabsProps {
  editor: Editor;
  meetingRef: any;
}

export const AssistantChatTabs: React.FC<AssistantChatTabsProps> = ({ editor, meetingRef }) => {
  const [tab, setTab] = useState<"assistant" | "chat">("assistant");

  return (
    <div className={styles.tabsWindow}>
      <div className={styles.tabsHeader}>
        <button
          className={tab === "assistant" ? styles.active : ""}
          onClick={() => setTab("assistant")}
        >
          Assistant
        </button>
        <button
          className={tab === "chat" ? styles.active : ""}
          onClick={() => setTab("chat")}
        >
          Chat
        </button>
      </div>
      <div className={styles.tabsContent}>
        {tab === "assistant" ? (
          <VoiceAssistant editor={editor} useAI={true} />
        ) : (
          <MeetingChatContainer meetingRef={meetingRef} />
        )}
      </div>
    </div>
  );
};

export default AssistantChatTabs;
