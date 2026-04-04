/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useDampedValue } from "@/audio-util/use-damped-value";
import { MeshGradient } from "@paper-design/shaders-react";
import cn from "classnames";
import {
  forwardRef,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from "react";
import styles from "./Orb.module.scss";

type Props = React.HTMLAttributes<HTMLButtonElement> &
  PropsWithChildren<{
    connected: boolean;
    aiVolume?: number;
    userVolume?: number;
    className?: string;
  }>;

export const Orb = forwardRef<HTMLButtonElement, Props>(
  (
    { children, aiVolume, userVolume, onClick, connected, className, ...props },
    ref
  ) => {
    const startFrame = useMemo(() => Math.random() * 100_000, []);
    const [button, setButton] = useState<HTMLButtonElement>();
    const [bgColors, setBgColors] = useState(["#fff"]);
    const [startingUp, setStartingUp] = useState(true);

    useEffect(() => {
      let to = setTimeout(() => setStartingUp(false), 2500);
      return () => clearTimeout(to);
    }, []);

    useEffect(() => {
      if (typeof ref === "function") {
        ref(button || null);
      } else if (ref) {
        ref.current = button || null;
      }
      if (!button) return;
      let cs = window.getComputedStyle(button);
      setBgColors(
        [
          cs.getPropertyValue("--orb-color-1") || "#fff",
          cs.getPropertyValue("--orb-color-2"),
          cs.getPropertyValue("--orb-color-3"),
          cs.getPropertyValue("--orb-color-4"),
          cs.getPropertyValue("--orb-color-5"),
        ].filter(Boolean)
      );
    }, [button]);

    const speed = useDampedValue(
      startingUp || connected ? 2 + 2 * (aiVolume || 0) : 0,
      0.1,
      4
    );

    return (
      <button
        ref={(node) => setButton(node || undefined)}
        {...props}
        style={{
          ...props.style,
          ["--in-volume" as any]: userVolume || 0,
          ["--ai-volume" as any]: aiVolume || 0,
        }}
        className={cn(className, styles.orb, {
          [styles.isConnected]: connected,
        })}
        onClick={onClick}
      >
        <div className={styles.shaderContainer}>
          <MeshGradient
            className={styles.shader}
            colors={bgColors}
            distortion={0.25}
            swirl={1}
            maxPixelCount={200 * 200 * 4} // https://github.com/paper-design/shaders/issues/188
            frame={startFrame}
            speed={speed}
          />
        </div>
        {children}
      </button>
    );
  }
);
