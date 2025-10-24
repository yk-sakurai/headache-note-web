import Stripe from 'stripe';

// ビルド時は環境変数が未設定の場合があるため、ダミー値を使用
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build';

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});
