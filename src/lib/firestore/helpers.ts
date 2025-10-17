import { Subscription, SubscriptionStatus, User } from "./types";
import { Timestamp } from "firebase/firestore";
import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";

/**
 * 管理者かどうかを判定
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.admin === true;
}

/**
 * サブスクリプションステータスに基づいた有料判定
 */
export function isPaidUser(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return ["active", "trialing"].includes(subscription.status);
}

/**
 * トライアル中かどうか
 */
export function isTrialing(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === "trialing";
}

/**
 * アクティブな有料ユーザーかどうか（トライアルを除く）
 */
export function isActiveSubscriber(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === "active";
}

/**
 * サブスクリプションがキャンセル予定かどうか
 */
export function isCancelScheduled(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return subscription.cancelAtPeriodEnd === true;
}

/**
 * 次回課金日の取得
 */
export function getNextBillingDate(
  subscription: Subscription | null
): Date | null {
  if (!subscription) return null;

  const timestamp = subscription.currentPeriodEnd;

  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }

  if (
    timestamp &&
    typeof timestamp === "object" &&
    "toDate" in timestamp &&
    typeof timestamp.toDate === "function"
  ) {
    return (timestamp as AdminTimestamp).toDate();
  }

  return null;
}

/**
 * トライアル終了日の取得
 */
export function getTrialEndDate(
  subscription: Subscription | null
): Date | null {
  if (!subscription || !subscription.trialEnd) return null;

  const timestamp = subscription.trialEnd;

  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }

  if (
    timestamp &&
    typeof timestamp === "object" &&
    "toDate" in timestamp &&
    typeof timestamp.toDate === "function"
  ) {
    return (timestamp as AdminTimestamp).toDate();
  }

  return null;
}

/**
 * サブスクリプションプランの表示名を取得
 */
export function getPlanDisplayName(
  plan: "monthly" | "yearly" | undefined
): string {
  if (!plan) return "未登録";
  return plan === "monthly" ? "月額プラン" : "年額プラン";
}

/**
 * サブスクリプションステータスの表示名を取得
 */
export function getStatusDisplayName(status: SubscriptionStatus): string {
  const statusMap: Record<SubscriptionStatus, string> = {
    active: "有効",
    trialing: "トライアル中",
    canceled: "キャンセル済み",
    past_due: "支払い遅延",
    unpaid: "未払い",
    incomplete: "不完全",
  };

  return statusMap[status] || status;
}

/**
 * サブスクリプションが有効期限切れかどうか
 */
export function isSubscriptionExpired(
  subscription: Subscription | null
): boolean {
  if (!subscription) return true;

  const nextBillingDate = getNextBillingDate(subscription);
  if (!nextBillingDate) return true;

  return nextBillingDate < new Date();
}

/**
 * 残りのトライアル日数を取得
 */
export function getRemainingTrialDays(
  subscription: Subscription | null
): number | null {
  if (!subscription || !isTrialing(subscription)) return null;

  const trialEndDate = getTrialEndDate(subscription);
  if (!trialEndDate) return null;

  const now = new Date();
  const diffTime = trialEndDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * 次回課金までの日数を取得
 */
export function getDaysUntilNextBilling(
  subscription: Subscription | null
): number | null {
  if (!subscription) return null;

  const nextBillingDate = getNextBillingDate(subscription);
  if (!nextBillingDate) return null;

  const now = new Date();
  const diffTime = nextBillingDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * サブスクリプションの警告メッセージを取得
 */
export function getSubscriptionWarningMessage(
  subscription: Subscription | null
): string | null {
  if (!subscription) return "サブスクリプションが見つかりません";

  if (subscription.status === "past_due") {
    return "お支払いが遅延しています。お支払い方法をご確認ください。";
  }

  if (subscription.status === "unpaid") {
    return "お支払いが完了していません。アカウントが制限される可能性があります。";
  }

  if (subscription.status === "incomplete") {
    return "サブスクリプションの設定が不完全です。";
  }

  if (isCancelScheduled(subscription)) {
    const daysRemaining = getDaysUntilNextBilling(subscription);
    if (daysRemaining !== null && daysRemaining > 0) {
      return `サブスクリプションは${daysRemaining}日後に終了します。`;
    }
    return "サブスクリプションがキャンセルされています。";
  }

  return null;
}
