import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isSuggestionFieldKey, type SuggestionFieldKey } from "@/lib/firestore/suggestion-types";
import BackButton from "./BackButton";
import SuggestionEditClient from "./SuggestionEditClient";

const FIELD_LABELS: Record<SuggestionFieldKey, string> = {
  locations: "痛みの場所",
  types: "痛み方",
  triggers: "トリガー",
  actions: "対処",
  medications: "服薬",
  associatedSymptoms: "併発症状",
};

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
        <div className="space-y-3">
          <BackButton />
          <h1 className="text-3xl font-semibold tracking-normal">
            {FIELD_LABELS[field]}の入力候補設定
          </h1>
        </div>
        <Suspense
          fallback={
            <p className="rounded border border-[color:var(--brand-mint-border)] bg-white px-4 py-3 text-sm text-[color:var(--text-secondary)]">
              読み込み中...
            </p>
          }
        >
          <SuggestionEditClient fieldKey={field} fieldLabel={FIELD_LABELS[field]} />
        </Suspense>
      </div>
    </main>
  );
}
