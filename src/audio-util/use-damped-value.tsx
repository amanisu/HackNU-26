/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Custom React hook to smoothly transition a value to a new state.
 */
export function useDampedValue(targetValue: number, alpha = 0.1, initialValue = targetValue) {
  const [dampedValue, setDampedValue] = useState(initialValue);
  const frameRef = useRef<number>();

  useEffect(() => {
    // This function will be called on each animation frame
    const animate = () => {
      setDampedValue(prevValue => {
        // Stop the animation if the value is very close to the target
        if (Math.abs(prevValue - targetValue) < 0.001) {
          cancelAnimationFrame(frameRef.current!);
          return targetValue;
        }

        // Apply linear interpolation (lerp)
        const nextValue = prevValue + (targetValue - prevValue) * alpha;
        return nextValue;
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    // Start the animation loop when the target value changes
    frameRef.current = requestAnimationFrame(animate);

    // Clean up the animation frame on unmount or target value change
    return () => cancelAnimationFrame(frameRef.current!);
  }, [targetValue, alpha]);

  return dampedValue;
}