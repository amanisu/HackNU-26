/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Spinner } from "@radix-ui/themes";
import cn from "classnames";
import { useEffect, useState } from "react";
import { useStreamVolume } from "../audio-util/use-stream-volume";
import { useBubble } from "./BubbleContainer";
import styles from "./ParticipantBubble.module.scss";
import { Orb } from "@/live/components/Orb";
import GeminiIcon from "@/icons/GeminiIcon";

const DEFAULT_SIZE = 120;

export function ParticipantBubble({
  stream,
  flip,
  muted,
  label,
  className,
  color,
  isGemini,
}: {
  stream?: MediaStream;
  flip?: boolean;
  muted?: boolean;
  label?: string;
  color?: string;
  className?: string;
  isGemini?: boolean;
}) {
  const { bubble, mouseProps, setScale } = useBubble({
    radius: isGemini ? DEFAULT_SIZE / 3 : DEFAULT_SIZE / 2,
  });
  const [container, setContainer] = useState<HTMLDivElement>();
  const [node, setNode] = useState<HTMLVideoElement>();
  const volume = useStreamVolume(stream, { dampAlpha: 0.5 });

  useEffect(() => {
    if (!node) return;
    node.srcObject = stream || null;
  }, [stream, node]);

  useEffect(() => {
    if (!container) return;
    let abort = new AbortController();
    container.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        if (ev.deltaY !== 0) {
          setScale((scale) => {
            let deltaY = Math.abs(ev.deltaY) < 15 ? ev.deltaY * 10 : ev.deltaY;
            return Math.min(Math.max(0.5, scale - deltaY * 0.001), 3);
          });
        }
      },
      { passive: false, signal: abort.signal }
    );
    return () => abort.abort();
  }, [container]);

  return (
    <div
      className={cn(styles.bubble, className, { [styles.isGemini]: isGemini })}
      ref={(node) => setContainer(node || undefined)}
      style={{
        position: "fixed",
        left: bubble.posX,
        top: bubble.posY,
        cursor: "grab",
        ["--bubble-color" as any]: color || "white",
        ["--size" as any]: `${bubble.scale * bubble.radius * 2}px`,
        ["--scale" as any]: bubble.scale,
        ["--volume" as any]: volume,
      }}
      {...mouseProps}
    >
      <div className={styles.mediaContainer}>
        {stream && (
          <video
            className={cn(styles.video, {
              [styles.isFlipped]: flip,
            })}
            ref={(node) => setNode(node || undefined)}
            muted={muted}
            autoPlay
          />
        )}
        {isGemini && (
          <Orb
            className={styles.geminiOrb}
            aiVolume={volume}
            userVolume={0}
            connected={true}
          >
            <GeminiIcon className={styles.geminiSpark} />
          </Orb>
        )}
      </div>
      {label && <div className={styles.label}>{label}</div>}
      {!stream && <Spinner size="3" className={styles.loading} />}
    </div>
  );
}
