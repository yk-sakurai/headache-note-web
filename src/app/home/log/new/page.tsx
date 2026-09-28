"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useSuggestionNavigation } from "@/components/SuggestionNavigationProvider";
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
  createSuggestionRange,
  type MergedSuggestionItem,
  type SuggestionFieldKey,
} from "@/lib/firestore/suggestion-types";
import HeadacheLogForm, {
  type HeadacheLogFormData,
  type HeadacheLogPreferenceInput,
} from "../HeadacheLogForm";
import { formDraftStore, type HeadacheLogFormSnapshot } from "../formDraftStore";
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

const createSessionId = () => {
  return globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random()}`;
};

type FormRestore = {
  roundTripId: string;
  snapshot: HeadacheLogFormSnapshot;
};

const RECORD_KEY = "new";
const RETURN_URL = "/home/log/new";

export default function NewHeadacheLogPage() {
  const router = useRouter();
  const nav = useSuggestionNavigation();
  const [sessionId] = useState(createSessionId);
  const [editSessionId] = useState(createSessionId);
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

  // 候補編集画面から戻ってきたとき、退避しておいた入力内容を取り出す。
  // ここでは読み取るだけで、退避データの削除は復元が確定した後（下の useEffect）で行う。
  const claimRestore = useCallback((): FormRestore | null => {
    const ticket = nav.claimReturnTicket(getCurrentUser()?.uid ?? null, RECORD_KEY);
    if (!ticket) return null;
    const snapshot = formDraftStore.peekReturnDraft(ticket)?.snapshot ?? null;
    if (!snapshot) return null;
    return { roundTripId: ticket.roundTripId, snapshot };
  }, [nav]);

  const [restore, setRestore] = useState<FormRestore | null>(claimRestore);

  // 画面遷移の許可が、このページの初回描画より後に届くことがある（ルーターが先に表示される場合など）。
  // そのため初回に取り出せなくても諦めず、許可が届いたタイミングでもう一度取り出しを試みる。
  // 取り出せるのは「この登録画面に戻る」と登録された分だけで、同じデータを二度使うことはない。
  useEffect(() => {
    if (restore) return;
    const next = claimRestore();
    if (next) setRestore(next);
  }, [claimRestore, nav.leaveApprovedCount, restore]);

  // 実際に復元できたときだけ、退避データを使用済みにする（何度呼ばれても結果は変わらない）。
  useEffect(() => {
    if (!restore) return;
    formDraftStore.acknowledgeReturn(restore.roundTripId);
  }, [restore]);

  const handleSuggestionEditNavigate = useCallback(
    (snapshot: HeadacheLogFormSnapshot) => {
      const user = getCurrentUser();
      if (!user) return;
      nav.beginRoundTrip({
        uid: user.uid,
        recordKey: RECORD_KEY,
        editSessionId,
        returnUrl: RETURN_URL,
        snapshot,
      });
    },
    [editSessionId, nav]
  );

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
        ClientHeadacheLogRepository.listLogsInRangeRaw(user.uid, startMs, endMs)
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

  // 候補編集画面で候補が保存されたら、設定と候補の集計元になる過去の記録を読み込み直し、
  // 候補リストだけを最新にする（入力中の内容はそのまま残る）。
  useEffect(() => {
    if (nav.suggestionRevision === 0) return;
    let mounted = true;
    const user = getCurrentUser();
    if (!user) return;

    (async () => {
      try {
        const { startMs, endMs } = createSuggestionRange();
        const [preference, logs] = await Promise.all([
          ClientHeadacheLogPreferenceRepository.getByUserId(user.uid),
          ClientHeadacheLogRepository.listLogsInRangeRaw(user.uid, startMs, endMs),
        ]);
        if (!mounted) return;
        setSuggestions(buildSuggestionsByField(logs, preference?.data.suggestionSettings));
      } catch (error) {
        console.error("頭痛記録候補再取得エラー:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [nav.suggestionRevision]);

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
    nav.invalidateRoundTrip(editSessionId);
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
      nav.invalidateRoundTrip(editSessionId);
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
            // 戻りの許可が後から届いた場合は、key を変えてフォームを作り直し、退避していた入力内容で初期化する。
            key={restore?.roundTripId ?? "initial"}
            initialPreference={initialPreference ?? undefined}
            suggestions={suggestions}
            onSuggestionUsed={handleSuggestionUsed}
            logSuggestionEditBasePath="/home/log/suggestion"
            isNewLog={true}
            onSubmit={handleSubmit}
            submitLabel="決定"
            restoredSnapshot={restore?.snapshot ?? null}
            onSuggestionEditNavigate={handleSuggestionEditNavigate}
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
