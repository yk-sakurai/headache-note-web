import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, WEB_WITHDRAWAL_ENABLED } from "@/lib/constants";
import {
  SubscriptionRepository,
  UserRepository,
} from "@/lib/firestore/repositories/server";
import {
  isActiveSubscriber,
  isCancelScheduled,
  isTrialing,
} from "@/lib/firestore/helpers";
import ProfileMenu from "./ProfileMenu";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  let uid: string | null = null;
  let verifiedEmail = "";
  try {
    if (sessionCookie) {
      // layout.tsx でも認証済みだが、プロフィール表示用に uid/email を取得する。
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      uid = decoded.uid;
      verifiedEmail = typeof decoded.email === "string" ? decoded.email : "";
    }
  } catch {
    uid = null;
  }

  if (!uid) {
    redirect("/login");
  }

  const user = await UserRepository.getUser(uid);
  const email = user?.email || verifiedEmail;
  const withdrawal = WEB_WITHDRAWAL_ENABLED
    ? await getWithdrawalState(uid)
    : null;

  return <ProfileMenu email={email} withdrawal={withdrawal} />;
}

async function getWithdrawalState(uid: string) {
  const subscription = await SubscriptionRepository.getSubscription(uid);
  return {
    blocked:
      isActiveSubscriber(subscription) && !isCancelScheduled(subscription),
    warnsRemainingPeriod:
      (isActiveSubscriber(subscription) && isCancelScheduled(subscription)) ||
      isTrialing(subscription),
  };
}
