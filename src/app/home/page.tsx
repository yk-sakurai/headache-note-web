import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { UserRepository, SubscriptionRepository } from '@/lib/firestore/repositories/server';
import SubscriptionCard from './SubscriptionCard';
import {
  getPlanDisplayName,
  getStatusDisplayName,
  getSubscriptionWarningMessage,
  getSubscriptionStartDate,
} from '@/lib/firestore/helpers';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const checkout = params.checkout;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  let uid: string | null = null;
  try {
    if (sessionCookie) {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      uid = decoded.uid;
    }
  } catch (e) {
    uid = null;
  }

  const [user, subscription] = await Promise.all([
    uid ? UserRepository.getUser(uid) : Promise.resolve(null),
    uid ? SubscriptionRepository.getSubscription(uid) : Promise.resolve(null),
  ]);

  const subscriptionStartDate = getSubscriptionStartDate(subscription);
  const registrationDateLabel = subscriptionStartDate?.toLocaleDateString() ?? null;

  return (
    <div className="min-h-screen">
      <div className="max-w-screen-lg mx-auto px-4 py-12 space-y-8">
        {checkout === 'success' && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-green-800">
              ご登録ありがとうございます！ご利用を開始できます。
            </p>
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">サブスクリプション</h2>
          <SubscriptionCard
            hasCustomer={Boolean(user?.stripeCustomerId)}
            planLabel={getPlanDisplayName(subscription?.plan)}
            statusLabel={subscription ? getStatusDisplayName(subscription.status) : null}
            registrationDateLabel={registrationDateLabel}
            warning={getSubscriptionWarningMessage(subscription)}
          />
        </section>
      </div>
    </div>
  );
}
