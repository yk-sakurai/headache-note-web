/**
 * Firebase Hostingで使用するセッションCookieの名前
 * 
 * @see https://firebase.google.com/docs/hosting/manage-cache#using_cookies
 */
export const SESSION_COOKIE_NAME = "__session" as const;

/**
 * セッションCookieの有効期限（ミリ秒）
 */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 課金/表示に関する定数
 */
export const MONTHLY_PRICE_YEN = 290 as const;
export const YEARLY_PRICE_YEN = 1980 as const;
export const YEARLY_LAUNCH_PROMO_PRICE_YEN = 1480 as const;
export const YEARLY_TRIAL_DAYS = 14 as const;

/**
 * ローンチ日とプロモ期間（日数）。
 * NEXT_PUBLIC_LAUNCH_DATE は YYYY-MM-DD を想定。
 */
export const LAUNCH_DATE_STR =
  (process.env.NEXT_PUBLIC_LAUNCH_DATE as string | undefined) ?? "2025-12-31";
export const LAUNCH_PROMO_DAYS = 30 as const;

/**
 * Stripe Price IDs
 */
export const STRIPE_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!;
export const STRIPE_YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!;
export const STRIPE_YEARLY_LAUNCH_PROMO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_YEARLY_LAUNCH_PROMO_PRICE_ID!;
