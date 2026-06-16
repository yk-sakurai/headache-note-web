"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getCurrentUser } from "@/lib/firebase/auth.client";
import {
  ClientHeadacheLogPreferenceRepository,
  ClientHeadacheLogRepository,
  ClientUsageTrackingRepository,
} from "@/lib/firestore/repositories/client";
import { sanitizeStringList } from "@/lib/firestore/repositories/sanitize";
import type { HeadacheLog } from "@/lib/firestore/types";
import {
  buildSuggestionsByField,
  type MergedSuggestionItem,
  type SuggestionFieldKey,
} from "@/lib/firestore/suggestion-types";
import HeadacheLogForm, {
  type HeadacheLogFormData,
  type HeadacheLogPreferenceInput,
} from "../HeadacheLogForm";
import {
  deleteHeadacheFreeConflicts,
  findConflictingHeadacheFreeLogs,
} from "../headacheFreeConflict";
import { buildActionPayload, buildMedicationPayload, toTimestamp } from "../payload";

const areStringArraysEqual = (a?: string[], b?: string[]) => {
  const left = a ?? [];
  const right = b ?? [];
  return left.length === right.length && left.every((value, index) => value === right[index]);
};

const areVisibilityMapsEqual = (
  a?: Record<string, boolean>,
  b?: Record<string, boolean>
) => {
  const left = a ?? {};
  const right = b ?? {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return Array.from(keys).every((key) => Boolean(left[key]) === Boolean(right[key]));
};

const preferenceChanged = (
  current: HeadacheLogPreferenceInput | null,
  next: HeadacheLogPreferenceInput
) => {
  if (!current) return true;
  return (
    !areStringArraysEqual(current.formOrder, next.formOrder) ||
    current.durationInputType !== next.durationInputType ||
    !areVisibilityMapsEqual(current.visibleItems, next.visibleItems)
  );
};

const toPreferenceInput = (
  preference: Awaited<ReturnType<typeof ClientHeadacheLogPreferenceRepository.getByUserId>>
): HeadacheLogPreferenceInput | null => {
  if (!preference) return null;
  return {
    formOrder: preference.data.headacheLogFormOrder,
    visibleItems: preference.data.visibleItems,
    durationInputType: preference.data.durationInputType,
  };
};

const createSuggestionRange = () => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 364);
  start.setHours(0, 0, 0, 0);
  return { startMs: start.getTime(), endMs: end.getTime() };
};

const createSessionId = () => {
  return globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random()}`;
};

export default function NewHeadacheLogPage() {
  const router = useRouter();
  const [sessionId] = useState(createSessionId);
  const [pendingData, setPendingData] = useState<HeadacheLogFormData | null>(null);
  const [pendingPreference, setPendingPreference] = useState<HeadacheLogPreferenceInput | null>(
    null
  );
  const [initialPreference, setInitialPreference] = useState<HeadacheLogPreferenceInput | null>(
    null
  );
  const [preferenceLoading, setPreferenceLoading] = useState(true);
  const [conflicts, setConflicts] = useState<HeadacheLog[]>([]);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [confirmingConflict, setConfirmingConflict] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Partial<Record<SuggestionFieldKey, MergedSuggestionItem[]>>
  >({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = getCurrentUser();
        if (!user) {
          if (mounted) setPreferenceLoading(false);
          return;
        }

        const preference = await ClientHeadacheLogPreferenceRepository.getByUserId(user.uid);

        if (mounted) {
          setInitialPreference(toPreferenceInput(preference));
          setPreferenceLoading(false);
        }

        const { startMs, endMs } = createSuggestionRange();
        ClientHeadacheLogRepository.listLogsInRange(user.uid, startMs, endMs)
          .then((logs) => {
            if (!mounted) return;
            setSuggestions(buildSuggestionsByField(logs, preference?.data.suggestionSettings));
          })
          .catch((error) => {
            console.error("頭痛記録候補取得エラー:", error);
            if (mounted) setSuggestions({});
          });
      } catch (error) {
        console.error("頭痛記録フォーム設定取得エラー:", error);
        if (mounted) {
          setInitialPreference(null);
          setPreferenceLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const saveLog = async (data: HeadacheLogFormData, preference: HeadacheLogPreferenceInput) => {
    const user = getCurrentUser();
    if (!user) {
      throw new Error("ログインが必要です");
    }

    const timing = toTimestamp(data.timing);
    if (!timing) {
      throw new Error("発生日時が正しくありません");
    }

    const sanitizedLocations = sanitizeStringList(data.locations);
    const sanitizedTypes = sanitizeStringList(data.types);
    const sanitizedTriggers = sanitizeStringList(data.triggers);
    const sanitizedAssociatedSymptoms = sanitizeStringList(data.associatedSymptoms);
    const medicationsPayload = buildMedicationPayload(data.medications);
    const actionsPayload = buildActionPayload(data.actions);
    const noteText = (data.note ?? "").trim();

    await ClientHeadacheLogRepository.createLog({
      userId: user.uid,
      timing,
      ...(data.intensity !== undefined ? { intensity: data.intensity } : {}),
      ...(data.duration !== undefined ? { duration: data.duration } : {}),
      ...(sanitizedLocations.length > 0 ? { locations: sanitizedLocations } : {}),
      ...(sanitizedTypes.length > 0 ? { types: sanitizedTypes } : {}),
      ...(sanitizedTriggers.length > 0 ? { triggers: sanitizedTriggers } : {}),
      ...(sanitizedAssociatedSymptoms.length > 0
        ? { associatedSymptoms: sanitizedAssociatedSymptoms }
        : {}),
      ...(medicationsPayload.length > 0 ? { medications: medicationsPayload } : {}),
      ...(actionsPayload.length > 0 ? { actions: actionsPayload } : {}),
      ...(noteText.length > 0 ? { note: noteText } : {}),
    });

    if (preferenceChanged(initialPreference, preference)) {
      await ClientHeadacheLogPreferenceRepository.save(user.uid, {
        userId: user.uid,
        headacheLogFormOrder: preference.formOrder,
        visibleItems: preference.visibleItems,
        durationInputType: preference.durationInputType,
      });
    }
  };

  const handleSuggestionUsed = () => {
    const user = getCurrentUser();
    if (!user) return;
    void ClientUsageTrackingRepository.trackSuggestionUsed(user.uid, sessionId, true);
  };

  const handleSubmit = async (
    data: HeadacheLogFormData,
    preference: HeadacheLogPreferenceInput
  ) => {
    if (confirmingConflict) return;
    setOperationError(null);
    const user = getCurrentUser();
    if (!user) {
      throw new Error("ログインが必要です");
    }

    const nextConflicts = await findConflictingHeadacheFreeLogs({
      uid: user.uid,
      timing: data.timing,
      duration: data.duration,
    });

    if (nextConflicts.length > 0) {
      setPendingData(data);
      setPendingPreference(preference);
      setConflicts(nextConflicts);
      setConflictDialogOpen(true);
      return;
    }

    await saveLog(data, preference);
    router.push("/records?notice=created");
  };

  const handleConfirmConflict = async () => {
    if (!pendingData || !pendingPreference || confirmingConflict) return;
    setConflictDialogOpen(false);
    setOperationError(null);
    setConfirmingConflict(true);
    try {
      await deleteHeadacheFreeConflicts(conflicts);
      await saveLog(pendingData, pendingPreference);
      router.push("/records?notice=created");
    } catch (error) {
      console.error("頭痛なし記録の削除または頭痛記録保存エラー:", error);
      setOperationError(
        "保存できませんでした。頭痛なし記録の状態を一覧で確認して、もう一度お試しください。"
      );
    } finally {
      setConfirmingConflict(false);
    }
  };

  return (
    <main className="min-h-screen bg-[color:var(--brand-mint-bg)] px-4 py-8 text-[color:var(--text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <Link
            href="/records"
            className="inline-flex text-sm font-medium text-[color:var(--brand-primary-active)] underline-offset-4 hover:underline"
          >
            ← 記録一覧に戻る
          </Link>
          <h1 className="text-3xl font-semibold tracking-normal">頭痛記録登録</h1>
        </div>
        {operationError && (
          <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {operationError}
          </p>
        )}
        {preferenceLoading ? (
          <p className="rounded border border-[color:var(--brand-mint-border)] bg-white px-4 py-3 text-sm text-[color:var(--text-secondary)]">
            読み込み中...
          </p>
        ) : (
          <HeadacheLogForm
            initialPreference={initialPreference ?? undefined}
            suggestions={suggestions}
            onSuggestionUsed={handleSuggestionUsed}
            logSuggestionEditBasePath="/home/log/suggestion"
            isNewLog={true}
            onSubmit={handleSubmit}
            submitLabel="決定"
          />
        )}
      </div>
      <ConfirmDialog
        isOpen={conflictDialogOpen}
        title="頭痛なしの記録があります"
        message="入力した日は頭痛なしの記録があります。削除して登録しますか？"
        confirmText="削除して登録"
        cancelText="キャンセル"
        onConfirm={handleConfirmConflict}
        onCancel={() => {
          setConflictDialogOpen(false);
          setPendingData(null);
          setPendingPreference(null);
          setConflicts([]);
        }}
      />
    </main>
  );
}
