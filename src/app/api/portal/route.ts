import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, WEB_BILLING_ENABLED } from '@/lib/constants';
import { adminAuth } from '@/lib/firebase/admin';
import { stripe } from '@/lib/stripe/server';
import { UserRepository } from '@/lib/firestore/repositories/server';

// Stripe 未導入の間は Web からの課金操作を受け付けない
const WEB_BILLING_DISABLED_MESSAGE =
  '有料プランのお申し込み・管理はモバイルアプリから行ってください。';

export async function POST(req: NextRequest) {
  if (!WEB_BILLING_ENABLED) {
    return NextResponse.json(
      { error: WEB_BILLING_DISABLED_MESSAGE },
      { status: 403 }
    );
  }

  try {
    // 1. 認証チェック（Firebase AdminのセッションCookie）
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    // 2. ユーザー取得（stripeCustomerId必要）
    const user = await UserRepository.getUser(uid);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'Stripe customer not found for user' },
        { status: 404 }
      );
    }

    // 3. Portal Session作成
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${req.nextUrl.origin}/home`,
    });

    // 4. URL返却
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
