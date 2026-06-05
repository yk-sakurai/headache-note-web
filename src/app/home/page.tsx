import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { HeadacheLogRepository } from '@/lib/firestore/repositories/server';
import { sanitizeHeadacheLogStrings } from '@/lib/firestore/repositories/sanitize';
import HeadacheLogListClient from './HeadacheLogListClient';
import type { SerializableHeadacheLog } from './types';
import type { HeadacheLog } from '@/lib/firestore/types';

const toMillis = (value: unknown): number | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime())) {
      return asDate.getTime();
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    const toMillisFn = record && typeof (record as any).toMillis === 'function'
      ? (record as any).toMillis.bind(record)
      : null;
    if (toMillisFn) {
      return toMillisFn();
    }

    const toDateFn = record && typeof (record as any).toDate === 'function'
      ? (record as any).toDate.bind(record)
      : null;
    if (toDateFn) {
      const date = toDateFn();
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.getTime();
      }
    }

    const seconds = typeof record.seconds === 'number'
      ? (record.seconds as number)
      : typeof record._seconds === 'number'
        ? (record._seconds as number)
        : null;

    if (seconds !== null) {
      const nanos = typeof record.nanoseconds === 'number'
        ? (record.nanoseconds as number)
        : typeof record._nanoseconds === 'number'
          ? (record._nanoseconds as number)
          : 0;
      return seconds * 1000 + nanos / 1_000_000;
    }
  }

  return null;
};

const toISOString = (value: unknown): string => {
  const millis = toMillis(value);
  if (millis === null) {
    return '';
  }
  return new Date(millis).toISOString();
};

const serializeLog = (log: HeadacheLog): SerializableHeadacheLog => {
  const sanitized = sanitizeHeadacheLogStrings(log);
  return {
    ...sanitized,
    timing: toISOString(sanitized.timing),
    medications: sanitized.medications?.map((m) => ({
      ...m,
      takenAt: toISOString(m.takenAt),
    })),
    actions: sanitized.actions?.map((a) => ({
      ...a,
      takenAt: toISOString(a.takenAt),
    })),
  };
};

export default async function HomePage() {
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

  const logs = uid ? await HeadacheLogRepository.listLogs(uid, 50) : [];
  const serializedLogs: SerializableHeadacheLog[] = logs.map(serializeLog);

  return (
    <div className="min-h-screen">
      <div className="max-w-screen-lg mx-auto px-4 py-12 space-y-8">
        <HeadacheLogListClient initialLogs={serializedLogs} />
      </div>
    </div>
  );
}
