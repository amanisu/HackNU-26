/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { usePresenceContext } from "@/collab/PresenceProvider";
import { BubbleContainer } from "./BubbleContainer";
import { useMeetingContext } from "./MeetingProvider";
import { ParticipantBubble } from "./ParticipantBubble";

const DEBUG = window.location.search.includes("debug");

export function MeetingOverlay() {
  const {
    myId,
    myStream,
    peerInfos,
    peerGeminiStreams,
    myGeminiStream,
    activeGeminiPid,
    peerStreams,
    status,
  } = useMeetingContext();
  const { peers } = usePresenceContext();

  if (status !== "joined") {
    return null;
  }

  return (
    <BubbleContainer>
      <ParticipantBubble muted flip stream={myStream} label="You" />
      {activeGeminiPid && (
        <ParticipantBubble
          label={DEBUG ? `Gemini (Peer ${activeGeminiPid})` : "Gemini"}
          isGemini
          stream={
            activeGeminiPid === myId
              ? myGeminiStream
              : peerGeminiStreams?.[activeGeminiPid]
          }
        />
      )}
      {Object.entries(peerInfos || {}).map(([pid, info]) => (
        <ParticipantBubble
          key={pid}
          label={info.displayName}
          color={peers?.find((p) => p.uid === info.uid)?.color}
          stream={peerStreams?.[pid]}
        />
      ))}
    </BubbleContainer>
  );
}
