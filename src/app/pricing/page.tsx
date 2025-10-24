import PricingClient from './PricingClient';
import {
  LAUNCH_DATE_STR,
  LAUNCH_PROMO_DAYS,
  YEARLY_LAUNCH_PROMO_PRICE_YEN,
  YEARLY_PRICE_YEN,
  YEARLY_TRIAL_DAYS,
} from '@/lib/constants';

export const metadata = {
  title: '料金 | 頭痛ノート',
  description:
    '月額¥290・年額¥1,980（サービス開始から30日間は年額¥1,480・14日間無料）',
};

function isPromoActive(nowMs: number): boolean {
  const launch = new Date(LAUNCH_DATE_STR);
  const promoEnd = new Date(
    launch.getTime() + LAUNCH_PROMO_DAYS * 24 * 60 * 60 * 1000
  );
  return nowMs < promoEnd.getTime();
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const isPromo = isPromoActive(Date.now());

  return (
    <main className="min-h-dvh">
      <section className="mx-auto w-full max-w-screen-lg px-4 py-12 space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight dark:text-white">
            料金
          </h1>
          <p className="text-gray-600 dark:text-gray-200 text-sm md:text-base">
            年額プランは初回{YEARLY_TRIAL_DAYS}日間無料。サービス開始から
            {LAUNCH_PROMO_DAYS}日間は年額
            {`¥${YEARLY_LAUNCH_PROMO_PRICE_YEN.toLocaleString()}`}（通常
            {`¥${YEARLY_PRICE_YEN.toLocaleString()}`}
            ）が永年適用されます。
          </p>
        </header>

        <PricingClient isPromo={isPromo} checkoutStatus={params.checkout} />
      </section>
    </main>
  );
}
