/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import cn from "classnames";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  InfoIcon,
  XOctagonIcon,
} from "lucide-react";
import { ReactNode } from "react";
import styles from "./LogLine.module.scss";

const LogLine = ({
  type,
  args,
}: {
  type: "ERR" | "INFO" | "WARN" | "LOG" | "RESULT" | "HTML" | "TIME";
  args: (string | number)[];
}) => {
  let icon = null;
  switch (type) {
    case "ERR":
      icon = <XOctagonIcon size={16} style={{ color: `var(--red-11)` }} />;
      break;
    case "INFO":
      icon = <InfoIcon size={16} style={{ color: `var(--blue-11)` }} />;
      break;
    case "WARN":
      icon = (
        <AlertTriangleIcon size={16} style={{ color: `var(--amber-11)` }} />
      );
      break;
    case "LOG":
    case "RESULT":
    case "HTML":
      icon = <ArrowRightIcon size={16} style={{ color: `var(--gray-10)` }} />;
      break;
  }

  let output: ReactNode = args.join(" ");
  if (type === "HTML") {
    output = <div dangerouslySetInnerHTML={{ __html: output }} />;
  }

  if (type === "TIME") {
    return (
      <div className={cn(styles.logLine, styles.timeLine)}>
        <CheckCircle2Icon size={16} style={{ color: `var(--green-11)` }} />
        <span>Finished running in {output}ms</span>
      </div>
    );
  }

  return (
    <div className={styles.logLine}>
      {icon} <div style={{ flex: 1 }}>{output}</div>
    </div>
  );
};

export default LogLine;
