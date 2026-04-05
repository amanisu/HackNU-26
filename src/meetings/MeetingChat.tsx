import React, { useState, useRef, useEffect } from "react";
import { useMeetingContext } from "./MeetingProvider";
import styles from "./MeetingChat.module.scss";

export interface MeetingChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  displayName?: string;
}

interface MeetingChatProps {
  myId: string;
  messages: MeetingChatMessage[];
  onSend: (text: string) => void;
}

function formatTime(ts: number) {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const MeetingChat: React.FC<MeetingChatProps> = ({ myId, messages, onSend }) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { peerInfos, myId: contextMyId } = useMeetingContext();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  function getDisplayName(sender: string, displayName?: string) {
    if (sender === contextMyId) return "You";
    return displayName || peerInfos?.[sender]?.displayName || sender;
  }

  return (
    <div className={styles.meetingChat}>
      <div className={styles.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.sender === myId ? styles.myMessage : styles.otherMessage
            }
          >
            <span className={styles.sender}>{getDisplayName(msg.sender, msg.displayName)}</span>
            <span className={styles.text}>{msg.text}</span>
            <span className={styles.time}>{formatTime(msg.timestamp)}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className={styles.inputForm} onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className={styles.input}
        />
        <button type="submit" className={styles.sendButton}>
          Send
        </button>
      </form>
    </div>
  );
};

export default MeetingChat;
