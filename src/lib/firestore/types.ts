import { Timestamp } from "firebase/firestore";
import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";
import type { SuggestionSetting } from "./suggestion-types";

// User collection: users/{uid}
export interface User {
  email: string;
  createdAt: Timestamp | AdminTimestamp;
  admin?: boolean;
  stripeCustomerId?: string;
  lastLoginAt?: Timestamp | AdminTimestamp;
  lastUsedAt?: Timestamp | AdminTimestamp;
  isDeleted?: boolean;
  deletedAt?: Timestamp | AdminTimestamp;
  totalActiveSessionCount?: number;
  totalActiveDaysCount?: number;
}

// Subscription collection: subscriptions/{uid}
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "canceled"
  | "past_due"
  | "unpaid"
  | "incomplete";

export type SubscriptionPlan = "monthly" | "yearly";

export interface Subscription {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  priceId: string;
  platform?: string;
  currentPeriodEnd: Timestamp | AdminTimestamp;
  currentPeriodStart: Timestamp | AdminTimestamp;
  trialEnd?: Timestamp | AdminTimestamp;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Timestamp | AdminTimestamp;
  updatedAt: Timestamp | AdminTimestamp;
  firstSubscribedAt?: Timestamp | AdminTimestamp;
  trialStartedAt?: Timestamp | AdminTimestamp;
}

// UserAppVersion collection: user_app_versions/{versionId}
export interface UserAppVersion {
  userId: string;
  currentVersion: string;
  platform: string;
  osVersion: string;
  firstSeenVersion: string;
  firstSeenAt: Timestamp | AdminTimestamp;
  lastSeenAt: Timestamp | AdminTimestamp;
}

export interface AiReportTokenUsageAverage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AiReportRequestsSnapshot {
  totalCount: number;
  lastRequestedAt?: Timestamp | AdminTimestamp;
  monthlyCounts: Record<string, number>;
  successCount: number;
  failureCount: number;
  countBySource: Record<string, number>;
}

export interface AiReportsSnapshot {
  totalCount: number;
  countByModel: Record<string, number>;
  countBySource: Record<string, number>;
  averageTokenUsage?: AiReportTokenUsageAverage;
}

export interface DeletedUserSnapshot {
  uid: string;
  registeredAt?: Timestamp | AdminTimestamp;
  deletedAt: Timestamp | AdminTimestamp;
  totalActiveSessionCount: number;
  totalActiveDaysCount: number;
  lastUsedAt?: Timestamp | AdminTimestamp;
  averageWeeklyActiveDays: number;
  headacheLogTotalCount: number;
  headacheLogActiveDays: number;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionPlatform?: string;
  subscriptionStartedAt?: Timestamp | AdminTimestamp;
  subscriptionEndedAt?: Timestamp | AdminTimestamp;
  trialStartedAt?: Timestamp | AdminTimestamp;
  trialEndedAt?: Timestamp | AdminTimestamp;
  aiReportRequests?: AiReportRequestsSnapshot;
  aiReports?: AiReportsSnapshot;
  inputSetTotalCount: number;
  usageTrackingSummary?: Record<string, unknown>;
  headacheAlertAccuracy?: {
    headacheRate?: number;
    headacheDays?: number;
    totalDays?: number;
  };
  devicePlatform?: string;
  appVersion?: string;
}

// Invoice subcollection: invoices/{uid}/{invoiceId}
export interface Invoice {
  stripeInvoiceId: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  paid: boolean;
  status: string;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  createdAt: Timestamp | AdminTimestamp;
}

// Checkout Session collection: checkout_sessions/{sessionId}
export type CheckoutMode = "payment" | "subscription";
export type CheckoutStatus = "created" | "completed" | "expired";

export interface CheckoutSession {
  uid?: string;
  mode: CheckoutMode;
  priceId: string;
  customerId?: string;
  status: CheckoutStatus;
  createdAt: Timestamp | AdminTimestamp;
  completedAt?: Timestamp | AdminTimestamp;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

// Audit Log collection: audit_logs/{id}
export type AuditLogType =
  | "pricing_view"
  | "checkout_started"
  | "checkout_completed";

export interface AuditLog {
  type: AuditLogType;
  uid?: string;
  route?: string;
  metadata?: Record<string, string | number | boolean>;
  ts: Timestamp | AdminTimestamp;
}

// Device subcollection: users/{uid}/devices/{deviceId}
export type DevicePlatform = "iOS" | "Android" | "Web";

export interface DevicePushSettings {
  pushEnabled: boolean;
  channels: {
    headache_article: boolean;
    notification: boolean;
  };
}

export interface Device {
  appVersion: string;
  deviceModel: string;
  lastRefreshedAt: Timestamp | AdminTimestamp;
  lastSeenAt: Timestamp | AdminTimestamp;
  osVersion: string;
  platform: DevicePlatform | string;
  token: string;
  tokenValid: boolean;
  userId: string;
  push: DevicePushSettings;
}

// Headache Log related types
export interface HeadacheMedication {
  name: string;
  takenAt: Timestamp | AdminTimestamp;
  // Mobile-compatible required dosage value.
  dosage: number;
  unit: string;
  // Mobile-compatible effectiveness score. 0 is a valid recorded value.
  effectiveness?: number;
}

export interface HeadacheAction {
  text: string;
  takenAt: Timestamp | AdminTimestamp;
  // Mobile-compatible effectiveness score. 0 is a valid recorded value.
  effectiveness?: number;
}

export interface HeadacheLog {
  id: string;
  userId: string;
  timing: Timestamp | AdminTimestamp;
  intensity?: number;
  duration?: number;
  locations?: string[];
  types?: string[];
  triggers?: string[];
  medications?: HeadacheMedication[];
  actions?: HeadacheAction[];
  associatedSymptoms?: string[];
  note?: string;
  isHeadacheFree?: boolean;
}

export type HeadacheLogDurationInputType = "endDatetime" | "duration";

export interface HeadacheLogPreference {
  userId: string;
  headacheLogFormOrder?: string[];
  visibleItems?: Record<string, boolean>;
  durationInputType?: HeadacheLogDurationInputType;
  hiddenRecommendedInputSetKeys?: string[];
  suggestionSettings?: Record<string, SuggestionSetting>;
}
