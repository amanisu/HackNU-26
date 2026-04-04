/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioRecorder } from "@/audio-util/audio-recorder";
import { forwardRef, memo, useEffect, useMemo, useState } from "react";
import { useLiveAPIContext } from "./LiveAPI";
import { Orb } from "./components/Orb";
import { useMeetingContext } from "@/meetings/MeetingProvider";
import AudioBars from "./components/AudioBars";
import styles from "./LiveButton.module.scss";

export type Props = React.HTMLAttributes<HTMLButtonElement>;

const LiveButton = forwardRef<HTMLButtonElement, Props>(({ ...props }, ref) => {
  const [userVolume, setUserVolume] = useState(0);
  const audioRecorder = useMemo(() => new AudioRecorder(), []);

  const { session, connected, connect, disconnect, volume, outputStream } =
    useLiveAPIContext();
  const { status } = useMeetingContext();

  // if gemini is in a meeting, it's going to get its input audio from
  // the meeting provider instead
  const geminiLiveInMeeting = status === "joined";

  useEffect(() => {
    if (geminiLiveInMeeting) return;
    const abort = new AbortController();
    if (connected && audioRecorder) {
      audioRecorder.addEventListener(
        "data",
        (event: Event) =>
          session?.sendRealtimeInput({
            audio: {
              mimeType: "audio/pcm;rate=16000",
              data: (event as CustomEvent).detail,
            },
          }),
        abort
      );
      audioRecorder.addEventListener(
        "volume",
        (event: Event) => setUserVolume((event as CustomEvent).detail),
        abort
      );
      audioRecorder.start();
    } else {
      audioRecorder.stop();
    }
    return () => abort.abort();
  }, [geminiLiveInMeeting, connected, session, audioRecorder]);

  useEffect(() => {
    if (!outputStream || !connected || geminiLiveInMeeting) return;
    // Use Web Audio API to play the MediaStream instead of an <audio> element.
    // Chrome's <audio> element has a jitter buffer that speeds up MediaStream
    // playback to "catch up" to the live edge, causing pitch/speed artifacts.
    let playbackCtx = new AudioContext();
    let source = playbackCtx.createMediaStreamSource(outputStream);
    source.connect(playbackCtx.destination);
    return () => {
      source.disconnect();
      playbackCtx.close();
    };
  }, [connected, outputStream, geminiLiveInMeeting]);

  return (
    <Orb
      ref={ref}
      {...props}
      aiVolume={volume}
      userVolume={userVolume}
      connected={connected}
      onClick={() => (connected ? disconnect() : connect())}
    >
      <AudioBars
        className={styles.bars}
        active={connected}
        volume={userVolume || 0}
      />
    </Orb>
  );
});

export default memo(LiveButton);