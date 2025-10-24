import { NextResponse } from 'next/server';

export async function GET() {
  // 値は返さず、存在有無のみ返す（セキュア）
  const status = {
    STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    STRIPE_WEBHOOK_SECRET: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID: Boolean(process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID),
    NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID: Boolean(process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID),
    NEXT_PUBLIC_STRIPE_YEARLY_LAUNCH_PROMO_PRICE_ID: Boolean(
      process.env.NEXT_PUBLIC_STRIPE_YEARLY_LAUNCH_PROMO_PRICE_ID
    ),
    NEXT_PUBLIC_LAUNCH_DATE: typeof process.env.NEXT_PUBLIC_LAUNCH_DATE === 'string',
  } as const;

  return NextResponse.json({ ok: Object.values(status).every(Boolean), status });
}
