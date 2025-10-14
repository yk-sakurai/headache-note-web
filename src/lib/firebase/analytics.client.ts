"use client";
import { firebaseApp } from "./app";

export async function initAnalytics() {
  const { isSupported, getAnalytics } = await import("firebase/analytics");
  if (await isSupported()) return getAnalytics(firebaseApp);
  return null;
}
