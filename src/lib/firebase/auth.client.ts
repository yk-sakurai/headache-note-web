"use client";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { firebaseApp } from "./app";

export const auth = getAuth(firebaseApp);

export async function signInWithEmailPassword(email: string, password: string) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmailPassword(email: string, password: string) {
  return await createUserWithEmailAndPassword(auth, email, password);
}

export async function sendVerificationEmail(user: User) {
  return await sendEmailVerification(user);
}

export async function signOut() {
  return await firebaseSignOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function getIdToken(): Promise<string> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error("No user is signed in");
  }
  return await user.getIdToken();
}

if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
}
