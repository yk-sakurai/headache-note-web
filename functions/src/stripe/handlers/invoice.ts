import * as logger from "firebase-functions/logger";
import type Stripe from "stripe";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { getStripe } from "../../lib/stripe";
import { db as sharedDb } from "../../lib/db";

export async function handleInvoiceEvent(
  event: Stripe.Event,
  db: Firestore,
): Promise<void> {
  logger.info("[handler] invoice event received", { id: event.id, type: event.type });

  const invoice = event.data.object as Stripe.Invoice;
  const customerId = (invoice.customer as string) || undefined;
  if (!customerId) {
    logger.error("Invoice event without customer id", { id: event.id, type: event.type });
    return;
  }

  // 顧客に紐づく uid を解決
  const usersSnap = await sharedDb.collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  if (usersSnap.empty) {
    logger.warn("No user mapped to stripeCustomerId for invoice", { customerId, eventId: event.id });
    return;
  }
  const uid = usersSnap.docs[0].id;

  // invoices/{uid}/user_invoices/{invoiceId}
  const invoiceId = invoice.id;
  const invoiceRef = sharedDb.collection("invoices").doc(uid).collection("user_invoices").doc(invoiceId);

  const invoiceData: Record<string, unknown> = {
    stripeInvoiceId: invoice.id,
    amountDue: invoice.amount_due ?? 0,
    amountPaid: invoice.amount_paid ?? 0,
    currency: invoice.currency || "jpy",
    paid: (invoice.status || "open") === "paid",
    status: invoice.status || "open",
    createdAt: invoice.created ? new Date(invoice.created * 1000) : new Date(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (invoice.hosted_invoice_url) invoiceData["hostedInvoiceUrl"] = invoice.hosted_invoice_url;
  if (invoice.invoice_pdf) invoiceData["invoicePdf"] = invoice.invoice_pdf;

  if (event.type === "invoice.finalized") {
    await invoiceRef.set(invoiceData, { merge: true });
    logger.info("Invoice finalized saved", { uid, invoiceId });
    return;
  }

  if (event.type === "invoice.payment_succeeded") {
    await invoiceRef.set({ ...invoiceData, paid: true, status: invoice.status || "paid" }, { merge: true });

    // サブスクリプションの currentPeriodStart/End を更新（Subscriptionを取得）
    const subId = ((invoice as any).subscription as string) || undefined;
    if (subId) {
      const stripe = getStripe();
      const subResp = await stripe.subscriptions.retrieve(subId);
      const s = subResp as any;
      const subRef = sharedDb.collection("subscriptions").doc(uid);
      const subUpdate: Record<string, unknown> = {
        status: "active",
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (s?.current_period_start) subUpdate["currentPeriodStart"] = new Date(s.current_period_start * 1000);
      else subUpdate["currentPeriodStart"] = FieldValue.serverTimestamp();
      if (s?.current_period_end) subUpdate["currentPeriodEnd"] = new Date(s.current_period_end * 1000);
      await subRef.set(subUpdate, { merge: true });
    }
    logger.info("Invoice payment succeeded; subscription updated", { uid, invoiceId });
    return;
  }

  if (event.type === "invoice.payment_failed") {
    // サブスクリプションを past_due に
    const subRef = sharedDb.collection("subscriptions").doc(uid);
    await subRef.set(
      {
        status: "past_due",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await invoiceRef.set({ ...invoiceData, paid: false, status: "open" }, { merge: true });
    logger.info("Invoice payment failed; subscription marked past_due", { uid, invoiceId });
    return;
  }
}
