import React, { useState } from "react";
import styles from "./AssistantChatTabs.module.scss";
import GeminiTextPanel from "./GeminiTextPanel";
import { MeetingChatContainer } from "./MeetingChatContainer";
import type { Editor } from "tldraw";

interface AssistantChatTabsProps {
  editor: Editor;
  meetingRef: any;
}

export const AssistantChatTabs: React.FC<AssistantChatTabsProps> = ({ editor, meetingRef }) => {
  const [tab, setTab] = useState<"gemini" | "chat">("gemini");
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return (
      <button className={styles.showBtn} onClick={() => setVisible(true)} title="Show Assistant">☉</button>
    );
  }

  return (
    <div className={styles.tabsWindow}>
      <button className={styles.closeBtn} onClick={() => setVisible(false)} title="Close">×</button>
      <div className={styles.tabsHeader}>
        <button
          className={tab === "gemini" ? styles.active : ""}
          onClick={() => setTab("gemini")}
        >
          Gemini
        </button>
        <button
          className={tab === "chat" ? styles.active : ""}
          onClick={() => setTab("chat")}
        >
          Chat
        </button>
      </div>
      <div className={styles.tabsContent}>
        {tab === "gemini" ? (
          <GeminiTextPanel editor={editor} />
        ) : (
          <MeetingChatContainer meetingRef={meetingRef} />
        )}
      </div>
    </div>
  );
};

export default AssistantChatTabs;
