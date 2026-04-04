/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { MEDIA_ROOT_PATH } from "@/document/model-and-db";
import { storage } from "@/firebase";
import { GoogleGenAI } from "@google/genai";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";

export async function generateImage(
  ai: GoogleGenAI,
  { prompt }: { prompt: string },
): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: prompt,
  });

  for (const part of response.candidates?.[0].content?.parts || []) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data || "";
      return `data:image/png;base64,${imageData}`;
    }
  }

  throw new Error("No images were generated");
}

export async function saveImage(
  imageDataUrl: string,
  idPath?: string,
): Promise<string> {
  idPath = idPath ?? crypto.randomUUID();
  let storagePath = `${MEDIA_ROOT_PATH}/${idPath}.png`;
  let res = await uploadBytes(
    storageRef(storage, storagePath),
    await fetch(imageDataUrl).then((r) => r.blob()),
  );
  return await getDownloadURL(res.ref);
}
