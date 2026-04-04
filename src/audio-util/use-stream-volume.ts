/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { makeAudioContext } from "./audio-context";
import { createWorketFromSrc } from "./audioworklet-registry";
import { invLerpClamped } from "./math";
import { useDampedValue } from "./use-damped-value";
import VolMeterWorklet from "./worklets/vol-meter.worklet?raw";

export function useStreamVolume(
  stream: MediaStream | undefined,
  { minRms = 0.01, maxRms = 0.1, dampAlpha = 0.5 } = {}
) {
  const [volume, setVolume] = useState(0);
  const dampedVolume = useDampedValue(volume, dampAlpha, 0);

  useEffect(() => {
    if (!stream) {
      setVolume(0);
      return;
    }
    let abort = new AbortController();
    let sampleRate = 16000;

    (async () => {
      let audioContext = await makeAudioContext({ sampleRate });
      if (abort.signal.aborted) return;
      let source = audioContext.createMediaStreamSource(stream);
      abort.signal.addEventListener("abort", () => source.disconnect());

      // vu meter worklet
      const vuWorkletName = "vu-meter";
      await audioContext.audioWorklet.addModule(
        createWorketFromSrc(vuWorkletName, VolMeterWorklet)
      );
      let vuWorklet = new AudioWorkletNode(audioContext, vuWorkletName);
      vuWorklet.port.onmessage = (ev: MessageEvent) => {
        setVolume(invLerpClamped(minRms, maxRms, ev.data.volume));
      };
      source.connect(vuWorklet);
      abort.signal.addEventListener("abort", () => {
        vuWorklet.disconnect();
      });
    })();

    return () => abort.abort();
  }, [stream]);

  return dampedVolume;
}
