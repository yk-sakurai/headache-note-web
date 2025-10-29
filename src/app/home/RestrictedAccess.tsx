"use client";

import { useState } from "react";
import type { SubscriptionStatus } from "@/lib/firestore/types";
import type { AccessDeniedReason } from "@/lib/firestore/helpers";

export default function RestrictedAccess({
  reason,
  status,
}: {
  reason: AccessDeniedReason;
  status?: SubscriptionStatus | null;
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

  return (
    <div className="max-w-screen-md mx-auto">
      <div className="border rounded-lg p-6 space-y-4 bg-white">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">現在、ダッシュボードへのアクセスが制限されています</h2>
          <p className="text-sm text-gray-700">{reason.message}</p>
        </div>

        {status === "past_due" ? (
          <div className="bg-red-50 border border-red-200 p-3 rounded-md text-sm text-red-800">
            お支払いが遅延しています。支払い方法の更新で解消できます。
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {reason.suggestPortal ? (
            <button
              onClick={handleOpenPortal}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-white text-sm disabled:opacity-50"
            >
              {loading ? "読み込み中..." : "支払い方法を更新"}
            </button>
          ) : null}

          {reason.suggestPricing ? (
            <a
              href="/pricing"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm"
            >
              料金ページへ
            </a>
          ) : null}

          <a
            href="mailto:support@example.com?subject=サブスクリプションについて"
            className="text-sm text-gray-600 underline"
          >
            サポートに連絡
          </a>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
