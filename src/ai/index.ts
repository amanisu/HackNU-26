/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { usePrefsContext } from "@/util/PrefsProvider";
import { GoogleGenAI } from "@google/genai";
import { useMemo } from "react";

export function useGeminiApi() {
  const { prefs } = usePrefsContext();
  if (!prefs.geminiApiKey) {
    throw new Error("Gemini API key is not set");
  }

  return useMemo(() => {
    return new GoogleGenAI({
      apiKey: prefs.geminiApiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });
  }, [prefs.geminiApiKey]);
}
