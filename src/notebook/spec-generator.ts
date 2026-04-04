/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EntityNodeData } from "@/canvas/nodes/EntityNode";
import { GoogleGenAI } from "@google/genai";

// TODO: bring in the rest of the Weave and tell Gemini how to @-mention other entities

export async function generateEntitySpec(
  ai: GoogleGenAI,
  { entity }: { entity: EntityNodeData },
): Promise<string> {
  let response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: `
You are helping an app developer to generate a markdown specification (similar to a product requirements doc or PRD), for a data part of their application, for example a persona, user goal, or app screen, backend component, etc.

The spec should NOT include any titles or top-level headings.

The spec should include (in this order):
- a high-level description (one or two paragraphs)
- a bulleted list of requirements/considerations

If applicable, include any other relevant information that would help a developer implement this entity, such as:
- code snippets
- anything else you deem useful

Respond only with the exact final markdown specification, without any additional text or explanation.
`.trim(),
    },
    contents: `Generate a spec for the following entity:
Type: ${entity.type}
Name: ${entity.title}
${
  entity.markdownBody
    ? `Existing content:
---
${entity.markdownBody}
---`
    : ""
}
`,
  });
  return response.text || "No spec generated.";
}
