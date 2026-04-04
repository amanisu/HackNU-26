/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import z from "zod";

export type Tool<T> = {
  name: string;
  description: string;
  parameters: z.ZodType<T>;
  run(args: T): Promise<string> | string;
};

export function makeTool<T>(tool: Tool<T>): Tool<T> {
  return tool;
}
