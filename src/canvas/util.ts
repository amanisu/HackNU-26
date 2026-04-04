/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export function dataURItoBlob(dataURI: string) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  let byteString = atob(dataURI.split(",")[1]);

  // separate out the mime component
  let mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

  // write the bytes of the string to an ArrayBuffer
  let ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  let ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  let blob = new Blob([ab], { type: mimeString });
  return blob;
}

/**
 * Calculates the shortest distance from a point (x, y) to a rectangle defined by its
 * left, top, right, and bottom coordinates.
 */
export function distanceToRect(
  x: number,
  y: number,
  l: number,
  t: number,
  r: number,
  b: number,
) {
  const dx = Math.max(l - x, 0, x - r);
  const dy = Math.max(t - y, 0, y - b);
  return Math.sqrt(dx * dx + dy * dy);
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
