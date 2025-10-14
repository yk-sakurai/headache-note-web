"use client";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { firebaseApp } from "./app";

export const db = getFirestore(firebaseApp);

if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
  connectFirestoreEmulator(db, "localhost", 8080);
}
