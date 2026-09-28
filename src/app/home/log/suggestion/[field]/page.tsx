import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isSuggestionFieldKey, type SuggestionFieldKey } from "@/lib/firestore/suggestion-types";
import SuggestionEditClient from "./SuggestionEditClient";

const FIELD_LABELS: Record<SuggestionFieldKey, string> = {
  locations: "痛みの場所",
  types: "痛み方",
  triggers: "トリガー",
  actions: "対処",
  medications: "服薬",
  associatedSymptoms: "併発症状",
};

/**
 * 候補編集画面のページ（Server Component）。
 * ここで行うのは次の 2 つだけ:
 *   1. URL の field が正しい項目名かチェックする（不正なら 404）
 *   2. 項目名と表示ラベルを Client Component に渡す
 *
 * 見出しと画面上部の「戻る」ボタンは SuggestionEditClient 側でまとめて表示する。
 * ここに置くと、戻るボタンと編集画面の間で関数（未保存確認など）を受け渡す必要が出るが、
 * Server Component からは関数を渡せないため。
 */
export default async function SuggestionSettingPage({
  params,
}: {
  params: Promise<{ field: string }>;
}) {
  const { field } = await params;
  if (!isSuggestionFieldKey(field)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[color:var(--brand-mint-bg)] px-4 py-8 text-[color:var(--text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Suspense fallback={null}>
          <SuggestionEditClient fieldKey={field} fieldLabel={FIELD_LABELS[field]} />
        </Suspense>
      </div>
    </main>
  );
}
