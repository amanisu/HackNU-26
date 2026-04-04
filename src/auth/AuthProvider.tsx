/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth } from "@/firebase";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  UserInfo,
} from "firebase/auth";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const MOCK_INFO = [
  { name: "Taylor", img: "52" },
  { name: "Charlene", img: "48" },
];

const AuthContext = createContext<{
  user: UserInfo | null;
  hasAccess: string | null;
  authLoaded: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}>({
  user: null,
  hasAccess: null,
  authLoaded: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}

/**
 * Mostly just an auth gate.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [hasAccess, setHasAccess] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const signIn = useCallback(async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const _signOut = useCallback(async () => {
    await signOut(auth);
  }, []);

  useEffect(() => {
    const mockId = new URLSearchParams(window.location.search).get("mock");

    if (mockId) {
      const { name, img } =
        MOCK_INFO[(Number(mockId) - 1) % MOCK_INFO.length] || MOCK_INFO[0];
      const slug = name.toLowerCase();

      setAuthLoaded(true);
      setHasAccess("true");
      setUser({
        email: `${slug}@example.com`,
        uid: `mock:${slug}`,
        photoURL: `https://i.pravatar.cc/150?img=${img}`,
        displayName: name,
        providerId: "mock",
        phoneNumber: null,
      });

      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      void (await user?.getIdTokenResult());
      setAuthLoaded(true);
      setHasAccess("true");
      setUser(user ?? null);
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, hasAccess, authLoaded, signIn, signOut: _signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
