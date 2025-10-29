import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { ReactNode } from "react";
import { SubscriptionRepository } from "@/lib/firestore/repositories/server";
import RestrictedAccess from "./RestrictedAccess";
import {
  hasActiveAccess,
  getAccessDeniedReason,
} from "@/lib/firestore/helpers";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    redirect("/login");
  }

  let uid: string | null = null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie.value, true);
    uid = decoded.uid;
  } catch (error) {
    console.error("Session verification failed:", error);
    redirect("/login");
  }

  const subscription = uid
    ? await SubscriptionRepository.getSubscription(uid)
    : null;

  if (!hasActiveAccess(subscription)) {
    const reason = getAccessDeniedReason(subscription);
    return (
      <div className="min-h-screen py-12 px-4">
        <RestrictedAccess reason={reason} status={subscription?.status ?? null} />
      </div>
    );
  }

  return <>{children}</>;
}
