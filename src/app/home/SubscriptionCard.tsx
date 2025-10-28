"use client";

import { useState } from "react";

export default function SubscriptionCard({
  hasCustomer,
  planLabel,
  statusLabel,
  registrationDateLabel,
  warning,
}: {
  hasCustomer: boolean;
  planLabel: string;
  statusLabel?: string | null;
  registrationDateLabel?: string | null;
  warning?: string | null;
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-gray-600">ステータス</p>
          <p className="text-base font-medium">{statusLabel ?? "-"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-600">登録日</p>
          <p className="text-base font-medium">{registrationDateLabel ?? "-"}</p>
        </div>
      </div>

      {warning ? (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm">
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
