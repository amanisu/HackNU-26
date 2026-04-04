/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { arrayBufferToBase64 } from "@/audio-util/audio-recorder";
import { useAudioReader } from "@/audio-util/use-audio-reader";
import { useAuthContext } from "@/auth/AuthProvider";
import { useLiveAPIContext } from "@/live/LiveAPI";
import {
  child,
  DatabaseReference,
  onDisconnect,
  onValue,
  set,
  update,
} from "firebase/database";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RTCFireSession, rtcFireSession } from "./rtcfire";
import { MeetingOverlay } from "./MeetingOverlay";
import { usePresenceContext } from "@/collab/PresenceProvider";

const MeetingContext = createContext<MeetingContext | undefined>({} as any);

type MeetingStatus = "not-started" | "started" | "joined";

export type MeetingContext = {
  // events: EventTarget; // if needed
  // core state
  status: MeetingStatus;
  myId: string;
  peerInfos?: Record<string, ParticipantInfo>;
  // normal camera/mic streams
  myStream?: MediaStream;
  peerStreams?: Record<string, MediaStream | undefined>;
  // gemini live stream
  myGeminiStream?: MediaStream;
  peerGeminiStreams?: Record<string, MediaStream | undefined>;
  activeGeminiPid?: string;
  // methods
  join: () => void;
  leave: () => void;
};

type ParticipantInfo = {
  joined: true;
  uid: string;
  displayName: string;
  geminiSideStreamId?: string | null;
};

// in case we're not using presence, use our own tab ID
const TAB_ID = String(Math.floor(Math.random() * 9999));

export function MeetingProvider({
  meetingRef,
  children,
}: PropsWithChildren<{
  meetingRef: DatabaseReference;
}>) {
  const { user } = useAuthContext();
  const presence = usePresenceContext();
  const myId = presence?.clientId || `${user?.uid}:${TAB_ID}`;

  const [joined, setJoined] = useState(false); // declares intention to be in or not be in meeting
  const [meetingRunning, setMeetingRunning] = useState(false);
  const { session, outputStream: myGeminiStream } = useLiveAPIContext();
  const [myStream, setMyStream] = useState<MediaStream>();
  const [participantInfos, setParticipantInfos] = useState<
    Record<string, ParticipantInfo>
  >({});
  const peerInfos = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(participantInfos).filter(([k]) => k !== myId)
      ),
    [participantInfos, myId]
  );
  const [peerStreams, setPeerStreams] = useState<
    Record<string, MediaStream | undefined>
  >({});

  // gemini live streaming (if anyone, including the current user, is connected to gemini)
  // list of peers who have a gemini side stream (should ideally only ever be one at a time)
  const [peerGeminiStreams, setPeerGeminiStreams] = useState<
    Record<string, MediaStream | undefined>
  >({});
  // the ID of the participant (could be current user) that's streaming gemini
  const [activeGeminiPid, setActiveGeminiPid] = useState<string>();

  const meetingContext = useMemo<MeetingContext>(
    () => ({
      myId,
      peerInfos,
      myStream,
      peerStreams,
      myGeminiStream,
      activeGeminiPid,
      peerGeminiStreams,
      status: !meetingRunning ? "not-started" : joined ? "joined" : "started",
      join: () => setJoined(true),
      leave: () => {
        setJoined(false);
        setMyStream(undefined);
        setPeerStreams({});
        setParticipantInfos({});
        setActiveGeminiPid(undefined);
        setPeerGeminiStreams({});
      },
    }),
    [
      myId,
      meetingRunning,
      joined,
      peerInfos,
      myStream,
      peerStreams,
      myGeminiStream,
      activeGeminiPid,
      peerGeminiStreams,
    ]
  );

  // keep meeting running state in sync with actual participation
  useEffect(() => {
    const hasParticipants = joined || !!Object.keys(participantInfos).length;
    if (!meetingRunning && hasParticipants) {
      setMeetingRunning(true);
    } else if (meetingRunning && !hasParticipants) {
      setMeetingRunning(false);
    }
  }, [participantInfos, joined, meetingRunning]);

  let participantsRef = useMemo(
    () => child(meetingRef, "participants"),
    [String(meetingRef)]
  );

  useAudioReader(
    joined && session
      ? ([myStream, ...Object.values(peerStreams)].filter(
          Boolean
        ) as MediaStream[])
      : [],
    (arrayBuffer) => {
      session?.sendRealtimeInput({
        audio: {
          mimeType: "audio/pcm;rate=16000",
          data: arrayBufferToBase64(arrayBuffer),
        },
      });
    },
    [joined, myStream, peerStreams, session]
  );

  const sessionRef = useRef<RTCFireSession>();

  useEffect(() => {
    let unsub = onValue(participantsRef, (snap) => {
      let participantInfos = (snap.val() || {}) as Record<
        string,
        ParticipantInfo
      >;
      setParticipantInfos(participantInfos);
      setActiveGeminiPid(
        Object.entries(participantInfos).find(
          ([, v]) => v?.geminiSideStreamId
        )?.[0]
      );
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!joined) return;

    let abort = new AbortController();
    let participantInfos: Record<string, ParticipantInfo> = {};

    console.log("my side stream is", myGeminiStream?.id);
    let session = (sessionRef.current = rtcFireSession({
      myId,
      negotiationRef: child(meetingRef, "negotiations"),
      sideStream: myGeminiStream,
      onMyStream: (stream) => setMyStream(stream),
      onParticipantStream: (pid, stream) => {
        console.log("onParticipantStream", pid, stream?.id);
        if (stream && stream.id === participantInfos[pid]?.geminiSideStreamId) {
          setPeerGeminiStreams((prev) => {
            let f = {
              ...prev,
              [pid]: stream || undefined,
            };
            console.log(
              "peerGeminiStreams",
              Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.id]))
            );
            return f;
          });
        } else {
          setPeerStreams((prev) => ({ ...prev, [pid]: stream || undefined }));
        }
      },
    }));

    abort.signal.addEventListener("abort", () => {
      sessionRef.current = undefined;
      session.close();
    });

    let meRef = child(participantsRef, myId);
    update(meRef, {
      joined: true,
      displayName: user?.displayName || myId,
      uid: user?.uid || "",
      geminiSideStreamId: myGeminiStream?.id || null,
    } satisfies ParticipantInfo);
    let disc = onDisconnect(meRef);
    disc.set(null);
    abort.signal.addEventListener("abort", () => {
      set(meRef, null);
      disc.cancel();
    });

    let unsub = onValue(participantsRef, (snap) => {
      participantInfos = snap.val() || {};
      session.participants = Object.keys(participantInfos);
    });
    abort.signal.addEventListener("abort", unsub);

    window.addEventListener("beforeunload", () => session?.close(), abort);
    return () => abort.abort();
  }, [joined, user, String(meetingRef), myId, myGeminiStream]);

  return (
    <MeetingContext.Provider value={meetingContext}>
      {joined && <MeetingOverlay />}
      {children}
    </MeetingContext.Provider>
  );
}

export const useMeetingContext = () => {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error("useMeetingContext must be used wihin a MeetingProvider");
  }

  return context;
};
