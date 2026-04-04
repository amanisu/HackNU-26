/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Orb } from "./Orb";
import { useEffect, useState } from "react";

export function DevOrbPlayground() {
  let [connected, setConnected] = useState(false);
  let [connected2, setConnected2] = useState(false);
  let [aiTalking, setAiTalking] = useState(false);
  let [aiVolume, setAiVolume] = useState(0.5);
  useEffect(() => {
    if (!aiTalking) {
      setAiVolume(0.5);
      return;
    }
    const interval = setInterval(() => {
      setAiVolume(
        Math.max(0.1, Math.min(1, aiVolume * (0.6 + 1.2 * Math.random())))
      );
    }, 100);
    return () => clearInterval(interval);
  }, [aiTalking]);
  useEffect(() => {
    const interval = setInterval(() => {
      setConnected((prev) => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        zIndex: 10000,
        display: "flex",
        gap: 80,
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        color: "#391353",
      }}
    >
      <Orb userVolume={0.5} aiVolume={0} connected={false} />
      <Orb
        userVolume={0.5}
        aiVolume={connected2 ? aiVolume : 0}
        connected={connected2}
        onClick={(ev) => {
          if (ev.shiftKey) {
            setAiTalking(!aiTalking);
          } else {
            setConnected2(!connected2);
          }
        }}
      />
      <Orb
        userVolume={0.5}
        aiVolume={connected ? aiVolume : 0}
        connected={connected}
      />
    </div>
  );
}
