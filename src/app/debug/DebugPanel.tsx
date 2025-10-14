"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/auth.client";
import { db } from "@/lib/firebase/firestore.client";
import { onAuthStateChanged, signInAnonymously, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function DebugPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [readResult, setReadResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const signIn = async () => { await signInAnonymously(auth); };
  const logout = async () => { await signOut(auth); };
  const writeDoc = async () => {
    await setDoc(doc(db, "debug", "hello"), { at: serverTimestamp(), uid: user?.uid ?? null });
  };
  const readDoc = async () => {
    const snap = await getDoc(doc(db, "debug", "hello"));
    setReadResult(snap.exists() ? snap.data() : null);
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div>uid: <code>{user?.uid ?? "(not signed in)"}</code></div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={signIn}>匿名サインイン</button>
        <button onClick={logout}>サインアウト</button>
        <button onClick={writeDoc}>Firestoreへ書き込み</button>
        <button onClick={readDoc}>Firestoreから読み込み</button>
      </div>
      <pre style={{ background: "#f5f5f5", padding: 8 }}>
        {readResult ? JSON.stringify(readResult, null, 2) : "(no data)"}
      </pre>
    </div>
  );
}
