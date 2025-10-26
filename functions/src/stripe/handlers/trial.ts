import * as logger from "firebase-functions/logger";
import type Stripe from "stripe";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

export async function handleTrialWillEnd(
  event: Stripe.Event,
  db: Firestore,
): Promise<void> {
  logger.info("[handler] customer.subscription.trial_will_end received", { id: event.id });

  const sub = event.data.object as Stripe.Subscription;
  const customerId = (sub.customer as string) || undefined;
  if (!customerId) {
    logger.error("trial_will_end without customer id", { id: event.id });
    return;
  }

  // 顧客→uid 解決
  const usersSnap = await db.collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  if (usersSnap.empty) {
    logger.warn("No user mapped to stripeCustomerId for trial_will_end", { customerId, eventId: event.id });
    return;
  }
  const uid = usersSnap.docs[0].id;

  // 軽量なログとして debug コレクションに保存
  const trialRef = db.collection("debug").doc(`trial_${uid}_${event.id}`);
  const s: any = sub as any;
  await trialRef.set({
    type: "trial_will_end",
    uid,
    customerId,
    subscriptionId: sub.id,
    trialEnd: s?.trial_end ? new Date(s.trial_end * 1000) : null,
    ts: FieldValue.serverTimestamp(),
  });

  logger.info("trial_will_end recorded", { uid, subscriptionId: sub.id });
}
