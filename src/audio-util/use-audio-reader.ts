/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { DependencyList, useCallback, useEffect } from "react";
import { makeAudioContext } from "./audio-context";
import { createWorketFromSrc } from "./audioworklet-registry";
import AudioRecordingWorklet from "./worklets/audio-processing.worklet?raw";

export function useAudioReader(
  streams: MediaStream[],
  onData: (data: ArrayBuffer) => void,
  deps?: DependencyList
) {
  const onDataCallback = useCallback(onData, deps || []);

  useEffect(() => {
    let streamsWithAudioTracks = streams.filter(
      (s) => s.getAudioTracks().length
    );
    if (!streamsWithAudioTracks.length) {
      return;
    }

    // TODO: doesnt seem to be muxing audio from everyone correctly :(
    // https://stackoverflow.com/questions/20532089/merging-mixing-two-audio-streams-with-webaudio

    let abort = new AbortController();
    let sampleRate = 16000;

    (async () => {
      let audioContext = await makeAudioContext({ sampleRate });
      if (abort.signal.aborted) return;
      let sources = streamsWithAudioTracks.map((stream) =>
        audioContext.createMediaStreamSource(stream)
      );
      abort.signal.addEventListener("abort", () =>
        sources.forEach((s) => s.disconnect())
      );
      let gains = sources.map((source) => {
        const gain = audioContext.createGain();
        gain.gain.value = 1.0;
        source.connect(gain);
        return gain;
      });

      // create a ChannelMergerNode to mix audio
      const merger = audioContext.createChannelMerger(gains.length);
      for (let [idx, src] of gains.entries()) {
        src.connect(merger, 0, idx); // connect to N'th input of the merger
      }

      // Split back to mono
      const splitter = audioContext.createChannelSplitter(2);
      merger.connect(splitter);

      // Create a final GainNode to mix both channels into mono
      const mixGain = audioContext.createGain();
      splitter.connect(mixGain, 0); // Left channel
      splitter.connect(mixGain, 1); // Right channel

      const recWorkletName = "recorder";
      await audioContext.audioWorklet.addModule(
        createWorketFromSrc(recWorkletName, AudioRecordingWorklet)
      );

      let recWorklet = new AudioWorkletNode(audioContext, recWorkletName);
      recWorklet.port.onmessage = (ev: MessageEvent) => {
        if (abort.signal.aborted) return;
        // worklet processes recording floats and messages converted buffer
        const arrayBuffer = ev.data.data.int16arrayBuffer;
        arrayBuffer && onData(arrayBuffer);
      };
      mixGain.connect(recWorklet);
      abort.signal.addEventListener("abort", () => {
        recWorklet.disconnect();
      });
    })();

    return () => abort.abort();
  }, [streams, onDataCallback]);
}
