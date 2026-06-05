import * as logger from "firebase-functions/logger";
import type Stripe from "stripe";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { getStripe } from "../../lib/stripe";
import { inferPlanFromPriceId, mapStripeStatus } from "../utils";
import { db as sharedDb } from "../../lib/db";

export async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  db: Firestore,
): Promise<void> {
  logger.info("[handler] checkout.session.completed received", { id: event.id });

  const stripe = getStripe();
  const session = event.data.object as Stripe.Checkout.Session;

  const sessionId = session.id;
  const uid = session.metadata?.uid;
  const appPriceId = session.metadata?.priceId;
  const customerId = (session.customer as string) || undefined;
  const subscriptionId = (session.subscription as string) || undefined;

  if (!uid) {
    logger.error("checkout.session.completed without uid in metadata", { sessionId });
    return;
  }

  // 1) User に stripeCustomerId を保存
  const userRef = sharedDb.collection("users").doc(uid);
  const userUpdate: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (customerId) userUpdate["stripeCustomerId"] = customerId;
  await userRef.set(userUpdate, { merge: true });

  // 2) checkout_sessions/{sessionId} を completed に更新
  const checkoutRef = sharedDb.collection("checkout_sessions").doc(sessionId);
  const completedAt = new Date();
  const createdAt = session.created ? new Date(session.created * 1000) : new Date();

  const utm = session.metadata
    ? {
        ...(session.metadata.utm_source ? { source: session.metadata.utm_source } : {}),
        ...(session.metadata.utm_medium ? { medium: session.metadata.utm_medium } : {}),
        ...(session.metadata.utm_campaign ? { campaign: session.metadata.utm_campaign } : {}),
        ...(session.metadata.utm_term ? { term: session.metadata.utm_term } : {}),
        ...(session.metadata.utm_content ? { content: session.metadata.utm_content } : {}),
      }
    : undefined;

  const checkoutData: Record<string, unknown> = {
    uid,
    mode: "subscription",
    platform: "web",
    status: "completed",
    createdAt,
    completedAt,
  };
  if (appPriceId) checkoutData["priceId"] = appPriceId;
  if (customerId) checkoutData["customerId"] = customerId;
  if (utm && Object.keys(utm).length > 0) checkoutData["utm"] = utm;
  await checkoutRef.set(checkoutData, { merge: true });

  // 3) subscriptions/{uid} を作成/更新
  if (subscriptionId) {
    const subscriptionResp = await stripe.subscriptions.retrieve(subscriptionId);
    const subscription = subscriptionResp as unknown as Stripe.Subscription;
    const s = subscription as any;
    const stripePriceId = s.items?.data?.[0]?.price?.id as string | undefined;

    const currentPeriodStart = s.current_period_start
      ? new Date(s.current_period_start * 1000)
      : undefined;
    const currentPeriodEnd = s.current_period_end
      ? new Date(s.current_period_end * 1000)
      : undefined;
    const trialEnd = s.trial_end ? new Date(s.trial_end * 1000) : undefined;
    const canceledAt = s.canceled_at ? new Date(s.canceled_at * 1000) : undefined;

    const subscriptionRef = sharedDb.collection("subscriptions").doc(uid);
    const subData: Record<string, unknown> = {
      status: mapStripeStatus(subscription.status),
      plan: inferPlanFromPriceId(appPriceId),
      platform: "web",
      cancelAtPeriodEnd: !!s.cancel_at_period_end,
      updatedAt: new Date(),
    };
    if (currentPeriodStart) subData["currentPeriodStart"] = currentPeriodStart;
    if (currentPeriodEnd) subData["currentPeriodEnd"] = currentPeriodEnd;
    if (appPriceId) subData["priceId"] = appPriceId;
    if (stripePriceId) subData["stripePriceId"] = stripePriceId;
    if (trialEnd) subData["trialEnd"] = trialEnd;
    if (canceledAt) subData["canceledAt"] = canceledAt;
    await subscriptionRef.set(subData, { merge: true });
  } else {
    logger.warn("checkout.session.completed without subscription id", { sessionId, uid });
  }
}
