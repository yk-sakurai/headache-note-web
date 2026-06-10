"use client";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  verifyBeforeUpdateEmail,
  type User,
  type Unsubscribe,
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

export async function sendPasswordReset(email: string) {
  return await sendPasswordResetEmail(auth, email);
}

export async function signOut() {
  return await firebaseSignOut(auth);
}

export function observeAuthState(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function reauthenticateWithPassword(currentPassword: string) {
  const user = getCurrentUser();

  if (!user?.email) {
    throw new Error("No user is signed in");
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  return await reauthenticateWithCredential(user, credential);
}

export async function updateUserEmailWithVerification(newEmail: string) {
  const user = getCurrentUser();

  if (!user) {
    throw new Error("No user is signed in");
  }

  // Firestore users/{uid}.email is synchronized on the next verified login.
  return await verifyBeforeUpdateEmail(user, newEmail);
}

export async function updateUserPassword(newPassword: string) {
  const user = getCurrentUser();

  if (!user) {
    throw new Error("No user is signed in");
  }

  return await updatePassword(user, newPassword);
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
