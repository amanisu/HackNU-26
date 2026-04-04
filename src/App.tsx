/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuthContext } from "@/auth/AuthProvider";
import { Loading } from "@/components/Loading";
import { ToastProvider } from "@/components/Toast";
import { PrefsProvider } from "@/util/PrefsProvider";
import { useEffect } from "react";
import "./App.scss";
import { Editor } from "./Editor";
import { CommandProvider } from "./commands/CommandProvider";
import { generateId } from "./document/util";
import { OnboardGate } from "./onboarding/Onboarding";

export function App() {
  return (
    <AuthProvider>
      <PrefsProvider>
        <CommandProvider>
          <ToastProvider>
            <div className="app">
              <OnboardGate>
                <RouterGate />
              </OnboardGate>
            </div>
          </ToastProvider>
        </CommandProvider>
      </PrefsProvider>
    </AuthProvider>
  );
}

export function RouterGate() {
  const { user } = useAuthContext();
  const docId = window.location.pathname.replace(/^\//, "");

  useEffect(() => {
    if (!user || docId) return;

    const lastDocId = localStorage.getItem("lastDocId");
    const targetId = lastDocId || generateId();

    if (!lastDocId) {
      localStorage.setItem("lastDocId", targetId);
    }

    window.location.pathname = targetId;
  }, [user, docId]);

  useEffect(() => {
    if (docId) {
      localStorage.setItem("lastDocId", docId);
    }
  }, [docId]);

  return docId ? <Editor docId={docId} /> : <Loading />;
}
