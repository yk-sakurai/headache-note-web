import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE_NAME,
  STRIPE_MONTHLY_PRICE_ID,
  STRIPE_YEARLY_PRICE_ID,
  STRIPE_YEARLY_LAUNCH_PROMO_PRICE_ID,
  LAUNCH_DATE_STR,
  LAUNCH_PROMO_DAYS,
  WEB_BILLING_ENABLED,
} from '@/lib/constants';
import { getAuth } from 'firebase-admin/auth';
import { adminApp, adminDb } from '@/lib/firebase/admin';

// Stripe 未導入の間は Web からの課金操作を受け付けない
const WEB_BILLING_DISABLED_MESSAGE =
  '有料プランのお申し込み・管理はモバイルアプリから行ってください。';

// プロモーション期間判定（サーバー側）
function isPromoActive(): boolean {
  const now = Date.now();
  const launch = new Date(LAUNCH_DATE_STR);
  const promoEnd = new Date(
    launch.getTime() + LAUNCH_PROMO_DAYS * 24 * 60 * 60 * 1000
  );
  return now < promoEnd.getTime();
}

export async function POST(req: NextRequest) {
  if (!WEB_BILLING_ENABLED) {
    return NextResponse.json(
      { error: WEB_BILLING_DISABLED_MESSAGE },
      { status: 403 }
    );
  }

  try {
    // 1. セッションCookieからユーザー認証
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedClaims = await getAuth(adminApp).verifySessionCookie(
      sessionCookie,
      true
    );
    const uid = decodedClaims.uid;
    const email = decodedClaims.email;

    // 2. リクエストボディからpriceIdとUTMを取得
    const body = await req.json();
    const { priceId, utm } = body as {
      priceId: 'web_monthly_v1' | 'web_yearly_v1';
      utm?: {
        source?: string;
        medium?: string;
        campaign?: string;
        term?: string;
        content?: string;
      };
    };

    // CookieからUTMをフォールバック（7日間保持）
    const utmFromCookies = (() => {
      const store = cookieStore;
      const get = (k: string) => store.get(k)?.value || undefined;
      return {
        source: utm?.source ?? get('utm_source'),
        medium: utm?.medium ?? get('utm_medium'),
        campaign: utm?.campaign ?? get('utm_campaign'),
        term: utm?.term ?? get('utm_term'),
        content: utm?.content ?? get('utm_content'),
      };
    })();

    // 3. priceIdをStripe Price IDに変換（サーバー側でプロモ判定）
    let stripePriceId: string;
    let trialPeriodDays: number | undefined;
    let actualPriceId: 'web_monthly_v1' | 'web_yearly_v1' | 'web_yearly_v1_launch_promo' = priceId;

    if (priceId === 'web_monthly_v1') {
      stripePriceId = STRIPE_MONTHLY_PRICE_ID;
    } else if (priceId === 'web_yearly_v1') {
      // サーバー側でプロモーション期間かどうかを判定
      const isPromo = isPromoActive();
      if (isPromo) {
        stripePriceId = STRIPE_YEARLY_LAUNCH_PROMO_PRICE_ID;
        actualPriceId = 'web_yearly_v1_launch_promo';
      } else {
        stripePriceId = STRIPE_YEARLY_PRICE_ID;
      }
      trialPeriodDays = 14;
    } else {
      return NextResponse.json({ error: 'Invalid priceId' }, { status: 400 });
    }

    // 4. Checkout Session作成
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      mode: 'subscription',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      subscription_data: trialPeriodDays
        ? { trial_period_days: trialPeriodDays }
        : undefined,
      success_url: `${req.nextUrl.origin}/home?checkout=success`,
      cancel_url: `${req.nextUrl.origin}/pricing?checkout=cancel`,
      metadata: {
        uid,
        priceId: actualPriceId,
        ...(utmFromCookies && {
          utm_source: utmFromCookies.source || '',
          utm_medium: utmFromCookies.medium || '',
          utm_campaign: utmFromCookies.campaign || '',
          utm_term: utmFromCookies.term || '',
          utm_content: utmFromCookies.content || '',
        }),
      },
    });

    // Firestore に作成イベントを記録（webhook checkout.session.created の代替）
    try {
      const createdAt =
        (session as any).created ? new Date((session as any).created * 1000) : new Date();
      const utmToSave =
        utmFromCookies && Object.values(utmFromCookies).some(Boolean)
          ? {
              ...(utmFromCookies.source ? { source: utmFromCookies.source } : {}),
              ...(utmFromCookies.medium ? { medium: utmFromCookies.medium } : {}),
              ...(utmFromCookies.campaign ? { campaign: utmFromCookies.campaign } : {}),
              ...(utmFromCookies.term ? { term: utmFromCookies.term } : {}),
              ...(utmFromCookies.content ? { content: utmFromCookies.content } : {}),
            }
          : undefined;

      const checkoutData: Record<string, unknown> = {
        status: 'created',
        mode: 'subscription',
        platform: 'web',
        uid,
        priceId: actualPriceId,
        createdAt,
      };
      if (utmToSave) checkoutData['utm'] = utmToSave;

      await adminDb.collection('checkout_sessions').doc(session.id).set(checkoutData, {
        merge: true,
      });
    } catch (e) {
      // 失敗してもチェックアウト自体は継続
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
