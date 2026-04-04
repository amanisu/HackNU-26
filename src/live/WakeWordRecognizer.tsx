/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as speechCommands from "@tensorflow-models/speech-commands";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgpu";
import { PropsWithChildren, useEffect, useMemo } from "react";

/**
 * Wake word recognizer powered by @tensorflow-models/speech-commands
 *
 * Example of training a voice model ("transfer" process) here:
 * https://storage.googleapis.com/tfjs-speech-model-test/2019-01-03a/dist/index.html
 *
 * You then need to download the weights and host them.
 */
export function WakeWordRecognizer({
  listening,
  modelUrl,
  children,
  onWake,
}: PropsWithChildren<{
  listening: boolean;
  modelUrl: string;
  onWake: (args: { word: string; score: number }) => void;
}>) {
  const bus = useMemo(() => new EventTarget(), []);

  useEffect(() => {
    let abort = new AbortController();
    bus.addEventListener(
      "wake",
      (evt) => {
        let { word, score } = (evt as CustomEvent).detail;
        onWake?.({ word, score });
      },
      abort
    );
    return () => abort.abort();
  }, [bus, onWake]);

  useEffect(() => {
    if (!listening) return;
    let recognizer: speechCommands.SpeechCommandRecognizer | undefined;
    let cancel = false;
    (async () => {
      let metadata = (await fetch(
        modelUrl.replace(/\.json/, ".metadata.json")
      ).then((r) => r.json())) as any;
      recognizer = speechCommands.create(
        "BROWSER_FFT",
        undefined,
        modelUrl,
        metadata
      );

      await tf.setBackend("webgpu");
      await recognizer.ensureModelLoaded();
      if (cancel) {
        return;
      }

      recognizer.listen(
        async (result) => {
          for (let [idx, label] of recognizer?.wordLabels().entries() || []) {
            if (label === speechCommands.BACKGROUND_NOISE_TAG) {
              continue;
            }
            bus.dispatchEvent(
              new CustomEvent("wake", {
                detail: {
                  word: label,
                  score: result.scores[idx],
                },
              })
            );
          }
        },
        { probabilityThreshold: 0.9 }
      );
    })();
    return () => {
      cancel = true;
      recognizer?.stopListening();
    };
  }, [modelUrl, listening, bus]);

  return children;
}
