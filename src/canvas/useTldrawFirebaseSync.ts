import { useEffect, useRef } from "react";
import { onValue, set, type DatabaseReference } from "firebase/database";
import type { Editor } from "tldraw";

export function useTldrawFirebaseSync(
  editor: Editor | undefined,
  documentRef: DatabaseReference | undefined,
) {
  const lastSavedRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    console.log("[SYNC] hook state", {
      hasEditor: !!editor,
      hasDocRef: !!documentRef,
      docRef: documentRef?.toString(),
    });
  }, [editor, documentRef]);

  // READ
  useEffect(() => {
    if (!editor || !documentRef) {
      console.log("[SYNC][READ] skipped", {
        hasEditor: !!editor,
        hasDocRef: !!documentRef,
      });
      return;
    }

    console.log("[SYNC][READ] subscribing", documentRef.toString());

    const unsubscribe = onValue(documentRef, (snapshot) => {
      const payload = snapshot.val() as
        | { snapshot: string; updatedAt?: number }
        | null;

      console.log("[SYNC][READ] payload =", payload);

      if (!payload?.snapshot) {
        initializedRef.current = true;
        console.log("[SYNC][READ] no remote snapshot yet, init complete");
        return;
      }

      const incoming = payload.snapshot;

      if (incoming === lastSavedRef.current) {
        initializedRef.current = true;
        console.log("[SYNC][READ] same snapshot, skip");
        return;
      }

      try {
        const parsed = JSON.parse(incoming);

        applyingRemoteRef.current = true;
        editor.store.mergeRemoteChanges(() => {
          editor.store.loadStoreSnapshot(parsed);
        });

        lastSavedRef.current = incoming;
        initializedRef.current = true;
        console.log("[SYNC][READ] remote snapshot applied");
      } catch (error) {
        console.error("[SYNC][READ] failed", error);
      } finally {
        applyingRemoteRef.current = false;
      }
    });

    return () => {
      console.log("[SYNC][READ] unsubscribed");
      unsubscribe();
    };
  }, [editor, documentRef]);

  // WRITE
  useEffect(() => {
    if (!editor || !documentRef) {
      console.log("[SYNC][WRITE] skipped", {
        hasEditor: !!editor,
        hasDocRef: !!documentRef,
      });
      return;
    }

    console.log("[SYNC][WRITE] listening for user document changes");

    const unsubscribe = editor.store.listen(
      () => {
        console.log("[SYNC][WRITE] store change detected", {
          initialized: initializedRef.current,
          applyingRemote: applyingRemoteRef.current,
        });

        if (!initializedRef.current) return;
        if (applyingRemoteRef.current) return;

        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = window.setTimeout(async () => {
          try {
            const storeSnapshot = editor.store.getStoreSnapshot("document");
            const serialized = JSON.stringify(storeSnapshot);

            if (serialized === lastSavedRef.current) {
              console.log("[SYNC][WRITE] identical snapshot, skip");
              return;
            }

            console.log("[SYNC][WRITE] saving to", documentRef.toString());

            await set(documentRef, {
              snapshot: serialized,
              updatedAt: Date.now(),
            });

            lastSavedRef.current = serialized;
            console.log("[SYNC][WRITE] saved successfully");
          } catch (error) {
            console.error("[SYNC][WRITE] failed to save", error);
          }
        }, 200);
      },
      { source: "user", scope: "document" },
    );

    return () => {
      console.log("[SYNC][WRITE] unsubscribed");
      unsubscribe();
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [editor, documentRef]);
}