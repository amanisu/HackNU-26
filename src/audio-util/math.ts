/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const invLerpClamped = (a: number, b: number, v: number) =>
  Math.max(0, Math.min(1, (v - a) / (b - a)));
