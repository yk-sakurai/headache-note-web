import PriceCard from "@/components/PriceCard";
import {
  LAUNCH_DATE_STR,
  LAUNCH_PROMO_DAYS,
  MONTHLY_PRICE_YEN,
  YEARLY_PRICE_YEN,
  YEARLY_PROMO_PRICE_YEN,
  YEARLY_TRIAL_DAYS,
} from "@/lib/constants";

export const metadata = {
  title: "料金 | 頭痛ノート",
  description: "月額¥290・年額¥1,980（サービス開始から30日間は年額¥1,480・14日間無料）",
};

function isPromoActive(nowMs: number): boolean {
  const launch = new Date(LAUNCH_DATE_STR);
  const promoEnd = new Date(
    launch.getTime() + LAUNCH_PROMO_DAYS * 24 * 60 * 60 * 1000
  );
  return nowMs < promoEnd.getTime();
}

export default function PricingPage() {
  const isPromo = isPromoActive(Date.now());

  return (
    <main className="min-h-dvh">
      <section className="mx-auto w-full max-w-screen-lg px-4 py-12 space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight dark:text-white">料金</h1>
          <p className="text-gray-600 dark:text-gray-200 text-sm md:text-base">
            年額プランは初回{YEARLY_TRIAL_DAYS}日間無料。サービス開始から{LAUNCH_PROMO_DAYS}
            日間は年額{`¥${YEARLY_PROMO_PRICE_YEN.toLocaleString()}`}（通常{`¥${YEARLY_PRICE_YEN.toLocaleString()}`}
            ）が永年適用されます。
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PriceCard
            title="月額プラン"
            priceLabel={`¥${MONTHLY_PRICE_YEN.toLocaleString()}/月`}
            description="まずは月額で気軽に試したい方向け。"
            features={["すべての有料機能", "いつでもキャンセル可能"]}
            ctaHref="/login"
            ctaText="ログインして開始"
          />

          <PriceCard
            title="年額プラン"
            priceLabel={`¥${YEARLY_PRICE_YEN.toLocaleString()}/年`}
            promoLabel={isPromo ? `¥${YEARLY_PROMO_PRICE_YEN.toLocaleString()}/年` : undefined}
            description="14日間無料のあと、年額でお得に継続。"
            features={[
              `初回${YEARLY_TRIAL_DAYS}日間は無料`,
              "すべての有料機能",
              "キャンセルしない限り自動更新（据え置き適用）",
            ]}
            ctaHref="/login"
            ctaText="14日間無料で試す"
            badgeText={`${YEARLY_TRIAL_DAYS}日間無料`}
            highlighted
          />
        </div>

        <section className="pt-8 space-y-4">
          <h2 className="text-xl font-semibold dark:text-white">よくある質問</h2>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
            <div>
              <p className="font-medium">無料お試しの課金はいつ始まりますか？</p>
              <p>年額プランの初回{YEARLY_TRIAL_DAYS}日間は無料です。{YEARLY_TRIAL_DAYS}日目の終了後に年額課金が適用されます。</p>
            </div>
            <div>
              <p className="font-medium">サービス開始記念の割引はいつまでですか？</p>
              <p>
                サービス開始から{LAUNCH_PROMO_DAYS}日以内に年額プランに登録すると、年額{`¥${YEARLY_PROMO_PRICE_YEN.toLocaleString()}`}が永年適用されます。
              </p>
            </div>
            <div>
              <p className="font-medium">値上げがあった場合はどうなりますか？</p>
              <p>
                すでに継続しているお客様には据え置きが適用され、値上げ後も同じ価格が維持されます。
              </p>
            </div>
            <div>
              <p className="font-medium">解約はいつでもできますか？</p>
              <p>はい。請求期間の途中で解約しても、期間終了まではご利用いただけます。</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
