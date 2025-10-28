import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { UserRepository, SubscriptionRepository, InvoiceRepository } from '@/lib/firestore/repositories/server';
import SubscriptionCard from './SubscriptionCard';
import InvoiceList from './InvoiceList';
import ProfileCard from './ProfileCard';
import {
  getPlanDisplayName,
  getStatusDisplayName,
  getSubscriptionWarningMessage,
  getSubscriptionStartDate,
  getNextBillingDate,
  getTrialEndDate,
  getRemainingTrialDays,
  isCancelScheduled,
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

  const [user, subscription, rawInvoices] = await Promise.all([
    uid ? UserRepository.getUser(uid) : Promise.resolve(null),
    uid ? SubscriptionRepository.getSubscription(uid) : Promise.resolve(null),
    uid ? InvoiceRepository.listInvoices(uid) : Promise.resolve([]),
  ]);

  const invoices = rawInvoices.map((inv) => {
    const serialized: any = { ...inv };
    if (inv.createdAt?.toDate) {
      serialized.createdAt = inv.createdAt.toDate().toISOString();
    }
    const anyInv = inv as any;
    if (anyInv.updatedAt?.toDate) {
      serialized.updatedAt = anyInv.updatedAt.toDate().toISOString();
    }
    return serialized;
  });

  const formatDateTime = (date: Date | null) => {
    if (!date) return null;
    try {
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch (_) {
      return null;
    }
  };

  const subscriptionStartDate = getSubscriptionStartDate(subscription);
  const registrationDateLabel = formatDateTime(subscriptionStartDate);
  const nextBillingDate = getNextBillingDate(subscription);
  const nextBillingDateLabel = formatDateTime(nextBillingDate);
  const cancelScheduled = isCancelScheduled(subscription);
  const trialEndDate = getTrialEndDate(subscription);
  const trialEndDateLabel = trialEndDate?.toLocaleDateString() ?? null;
  const remainingTrialDays = getRemainingTrialDays(subscription);

  const userCreatedAtLabel = ((): string | null => {
    const ts: any = user?.createdAt;
    if (!ts) return null;
    if (typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
      try {
        return (ts.toDate() as Date).toLocaleDateString();
      } catch (_) {
        return null;
      }
    }
    return null;
  })();

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
          <h2 className="text-xl font-semibold">プロフィール</h2>
          <ProfileCard email={user?.email ?? ''} createdDateLabel={userCreatedAtLabel} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">サブスクリプション</h2>
          <SubscriptionCard
            hasCustomer={Boolean(user?.stripeCustomerId)}
            planLabel={getPlanDisplayName(subscription?.plan)}
            statusLabel={subscription ? getStatusDisplayName(subscription.status) : null}
            registrationDateLabel={registrationDateLabel}
            warning={getSubscriptionWarningMessage(subscription)}
            status={subscription?.status ?? null}
            nextBillingDateLabel={nextBillingDateLabel}
            isCancelScheduled={cancelScheduled}
            trialEndDateLabel={trialEndDateLabel}
            remainingTrialDays={remainingTrialDays}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">請求履歴</h2>
          <InvoiceList invoices={invoices} />
        </section>
      </div>
    </div>
  );
}
