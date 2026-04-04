/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useGeminiApi } from "@/ai";
import { useAuthContext } from "@/auth/AuthProvider";
import { useDocumentContext } from "@/document/DocumentProvider";
import { Spinner } from "@radix-ui/themes";
import cn from "classnames";
import {
  child,
  DataSnapshot,
  onChildAdded,
  onChildChanged,
  onValue,
  update,
} from "firebase/database";
import { useEffect, useRef, useState } from "react";
import styles from "./MiniAppHost.module.scss";
import { compileMiniApp } from "./compiler";
import { AppToHostMessage, HostToAppMessage } from "./host-protocol";

export function MiniAppHost({
  namespace,
  appCode,
  className,
  onMouseMove,
}: {
  namespace: string;
  className?: string;
  appCode?: string;
  onMouseMove?: (x: number, y: number) => void;
}) {
  const { docRef, docLoading } = useDocumentContext();
  const appStateRef = child(docRef, `miniAppState/${namespace}`);
  let [iframe, setIframe] = useState<HTMLIFrameElement>();
  let [compiledAppHtml, setCompiledAppHtml] = useState("");
  let [compiling, setCompiling] = useState(true);
  let { user } = useAuthContext();
  let [error, setError] = useState("");
  const ai = useGeminiApi();

  // TODO: use useEffectEvent from React 19
  let onMouseMoveRef = useRef(onMouseMove);
  useEffect(() => {
    onMouseMoveRef.current = onMouseMove;
  }, [onMouseMove]);

  // compile app
  useEffect(() => {
    setError("");
    setCompiledAppHtml("");
    if (!appCode) return;
    let cancel = false;
    setCompiling(true);
    (async () => {
      try {
        let appHtml = await compileMiniApp(appCode);
        !cancel && setCompiledAppHtml(appHtml);
      } catch (e) {
        !cancel && setError(String((e as any)?.message || e));
      }
      setCompiling(false);
    })();
    return () => {
      cancel = true;
    };
  }, [appCode]);

  // host protocol implementation (over IFRAME messages)
  useEffect(() => {
    if (!iframe || !user || docLoading) return;
    let abort = new AbortController();
    let syncedState: Record<string, string> = {};
    let resolveInitialState: undefined | ((state: Record<string, any>) => void);
    let initSyncedStatePromise: Promise<Record<string, string>> = new Promise(
      (resolve) => void (resolveInitialState = resolve)
    );

    let unsub = onValue(appStateRef, (ss) => {
      if (resolveInitialState) {
        syncedState = ss.val() || {};
        resolveInitialState(syncedState);
        resolveInitialState = undefined;
      }
    });

    let postMessage = (msg: HostToAppMessage) => {
      iframe.contentWindow?.postMessage(msg, "*");
    };

    let childListener = (ss: DataSnapshot) => {
      syncedState[ss.key!] = ss.val();
      postMessage({
        type: "updateState",
        stateKey: ss.key!,
        valueJson: String(ss.val()),
      });
    };

    let unsub2 = onChildAdded(appStateRef, childListener);
    let unsub3 = onChildChanged(appStateRef, childListener);

    abort.signal.addEventListener("abort", () => {
      unsub();
      unsub2();
      unsub3();
    });

    window.addEventListener(
      "message",
      async (e) => {
        try {
          let data = (e as MessageEvent).data as AppToHostMessage;
          switch (data.type) {
            case "ready": {
              let syncedState = await initSyncedStatePromise;
              postMessage({
                type: "initialize",
                syncedState: Object.fromEntries(
                  Object.entries(syncedState).map(([k, v]) => [
                    k,
                    v === undefined ? null : JSON.parse(v),
                  ])
                ),
                user: {
                  color: "blue",
                  name: user.displayName || user.email || "Guest",
                },
              });
              break;
            }

            case "updateState": {
              syncedState[data.stateKey] = data.valueJson;
              update(appStateRef, { [data.stateKey]: data.valueJson });
              break;
            }

            case "mouseMove": {
              onMouseMoveRef.current?.(data.x, data.y);
              break;
            }

            case "aiGenerateContent": {
              let { requestId } = data || {};
              try {
                let stream = await ai.models.generateContentStream({
                  ...data.gcr,
                  model: "gemini-3-flash-preview",
                });
                for await (let chunk of stream) {
                  if (!chunk.text) continue;
                  postMessage({
                    type: "aiGenerateContentResponse",
                    requestId: data.requestId,
                    chunk: chunk.text,
                  });
                }
              } catch (e) {
                console.warn(e);
                postMessage({
                  type: "aiGenerateContentResponse",
                  requestId: data.requestId,
                  error: String((e as any)?.message || e),
                });
              } finally {
                postMessage({
                  type: "aiGenerateContentResponse",
                  requestId,
                  done: true,
                });
              }
              break;
            }
          }
        } catch (e) {
          console.warn("Could not handle miniapp message", e);
        }
      },
      abort
    );
    return () => abort.abort();
  }, [iframe, user, docLoading, appStateRef]);

  return (
    <div className={cn(styles.viewer, className)}>
      {compiling && <Spinner className={styles.spinner} />}
      {!compiling && (
        <>
          {error && <pre>{error}</pre>}
          {compiledAppHtml && (
            <iframe
              ref={(node) => setIframe(node || undefined)}
              srcDoc={compiledAppHtml}
            />
          )}
        </>
      )}
    </div>
  );
}
