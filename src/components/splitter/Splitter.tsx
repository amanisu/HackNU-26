/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import classnames from "classnames";
import { FC, PropsWithChildren, useEffect, useRef, useState } from "react";
import styles from "./Splitter.module.scss";

const keyToLocalStorageKey = (storageKey: string) =>
  `Splitter_${storageKey}_value`;

export const Splitter: FC<
  PropsWithChildren<{
    style?: React.CSSProperties;
    className?: string;
    min?: number;
    max?: number;
    thickness?: number;
    storageKey?: string;
    onResize?: (value: number) => void;
  }>
> = ({
  style,
  className,
  min = 0,
  max = 100,
  thickness = 12,
  storageKey,
  children,
  onResize = (_: number) => {},
}) => {
  let splitterRef = useRef<HTMLDivElement>(null);
  let [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (storageKey) {
      let storedValue = localStorage.getItem(keyToLocalStorageKey(storageKey))!;
      if (storedValue !== null) {
        onResize(constrain(min, max, parseFloat(storedValue)));
      }
    }
  }, [max, min, storageKey]);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    let abort = new AbortController();
    let bounds = (
      splitterRef.current!.parentNode as HTMLElement
    ).getBoundingClientRect();
    let splitterWidth = splitterRef.current!.offsetWidth;

    window.addEventListener(
      "pointermove",
      (evt) => {
        let value =
          (100 * (evt.clientX - splitterWidth / 2 - bounds.left)) /
          bounds.width;
        value = constrain(min, max, value);
        onResize(value);
        storageKey &&
          localStorage.setItem(
            keyToLocalStorageKey(storageKey),
            value.toFixed(2)
          );
      },
      abort
    );
    window.addEventListener("pointerup", () => setDragging(false), abort);
    return () => abort.abort();
  }, [dragging, max, min, onResize, storageKey]);

  return (
    <>
      {dragging && <div className={styles.scrim} />}
      <div
        ref={splitterRef}
        className={classnames(styles.splitter, className, {
          [styles.isDragging]: dragging,
        })}
        style={{
          ...(style || {}),
          ["--splitter-thickness" as any]: `${thickness}px`,
        }}
        onPointerDown={() => setDragging(true)}
      >
        {children}
      </div>
    </>
  );
};

function constrain(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(value, max));
}
