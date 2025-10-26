import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getStripe } from "../lib/stripe";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { db as sharedDb } from "../lib/db";
import { handleCheckoutSessionCompleted } from "./handlers/checkout";
import { handleSubscriptionEvent } from "./handlers/subscription";
import { handleInvoiceEvent } from "./handlers/invoice";
import { handleTrialWillEnd } from "./handlers/trial";

if (getApps().length === 0) {
  initializeApp();
}

try {
  const dbInit = getFirestore();
  dbInit.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  // settings は一度だけ設定できるため、二重呼び出し時の例外は無視
}

export const stripeWebhook = onRequest({
  cors: false,
  maxInstances: 5,
  region: "asia-northeast1",
  secrets: ["STRIPE_WEBHOOK_SECRET", "STRIPE_SECRET_KEY"],
}, async (req, res) => {
  if (req.method !== "POST") {
    res.set("Allow", "POST");
    res.status(405).send("Method Not Allowed");
    return;
  }

  const signature = req.headers["stripe-signature"] as string | undefined;
  if (!signature) {
    res.status(400).send("Missing Stripe signature");
    return;
  }

  const stripe = getStripe();
  let event;
  try {
    const rawBody: Buffer = (req as any).rawBody || Buffer.from(req.body);
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err) {
    logger.error("Webhook signature verification failed", { error: (err as Error).message });
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  const db = sharedDb;
  const eventId: string = event.id;
  const eventRef = db.collection("webhook_events").doc(eventId);

  const existing = await eventRef.get();
  if (existing.exists) {
    logger.info("Duplicate webhook event ignored", { eventId, type: event.type });
    res.status(200).send({ received: true, duplicate: true });
    return;
  }

  await eventRef.set({
    id: eventId,
    type: event.type,
    created: event.created,
    receivedAt: Date.now(),
    status: "received",
  }, { merge: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event, db);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event, db);
        break;
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
      case "invoice.finalized":
        await handleInvoiceEvent(event, db);
        break;
      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event, db);
        break;
      default:
        logger.info("Unhandled Stripe event type", { type: event.type, id: event.id });
        break;
    }

    await eventRef.set({ status: "processed" }, { merge: true });
    logger.info("Webhook event processed", { eventId, type: event.type });
    res.status(200).send({ received: true });
    return;
  } catch (error) {
    logger.error("Error processing webhook event", { eventId, type: event.type, error });
    await eventRef.set({ status: "error", error: (error as Error).message }, { merge: true });
    res.status(500).send({ error: "Internal Server Error" });
    return;
  }
});
