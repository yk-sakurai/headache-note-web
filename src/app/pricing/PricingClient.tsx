'use client';

import { useEffect, useState } from 'react';
import PriceCard from '@/components/PriceCard';
import {
  MONTHLY_PRICE_YEN,
  YEARLY_PRICE_YEN,
  YEARLY_LAUNCH_PROMO_PRICE_YEN,
  YEARLY_TRIAL_DAYS,
  LAUNCH_PROMO_DAYS,
} from '@/lib/constants';
import { auth, getCurrentUser } from '@/lib/firebase/auth.client';
import { onAuthStateChanged } from 'firebase/auth';

type PricingClientProps = {
  isPromo: boolean;
  checkoutStatus?: string;
};

export default function PricingClient({
  isPromo,
  checkoutStatus,
}: PricingClientProps) {
  const [loading, setLoading] = useState<'web_monthly_v1' | 'web_yearly_v1' | null>(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(!!getCurrentUser());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleCheckout = async (priceId: 'web_monthly_v1' | 'web_yearly_v1') => {
    // 未ログインならログインページへリダイレクト
    const user = getCurrentUser();
    if (!user) {
      window.location.href = '/login?redirect=/pricing';
      return;
    }

    setLoading(priceId);
    try {
      const params = new URLSearchParams(window.location.search);
      const utm = {
        source: params.get('utm_source') || undefined,
        medium: params.get('utm_medium') || undefined,
        campaign: params.get('utm_campaign') || undefined,
        term: params.get('utm_term') || undefined,
        content: params.get('utm_content') || undefined,
      };

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, utm }),
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('エラーが発生しました。もう一度お試しください。');
      setLoading(null);
    }
  };

  return (
    <>
      {checkoutStatus === 'cancel' && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <p className="text-yellow-800">
            登録がキャンセルされました。いつでも再度お試しください。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PriceCard
          title="月額プラン"
          priceLabel={`¥${MONTHLY_PRICE_YEN.toLocaleString()}/月`}
          description="まずは月額で気軽に試したい方向け。"
          features={['すべての有料機能', 'いつでもキャンセル可能']}
          ctaHref="#"
          ctaText={
            loading === 'web_monthly_v1'
              ? '処理中...'
              : isSignedIn
              ? '登録する'
              : 'ログインして登録する'
          }
          onCtaClick={(e) => {
            e.preventDefault();
            handleCheckout('web_monthly_v1');
          }}
          disabled={loading !== null}
        />

        <PriceCard
          title="年額プラン"
          priceLabel={`¥${YEARLY_PRICE_YEN.toLocaleString()}/年`}
          promoLabel={
            isPromo
              ? `¥${YEARLY_LAUNCH_PROMO_PRICE_YEN.toLocaleString()}/年`
              : undefined
          }
          description="14日間無料のあと、年額でお得に継続。"
          features={[
            `初回${YEARLY_TRIAL_DAYS}日間は無料`,
            'すべての有料機能',
            'キャンセルしない限り自動更新（据え置き適用）',
          ]}
          ctaHref="#"
          ctaText={
            loading === 'web_yearly_v1'
              ? '処理中...'
              : isSignedIn
              ? '登録する'
              : 'ログインして登録する'
          }
          onCtaClick={(e) => {
            e.preventDefault();
            handleCheckout('web_yearly_v1');
          }}
          badgeText={`${YEARLY_TRIAL_DAYS}日間無料`}
          highlighted
          disabled={loading !== null}
        />
      </div>

      <section className="pt-8 space-y-4">
        <h2 className="text-xl font-semibold dark:text-white">
          よくある質問
        </h2>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
          <div>
            <p className="font-medium">無料お試しの課金はいつ始まりますか？</p>
            <p>
              年額プランの初回{YEARLY_TRIAL_DAYS}日間は無料です。
              {YEARLY_TRIAL_DAYS}
              日目の終了後に年額課金が適用されます。
            </p>
          </div>
          <div>
            <p className="font-medium">
              サービス開始記念の割引はいつまでですか？
            </p>
            <p>
              サービス開始から{LAUNCH_PROMO_DAYS}
              日以内に年額プランに登録すると、年額
              {`¥${YEARLY_LAUNCH_PROMO_PRICE_YEN.toLocaleString()}`}
              が永年適用されます。
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
            <p>
              はい。請求期間の途中で解約しても、期間終了まではご利用いただけます。
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
