import React, { useEffect, useState, useCallback } from "react";
import { useMeetingContext } from "./MeetingProvider";
import MeetingChat, { MeetingChatMessage } from "./MeetingChat";
import { child, push, onChildAdded, DatabaseReference } from "firebase/database";
import { useAuthContext } from "@/auth/AuthProvider";

interface MeetingChatContainerProps {
  meetingRef: DatabaseReference;
}

export const MeetingChatContainer: React.FC<MeetingChatContainerProps> = ({ meetingRef }) => {
  const { myId, peerInfos } = useMeetingContext();
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<MeetingChatMessage[]>([]);

  // Listen for new messages
  useEffect(() => {
    const chatRef = child(meetingRef, "chat");
    setMessages([]); // reset on meeting change
    const handle = onChildAdded(chatRef, (snap) => {
      const msg = snap.val();
      // Получаем displayName из peerInfos или из user (если это наше сообщение)
      let displayName = msg.displayName;
      if (!displayName) {
        if (msg.sender === myId && user?.displayName) {
          displayName = user.displayName;
        } else if (peerInfos) {
          displayName = peerInfos[msg.sender]?.displayName;
        }
      }
      setMessages((prev) => [
        ...prev,
        {
          id: snap.key!,
          sender: msg.sender,
          text: msg.text,
          timestamp: msg.timestamp,
          displayName,
        },
      ]);
    });
    return () => handle();
  }, [meetingRef, peerInfos, myId, user]);

  // Send message
  const handleSend = useCallback(
    (text: string) => {
      const chatRef = child(meetingRef, "chat");
      push(chatRef, {
        sender: myId,
        text,
        timestamp: Date.now(),
        displayName: user?.displayName || user?.email || myId,
      });
    },
    [meetingRef, myId, user]
  );

  return <MeetingChat myId={myId} messages={messages} onSend={handleSend} />;
};

export default MeetingChatContainer;
