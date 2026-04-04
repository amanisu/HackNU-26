/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandConfig, CTRL_OR_CMD_PROP } from "./CommandProvider";
import cn from "classnames";
import styles from "./Shortcut.module.scss";

const KEY_NAME_MAP: Record<string, string> = {
  Escape: "Esc",
};

export function Shortcut({
  config,
  className,
  variant,
}: {
  config: Omit<CommandConfig, "label"> & { label?: string };
  className?: string;
  variant?: "default" | "ghost";
}) {
  return (
    <span
      className={cn(
        styles.shortcut,
        { [styles.ghost]: variant === "ghost" },
        className,
      )}
    >
      {config.ctrlOrCmd && (CTRL_OR_CMD_PROP === "ctrlKey" ? "^" : "⌘")}
      {config.ctrl && "^"}
      {config.alt && "⌥"}
      {config.meta && "⌘"}
      {config.shift && "⇧"}
      {KEY_NAME_MAP[config.keyName] ||
        (config.keyName.length === 1 ? (
          <code>{config.keyName.toUpperCase()}</code>
        ) : (
          config.keyName
        ))}
    </span>
  );
}
