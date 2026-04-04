/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import cn from "classnames";
import { useEffect, useRef } from "react";
import styles from "./AudioBars.module.scss";

const lineCount = 3;

export type AudioBarsProps = {
  className?: string;
  active: boolean;
  volume: number; // 1 = max
};

export default function AudioBars({
  className,
  active,
  volume,
}: AudioBarsProps) {
  const lines = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    let sizes: number[] = [];
    if (!active) {
      sizes = [10, 16, 7];
    } else {
      sizes = [
        4 + volume * 15, // first bar
        4 + volume * 40,
        4 + volume * 15,
      ];
    }
    lines.current.forEach(
      (line, i) => (line.style.height = `${Math.min(24, sizes[i])}px`)
    );
  }, [volume, active]);

  return (
    <div
      className={cn(className, styles.audioBars, {
        [styles.isActive]: !!active,
      })}
    >
      {Array(lineCount)
        .fill(null)
        .map((_, i) => (
          <div key={i} ref={(el) => (lines.current[i] = el!)} />
        ))}
    </div>
  );
}
