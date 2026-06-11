import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  DeletedUserSnapshot,
  AiReportRequestsSnapshot,
  AiReportsSnapshot,
} from "./types";
import { UserRepository } from "./repositories/server";
import {
  DeletedUserSnapshotRepository,
  WithdrawalDataRepository,
} from "./repositories/server-withdrawal";

type FirestoreTimestampLike = {
  toDate?: () => Date;
  seconds?: number;
  nanoseconds?: number;
};

const TOKYO_TIME_OFFSET_MS = 9 * 60 * 60 * 1000;

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const timestamp = value as FirestoreTimestampLike;
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }

  if (typeof timestamp.seconds === "number") {
    return new Date(
      timestamp.seconds * 1000 + Math.floor((timestamp.nanoseconds ?? 0) / 1_000_000)
    );
  }

  return null;
}

function getTokyoDateParts(date: Date) {
  const tokyoDate = new Date(date.getTime() + TOKYO_TIME_OFFSET_MS);
  return {
    year: tokyoDate.getUTCFullYear(),
    month: String(tokyoDate.getUTCMonth() + 1).padStart(2, "0"),
    day: String(tokyoDate.getUTCDate()).padStart(2, "0"),
  };
}

function toMonthKey(value: unknown): string | null {
  const date = toDate(value);
  if (!date) {
    return null;
  }
  const { year, month } = getTokyoDateParts(date);
  return `${year}-${month}`;
}

function toDayKey(value: unknown): string | null {
  const date = toDate(value);
  if (!date) {
    return null;
  }
  const { year, month, day } = getTokyoDateParts(date);
  return `${year}-${month}-${day}`;
}

function timestampFromDate(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function increment(map: Record<string, number>, key: string | undefined) {
  if (!key) {
    return;
  }
  map[key] = (map[key] ?? 0) + 1;
}

function calculateAverageWeeklyActiveDays(
  registeredAt: unknown,
  deletedAt: Date,
  totalActiveDaysCount: number
): number {
  const registeredDate = toDate(registeredAt);
  if (!registeredDate) {
    return 0;
  }

  const elapsedDays =
    Math.floor((deletedAt.getTime() - registeredDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  if (elapsedDays <= 0) {
    return totalActiveDaysCount;
  }

  const weeks = elapsedDays / 7;
  if (weeks <= 0) {
    return totalActiveDaysCount;
  }

  return Math.round((totalActiveDaysCount / weeks) * 100) / 100;
}

function summarizeAiReportRequests(
  requests: Record<string, unknown>[]
): AiReportRequestsSnapshot {
  const monthlyCounts: Record<string, number> = {};
  const countBySource: Record<string, number> = {};
  let lastRequestedDate: Date | null = null;
  let successCount = 0;
  let failureCount = 0;

  for (const request of requests) {
    const requestedAt =
      request.requestedAt ?? request.createdAt ?? request.updatedAt ?? request.completedAt;
    const monthKey = toMonthKey(requestedAt);
    if (monthKey) {
      increment(monthlyCounts, monthKey);
    }

    const requestedDate = toDate(requestedAt);
    if (requestedDate && (!lastRequestedDate || requestedDate > lastRequestedDate)) {
      lastRequestedDate = requestedDate;
    }

    const status = asString(request.status);
    if (status === "success" || status === "completed") {
      successCount += 1;
    } else if (status === "error") {
      failureCount += 1;
    }

    increment(countBySource, asString(request.source));
  }

  return {
    totalCount: requests.length,
    lastRequestedAt: lastRequestedDate ? timestampFromDate(lastRequestedDate) : undefined,
    monthlyCounts,
    successCount,
    failureCount,
    countBySource,
  };
}

function summarizeAiReports(reports: Record<string, unknown>[]): AiReportsSnapshot {
  const countByModel: Record<string, number> = {};
  const countBySource: Record<string, number> = {};
  let promptTokensSum = 0;
  let completionTokensSum = 0;
  let totalTokensSum = 0;
  let promptTokensCount = 0;
  let completionTokensCount = 0;
  let totalTokensCount = 0;

  for (const report of reports) {
    increment(countByModel, asString(report.model));
    increment(countBySource, asString(report.source));

    const tokenUsage = report.tokenUsage;
    if (!tokenUsage || typeof tokenUsage !== "object") {
      continue;
    }

    const usage = tokenUsage as Record<string, unknown>;
    const prompt = asOptionalNumber(usage.promptTokens);
    const completion = asOptionalNumber(usage.completionTokens);
    const total =
      asOptionalNumber(usage.totalTokens) ??
      (prompt !== undefined || completion !== undefined
        ? (prompt ?? 0) + (completion ?? 0)
        : undefined);

    if (prompt !== undefined) {
      promptTokensSum += prompt;
      promptTokensCount += 1;
    }
    if (completion !== undefined) {
      completionTokensSum += completion;
      completionTokensCount += 1;
    }
    if (total !== undefined) {
      totalTokensSum += total;
      totalTokensCount += 1;
    }
  }

  const averageTokenUsage =
    promptTokensCount > 0 || completionTokensCount > 0 || totalTokensCount > 0
      ? {
          promptTokens:
            promptTokensCount > 0 ? promptTokensSum / promptTokensCount : undefined,
          completionTokens:
            completionTokensCount > 0
              ? completionTokensSum / completionTokensCount
              : undefined,
          totalTokens: totalTokensCount > 0 ? totalTokensSum / totalTokensCount : undefined,
        }
      : undefined;

  return {
    totalCount: reports.length,
    countByModel,
    countBySource,
    averageTokenUsage,
  };
}

async function buildDeletedUserSnapshot(uid: string): Promise<DeletedUserSnapshot | null> {
  const user = await WithdrawalDataRepository.getUser(uid);
  if (!user) {
    return null;
  }

  const deletedAtDate = new Date();
  const deletedAt = timestampFromDate(deletedAtDate);
  const totalActiveDaysCount = asNumber(user.totalActiveDaysCount);
  const headacheLogs = await WithdrawalDataRepository.listHeadacheLogs(uid);
  const headacheLogDays = new Set<string>();

  for (const log of headacheLogs) {
    const dayKey = toDayKey(log.timing);
    if (dayKey) {
      headacheLogDays.add(dayKey);
    }
  }

  const [
    subscription,
    aiReportRequests,
    aiReports,
    inputSetTotalCount,
    usageTrackingSummary,
    headacheAlertAccuracyRaw,
    userAppVersion,
  ] = await Promise.all([
    WithdrawalDataRepository.getSubscription(uid),
    WithdrawalDataRepository.listAiReportRequests(uid),
    WithdrawalDataRepository.listAiReports(uid),
    WithdrawalDataRepository.countInputSets(uid),
    WithdrawalDataRepository.getUsageTrackingSummary(uid),
    WithdrawalDataRepository.getHeadacheAlertAccuracy(uid),
    WithdrawalDataRepository.getUserAppVersion(uid),
  ]);

  const headacheAlertAccuracy = headacheAlertAccuracyRaw
    ? {
        headacheRate: asOptionalNumber(headacheAlertAccuracyRaw.headacheRate),
        headacheDays: asOptionalNumber(headacheAlertAccuracyRaw.headacheDays),
        totalDays: asOptionalNumber(headacheAlertAccuracyRaw.totalDays),
      }
    : undefined;

  return {
    uid,
    registeredAt: user.createdAt as DeletedUserSnapshot["registeredAt"],
    deletedAt,
    totalActiveSessionCount: asNumber(user.totalActiveSessionCount),
    totalActiveDaysCount,
    lastUsedAt: user.lastUsedAt as DeletedUserSnapshot["lastUsedAt"],
    averageWeeklyActiveDays: calculateAverageWeeklyActiveDays(
      user.createdAt,
      deletedAtDate,
      totalActiveDaysCount
    ),
    headacheLogTotalCount: headacheLogs.length,
    headacheLogActiveDays: headacheLogDays.size,
    subscriptionPlan: subscription ? asString(subscription.plan) : undefined,
    subscriptionStatus: subscription ? asString(subscription.status) : undefined,
    subscriptionPlatform: subscription ? asString(subscription.platform) : undefined,
    subscriptionStartedAt: subscription?.firstSubscribedAt as
      | DeletedUserSnapshot["subscriptionStartedAt"]
      | undefined,
    subscriptionEndedAt: subscription?.currentPeriodEnd as
      | DeletedUserSnapshot["subscriptionEndedAt"]
      | undefined,
    trialStartedAt: subscription?.trialStartedAt as
      | DeletedUserSnapshot["trialStartedAt"]
      | undefined,
    trialEndedAt: subscription?.trialEnd as DeletedUserSnapshot["trialEndedAt"] | undefined,
    aiReportRequests: summarizeAiReportRequests(aiReportRequests),
    aiReports: summarizeAiReports(aiReports),
    inputSetTotalCount,
    usageTrackingSummary,
    headacheAlertAccuracy,
    devicePlatform: userAppVersion ? asString(userAppVersion.platform) : undefined,
    appVersion: userAppVersion ? asString(userAppVersion.currentVersion) : undefined,
  };
}

export async function deleteUserAccountData(uid: string): Promise<void> {
  const snapshotExists = await DeletedUserSnapshotRepository.exists(uid);
  if (!snapshotExists) {
    const snapshot = await buildDeletedUserSnapshot(uid);
    if (snapshot) {
      await DeletedUserSnapshotRepository.create(uid, snapshot);
    }
  }

  await Promise.all([
    WithdrawalDataRepository.deleteHeadacheLogs(uid),
    WithdrawalDataRepository.deleteHeadacheLogPreferences(uid),
    WithdrawalDataRepository.deletePrivacyConsents(uid),
    WithdrawalDataRepository.deleteUserAppVersions(uid),
    WithdrawalDataRepository.deleteAiReportRequests(uid),
    WithdrawalDataRepository.deleteAiReports(uid),
    WithdrawalDataRepository.deleteAiReportAutoGenerationPreference(uid),
    WithdrawalDataRepository.deleteHeadacheLogInputSets(uid),
    WithdrawalDataRepository.deleteUsageTracking(uid),
    WithdrawalDataRepository.deleteDevices(uid),
    WithdrawalDataRepository.deleteUserSettings(uid),
    WithdrawalDataRepository.deleteHeadacheAlertAccuracy(uid),
  ]);

  await UserRepository.markUserAsDeleted(uid, FieldValue.serverTimestamp());
}
