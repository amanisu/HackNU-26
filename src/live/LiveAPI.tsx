/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useGeminiApi } from "@/ai";
import { Tool } from "@/ai/tools";
import { makeAudioContext } from "@/audio-util/audio-context";
import { AudioStreamer } from "@/audio-util/audio-streamer";
import { invLerpClamped } from "@/audio-util/math";
import VolMeterWorklet from "@/audio-util/worklets/vol-meter.worklet?raw";
import {
  FunctionDeclaration,
  FunctionResponse,
  LiveConnectConfig,
  LiveServerMessage,
  LiveServerToolCall,
  Modality,
  Session,
  TurnCompleteReason,
} from "@google/genai";
import {
  createContext,
  forwardRef,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import z from "zod";

export const DEFAULT_MODEL: KnownAudioModelName =
  "gemini-2.5-flash-native-audio-preview-12-2025";

/**
 * Native audio: Natural, realistic, better multilingual. Affective, emotion-aware dialogue,
 * proactive audio (where the model can decide to ignore or respond to certain inputs), and
 * "thinking".
 */
export type KnownNativeAudioModelName =
  | "gemini-2.5-flash-native-audio-preview-12-2025"
  | "gemini-2.5-flash-native-audio-preview-09-2025"
  | "gemini-2.5-flash-native-audio-dialog"
  | "gemini-2.5-flash-exp-native-audio-thinking-dialog";

/**
 * Half-cascade audio: This option uses a cascaded model architecture (native audio input and
 * text-to-speech output). It offers better performance and reliability in production
 * environments, especially with tool use.
 */
export type KnownHalfCascadeModelName =
  | "gemini-live-2.5-flash-preview"
  | "gemini-2.0-flash-live-001";

export type KnownAudioModelName =
  | KnownHalfCascadeModelName
  | KnownNativeAudioModelName;

declare global {
  // TODO: get official TS types
  interface Uint8ArrayConstructor {
    /**
     * Creates a new Uint8Array object from a base64-encoded string.
     * @param base64String The base64-encoded string to convert.
     * @param options Optional configuration for decoding, such as `strict` mode.
     */
    fromBase64(
      base64String: string,
      options?: { strict?: boolean },
    ): Uint8Array;
  }
  interface Uint8Array {
    toBase64(): string;
  }
}

const LiveAPIContext = createContext<LiveAPIContext | undefined>(undefined);

export type LiveAPIContext = {
  session: Session | undefined;
  events: EventTarget;
  connected: boolean;
  statusMessage?: string;
  outputStream?: MediaStream;
  volume: number;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const DEFAULT_VOICE_NAME = "Zephyr";

type KnownVoiceName =
  | "Zephyr"
  | "Puck"
  | "Charon"
  | "Kore"
  | "Fenrir"
  | "Leda"
  | "Orus"
  | "Aoede"
  | "Callirrhoe"
  | "Autonoe"
  | "Enceladus"
  | "Iapetus"
  | "Umbriel"
  | "Algieba"
  | "Despina"
  | "Erinome"
  | "Algenib"
  | "Rasalgethi"
  | "Laomedeia"
  | "Achernar"
  | "Alnilam"
  | "Schedar"
  | "Gacrux"
  | "Pulcherrima"
  | "Achird"
  | "Zubenelgenubi"
  | "Vindemiatrix"
  | "Sadachbia"
  | "Sadaltager"
  | "Sulafat";

export type LiveAPIProviderProps = {
  model?: KnownAudioModelName | (string & {});
  voiceName?: KnownVoiceName | (string & {});
  systemInstruction?: string;
  tools?: Tool<any>[];
  rawConfig?: LiveConnectConfig;
  customOutputStream?: boolean;
};

function useLiveAPI({
  systemInstruction,
  voiceName,
  model,
  tools,
  rawConfig,
  customOutputStream,
}: LiveAPIProviderProps): LiveAPIContext {
  const ai = useGeminiApi();

  // gemini's output audio
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const [volume, setVolume] = useState(0);
  const [outputStream, setOutputStream] = useState<MediaStream | undefined>();

  // live session info
  let sessionRef = useRef<Session>();
  let [connected, setConnected] = useState(false);
  let [statusMessage, setStatusMessage] = useState<string>();
  let events = useMemo(() => new EventTarget(), []);

  const config: LiveConnectConfig = useMemo(() => {
    return {
      systemInstruction,
      responseModalities: [Modality.AUDIO],
      proactivity: { proactiveAudio: true },
      // enableAffectiveDialog: true,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName || DEFAULT_VOICE_NAME },
        },
      },
      tools: tools
        ? [
            {
              functionDeclarations: tools.map(
                (t) =>
                  ({
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                      ? (z.toJSONSchema(t.parameters, {
                          target: "openapi-3.0",
                        }) as any)
                      : { type: "object" },
                  }) satisfies FunctionDeclaration,
              ),
            },
          ]
        : undefined,
      ...rawConfig,
    };
  }, [systemInstruction, tools, voiceName, rawConfig]);

  let connect = useCallback(async () => {
    if (!config) {
      throw new Error("Not configured");
    }

    let session: Session | undefined;
    try {
      let isCurrentSession = () => session === sessionRef.current;
      session = sessionRef.current = await ai.live.connect({
        model: model || DEFAULT_MODEL,
        config,
        callbacks: {
          onopen: () => {
            setConnected(true);
            setStatusMessage(undefined);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (!isCurrentSession()) return;
            const modelTurn = message.serverContent?.modelTurn;
            const audio = modelTurn?.parts?.[0]?.inlineData;
            const toolCall = message.toolCall;
            if (!audio) {
              // dont log audio, that would be spammy
              let summary = Object.keys(message).join(", ");
              if (message.serverContent) {
                summary =
                  "serverContent: " +
                  Object.keys(message.serverContent).join(", ");
              }
              console.log("non-audio message from gemini:", summary);
            }
            if (message.setupComplete) {
              events.dispatchEvent(new CustomEvent("setupcomplete"));
            }
            if (audio) {
              audioStreamerRef.current?.addPCM16(
                Uint8Array.fromBase64(audio.data || ""),
              );
            }
            if (message.serverContent?.turnComplete) {
              events.dispatchEvent(
                new CustomEvent("turncomplete", {
                  detail: message.serverContent.turnCompleteReason,
                }),
              );
            }
            if (message.serverContent?.interrupted) {
              audioStreamerRef.current?.stop();
            }
            if (toolCall) {
              events.dispatchEvent(
                new CustomEvent("toolcall", { detail: message.toolCall }),
              );
            }
          },
          onerror: (e: ErrorEvent) => {
            if (!isCurrentSession()) return;
            setConnected(false);
            setStatusMessage("Error: " + e.message);
            console.error(e.message);
          },
          onclose: (e: CloseEvent) => {
            if (!isCurrentSession()) return;
            setConnected(false);
            setStatusMessage(e.reason);
            if (e.reason) {
              console.warn("Closed because: ", e.reason);
            }
          },
        },
      });
    } catch (e) {
      console.error(e);
    }
  }, [ai, model, config, events]);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (audioStreamerRef.current) {
      return;
    }
    (async () => {
      let audioCtx = await makeAudioContext({ id: "audio-out" });
      audioStreamerRef.current = new AudioStreamer(audioCtx);
      setOutputStream(audioStreamerRef.current.outputStream);
      await audioStreamerRef.current.addWorklet<any>(
        "vumeter-out",
        VolMeterWorklet,
        (ev: any) => setVolume(invLerpClamped(0, 0.2, ev.data.volume)),
      );
    })();
  }, [ai]);

  useEffect(() => {
    let handler = async (e: Event) => {
      let toolCall = (e as CustomEvent).detail as LiveServerToolCall;
      console.log({ toolCall });
      let functionResponses = await Promise.all(
        (toolCall.functionCalls || []).map(async (fc) => {
          let foundTool = tools?.find((t) => t.name === fc.name);
          let result: any;
          try {
            if (!foundTool) throw new Error("Tool not found: " + fc.name);
            result = await foundTool.run(fc.args || {});
          } catch (e) {
            result = { status: "error", error: String(e) };
          }
          return {
            name: fc.name,
            id: fc.id,
            response: { result },
          } satisfies FunctionResponse;
        }),
      );
      console.log({ functionResponses });
      sessionRef.current?.sendToolResponse({
        functionResponses,
      });
    };
    let abort = new AbortController();
    events.addEventListener("toolcall", handler, abort);
    return () => abort.abort();
  }, [tools, events]);

  const disconnect = useCallback(async () => {
    sessionRef.current?.close();
    audioStreamerRef.current?.stop();
    setConnected(false);
  }, []);

  useEffect(() => {
    if (customOutputStream || !outputStream || !connected) return;
    // Use Web Audio API instead of <audio> element to avoid Chrome's
    // jitter buffer that causes pitch/speed artifacts on MediaStreams.
    let playbackCtx = new AudioContext();
    let source = playbackCtx.createMediaStreamSource(outputStream);
    source.connect(playbackCtx.destination);
    return () => {
      source.disconnect();
      playbackCtx.close();
    };
  }, [connected, customOutputStream, outputStream]);

  return {
    session: sessionRef.current,
    events,
    connected,
    statusMessage,
    outputStream: connected ? outputStream : undefined,
    connect,
    disconnect,
    volume,
  };
}

export const LiveAPI = forwardRef<
  LiveAPIContext,
  PropsWithChildren<
    LiveAPIProviderProps & {
      onSetupComplete?: () => void;
      onTurnComplete?: (reason?: TurnCompleteReason) => void;
    }
  >
>(({ children, onSetupComplete, onTurnComplete, ...props }, ref) => {
  const liveAPI = useLiveAPI(props);
  const { events } = liveAPI;
  useImperativeHandle(ref, () => liveAPI, [liveAPI]);

  useEffect(() => {
    if (!onTurnComplete && !onSetupComplete) return;
    let abort = new AbortController();
    events.addEventListener(
      "turncomplete",
      (e: Event) => onTurnComplete?.((e as CustomEvent).detail),
      abort,
    );
    events.addEventListener("setupcomplete", () => onSetupComplete?.(), abort);
    return () => abort.abort();
  }, [onTurnComplete, onSetupComplete, events]);

  return (
    <LiveAPIContext.Provider value={liveAPI}>
      {children}
    </LiveAPIContext.Provider>
  );
});

export const LiveAPIContextConsumer = LiveAPIContext.Consumer;

export const useLiveAPIContext = () => {
  const context = useContext(LiveAPIContext);
  if (!context) {
    throw new Error("useLiveAPIContext must be used wihin a LiveAPIProvider");
  }

  return context;
};
