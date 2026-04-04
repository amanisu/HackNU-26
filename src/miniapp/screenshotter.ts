/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { toPng } from "html-to-image";
import { compileMiniApp } from "./compiler";
import { AppToHostMessage, HostToAppMessage } from "./host-protocol";

export async function screenshotMiniApp(
  appCode: string,
  {
    width = 800,
    height = 600,
    timeoutMs = 10000,
  }: { width?: number; height?: number; timeoutMs?: number } = {}
): Promise<string> {
  let html = await compileMiniApp(appCode);

  let abort = new AbortController();
  let iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "-10000px";
  iframe.style.width = `${width}px`;
  iframe.style.height = `${height}px`;
  iframe.style.padding = "1px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);
  // await new Promise(resolve => setTimeout(resolve, 1000)); // give some extra time for rendering
  iframe.srcdoc = html;
  abort.signal.addEventListener("abort", () => iframe.remove());

  try {
    // await load
    await Promise.race([
      new Promise((resolve) =>
        iframe.addEventListener("load", resolve, { once: true })
      ),
      new Promise((_, reject) =>
        setTimeout(() => {
          reject(new Error("screenshotter: iframe load timeout"));
        }, timeoutMs)
      ),
    ]);

    // await ready message
    await new Promise<void>((resolve) => {
      window.addEventListener(
        "message",
        async (e) => {
          let data = (e as MessageEvent).data as AppToHostMessage;
          if (data?.type !== "ready") return;
          iframe.contentWindow?.postMessage(
            {
              type: "initialize",
              syncedState: {},
              user: {
                color: "blue",
                name: "Guest",
              },
            } satisfies HostToAppMessage,
            "*"
          );
          resolve();
        },
        abort
      );
    });

    // give some extra time for rendering
    await new Promise((resolve) => setTimeout(resolve, 500));

    let iframeWindow = iframe.contentWindow;
    let iframeDocument = iframe.contentDocument;
    if (!iframeWindow || !iframeDocument) {
      throw new Error("screenshotter: unable to access iframe content");
    }
    return await toPng(iframe.contentDocument!.body, {
      width,
      height,
      canvasWidth: width,
      canvasHeight: height,
      pixelRatio: 1,
      imagePlaceholder:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          '<svg width="1" height="1" fill="#888" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>'
        ),
    });
  } finally {
    abort.abort();
  }
}
