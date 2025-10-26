import type Stripe from "stripe";

export function mapStripeStatus(status: Stripe.Subscription.Status):
  | "active"
  | "trialing"
  | "canceled"
  | "past_due"
  | "unpaid"
  | "incomplete" {
  switch (status) {
    case "active":
    case "trialing":
    case "canceled":
    case "past_due":
    case "unpaid":
    case "incomplete":
      return status;
    case "incomplete_expired":
      return "incomplete";
    case "paused":
      return "unpaid";
    default:
      return "active";
  }
}

export function inferPlanFromPriceId(appPriceId: string | undefined): "monthly" | "yearly" {
  if (!appPriceId) return "monthly";
  return appPriceId.includes("yearly") ? "yearly" : "monthly";
}

export function inferPlanFromSubscription(sub: Stripe.Subscription): "monthly" | "yearly" {
  try {
    const item = (sub as any).items?.data?.[0];
    const interval = item?.price?.recurring?.interval as string | undefined;
    return interval === "year" ? "yearly" : "monthly";
  } catch {
    return "monthly";
  }
}

export function getStripePriceIdFromSubscription(sub: Stripe.Subscription): string | undefined {
  try {
    const item = (sub as any).items?.data?.[0];
    return item?.price?.id as string | undefined;
  } catch {
    return undefined;
  }
}
