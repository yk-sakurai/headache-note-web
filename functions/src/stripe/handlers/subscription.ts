import * as logger from "firebase-functions/logger";
import type Stripe from "stripe";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { inferPlanFromSubscription, getStripePriceIdFromSubscription, mapStripeStatus } from "../utils";
import { db as sharedDb } from "../../lib/db";

export async function handleSubscriptionEvent(
  event: Stripe.Event,
  db: Firestore,
): Promise<void> {
  logger.info("[handler] subscription event received", { id: event.id, type: event.type });

  const sub = event.data.object as Stripe.Subscription;
  const customerId = (sub.customer as string) || undefined;
  if (!customerId) {
    logger.error("Subscription event without customer id", { id: event.id, type: event.type });
    return;
  }

  // Stripe顧客IDからuidを解決
  const usersSnap = await sharedDb.collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (usersSnap.empty) {
    logger.warn("No user mapped to stripeCustomerId", { customerId, eventId: event.id });
    return;
  }

  const uid = usersSnap.docs[0].id;
  const plan = inferPlanFromSubscription(sub);
  const stripePriceId = getStripePriceIdFromSubscription(sub);
  const s: any = sub as any;

  const baseData: Record<string, unknown> = {
    status: mapStripeStatus(sub.status),
    plan,
    priceId: plan === "yearly" ? "web_yearly_v1" : "web_monthly_v1",
    platform: "web",
    cancelAtPeriodEnd: !!s.cancel_at_period_end,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (stripePriceId) baseData["stripePriceId"] = stripePriceId;
  if (s.current_period_start) baseData["currentPeriodStart"] = new Date(s.current_period_start * 1000);
  if (s.current_period_end) baseData["currentPeriodEnd"] = new Date(s.current_period_end * 1000);
  if (s.trial_end) baseData["trialEnd"] = new Date(s.trial_end * 1000);
  if (s.canceled_at) baseData["canceledAt"] = new Date(s.canceled_at * 1000);

  const subRef = sharedDb.collection("subscriptions").doc(uid);

  if (event.type === "customer.subscription.deleted") {
    await subRef.set(
      {
        ...baseData,
        status: "canceled",
        canceledAt: baseData.canceledAt || FieldValue.serverTimestamp(),
        cancelAtPeriodEnd: true,
      },
      { merge: true },
    );
    logger.info("Subscription marked canceled", { uid, customerId });
    return;
  }

  await subRef.set(baseData, { merge: true });
  logger.info("Subscription upserted", { uid, status: baseData.status, plan: baseData.plan });
}
