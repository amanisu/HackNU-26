/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuthContext } from "@/auth/AuthProvider";
import { db } from "@/firebase";
import {
  child,
  DatabaseReference,
  onValue,
  ref,
  remove,
  set,
  update,
} from "firebase/database";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DOC_ROOT_PATH, DocMetadata, USERINFO_ROOT_PATH } from "./model-and-db";
import { generateId } from "./util";
import { stripUndefined } from "@/util/primitives-util";

const FORK_KEYS_TO_COPY = ["metadata", "canvas"];

type DocumentContext = {
  docLoading: boolean;
  docId: string;
  docRef: DatabaseReference;
  metadata: DocMetadata | undefined;
  updateMetadata: (updates: Partial<DocMetadata>) => void;
  fork: () => void;
  deleteDocument: () => void;
};

const DocumentContext = createContext<DocumentContext>({} as DocumentContext);

export const DocumentContextConsumer = DocumentContext.Consumer;

export function useDocumentContext() {
  return useContext(DocumentContext);
}

type Props = {
  docId: string;
};

export function DocumentProvider({
  docId,
  children,
}: React.PropsWithChildren<Props>) {
  const { user } = useAuthContext();
  const docRef = useMemo(() => ref(db, `${DOC_ROOT_PATH}/${docId}`), [docId]);
  const metadataRef = child(docRef, "metadata");
  const [metadata, setMetadata] = useState<DocMetadata>();

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const updateMetadata = useCallback((updates: Partial<DocMetadata>) => {
    setMetadata((metadata) => {
      let merged = {
        ...metadata,
        ...updates,
      };
      update(child(docRef, "metadata"), stripUndefined(updates));
      if (userRef.current?.uid && merged.creatorUid === userRef.current.uid) {
        update(
          ref(db, `${USERINFO_ROOT_PATH}/${userRef.current.uid}/docs/${docId}`),
          stripUndefined(updates),
        );
      }
      return merged;
    });
  }, []);

  useEffect(() => {
    if (
      metadata &&
      Object.keys(metadata).length &&
      !metadata?.creatorUid &&
      user
    ) {
      updateMetadata({ creatorUid: user.uid });
    }
  }, [metadata, user]);

  const deleteDocument = useCallback(() => {
    set(docRef, { deleted: true, metadata: { creatorUid: "deleted" } });
    userRef.current &&
      remove(
        ref(db, `${USERINFO_ROOT_PATH}/${userRef.current.uid}/docs/${docId}`),
      );
    window.location.pathname = "/";
  }, [docId]);

  const fork = useCallback(async () => {
    let ss: Record<string, any> = await new Promise((resolve) => {
      onValue(docRef, (ss) => resolve(ss.val()), { onlyOnce: true });
    });
    let newDoc: Record<string, any> = {};
    for (let key of FORK_KEYS_TO_COPY) {
      if (ss[key]) {
        newDoc[key] = ss[key];
      }
    }
    newDoc.metadata = newDoc.metadata || {};
    newDoc.metadata.title = (newDoc.metadata.title || "Untitled") + " (Fork)";
    // Create new doc in RTDB + redirect
    let newId = generateId();
    await set(ref(db, `${DOC_ROOT_PATH}/${newId}`), newDoc);
    userRef.current &&
      (await set(
        ref(db, `${USERINFO_ROOT_PATH}/${userRef.current.uid}/docs/${newId}`),
        newDoc.metadata,
      ));
    window.open(newId);
  }, []);

  // Observe doc metadata and content from RTDB
  useEffect(() => {
    let unsub = onValue(metadataRef, (ss) => {
      setMetadata(ss.val() || {});
    });
    return () => unsub();
  }, [docId]);

  return (
    <DocumentContext.Provider
      value={{
        docLoading: !metadata,
        docId,
        docRef,
        metadata,
        updateMetadata,
        fork,
        deleteDocument,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}
