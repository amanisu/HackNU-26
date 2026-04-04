/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { peerCursorAnnotations } from "./annotations/PeerCursorAnnotation";
import { commentNodes } from "./nodes/CommentNode";
import { entityNodes } from "./nodes/EntityNode";
import { imageGenNodes } from "./nodes/ImageGenNode";
import { miniAppNodes } from "./nodes/MiniAppNode";
import { rootNodes } from "./nodes/RootNode";

export const nodeFactories = Object.fromEntries(
  [rootNodes, entityNodes, imageGenNodes, miniAppNodes, commentNodes].map(
    (n) => [n.type, n]
  )
);

export const annotationFactories = Object.fromEntries(
  [peerCursorAnnotations].map((n) => [n.type, n])
);
