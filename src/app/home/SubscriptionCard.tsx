"use client";

import { useState } from "react";
import type { SubscriptionStatus } from "@/lib/firestore/types";

export default function SubscriptionCard({
  hasCustomer,
  planLabel,
  statusLabel,
  registrationDateLabel,
  warning,
  status,
  nextBillingDateLabel,
  isCancelScheduled,
  trialEndDateLabel,
  remainingTrialDays,
}: {
  hasCustomer: boolean;
  planLabel: string;
  statusLabel?: string | null;
  registrationDateLabel?: string | null;
  warning?: string | null;
  status?: SubscriptionStatus | null;
  nextBillingDateLabel?: string | null;
  isCancelScheduled?: boolean;
  trialEndDateLabel?: string | null;
  remainingTrialDays?: number | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenPortal = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "ポータルの作成に失敗しました");
      }
      const data = (await res.json()) as { url: string };
      if (!data.url) {
        throw new Error("ポータルURLが取得できませんでした");
      }
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || "不明なエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (!hasCustomer) {
    return (
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-sm">まだサブスクリプションがありません。</p>
        <a
          href="/pricing"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm disabled:opacity-50"
        >
          料金ページへ
        </a>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-gray-600">現在のプラン</p>
        <p className="text-base font-medium">{planLabel}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-gray-600">ステータス</p>
          <p className="text-base font-medium">{statusLabel ?? "-"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-600">プラン開始日時</p>
          <p className="text-base font-medium">{registrationDateLabel ?? "-"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-600">
            {isCancelScheduled 
              ? "サービス終了日" 
              : status === "trialing" 
                ? "課金開始日" 
                : "次回更新日時"}
          </p>
          <p className="text-base font-medium">{nextBillingDateLabel ?? "-"}</p>
        </div>
      </div>

      {status === "trialing" ? (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <span>
              トライアル終了日: <span className="font-medium">{trialEndDateLabel ?? "-"}</span>
            </span>
            <span>
              残り日数: <span className="font-medium">{remainingTrialDays ?? "-"}</span>日
            </span>
          </div>
        </div>
      ) : null}

      {status === "canceled" ? (
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-md text-sm">
          サブスクリプションはキャンセル済みです。期末まではアクセス可能です。
        </div>
      ) : null}

      {warning ? (
        <div
          className={
            (status === "past_due" || status === "unpaid")
              ? "bg-red-50 border border-red-200 p-3 rounded-md text-sm text-red-800"
              : "bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm"
          }
        >
          {warning}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          onClick={handleOpenPortal}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-white text-sm disabled:opacity-50"
        >
          {loading ? "読み込み中..." : "プランを管理"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
