"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useSuggestionNavigation } from "@/components/SuggestionNavigationProvider";
import { getCurrentUser } from "@/lib/firebase/auth.client";
import {
  ClientHeadacheLogPreferenceRepository,
  ClientHeadacheLogRepository,
  ClientUsageTrackingRepository,
  type HeadacheLogUpdateData,
} from "@/lib/firestore/repositories/client";
import { sanitizeStringList } from "@/lib/firestore/repositories/sanitize";
import type { HeadacheLog } from "@/lib/firestore/types";
import {
  buildSuggestionsByField,
  createSuggestionRange,
  type MergedSuggestionItem,
  type SuggestionFieldKey,
} from "@/lib/firestore/suggestion-types";
import { deleteField, type Timestamp } from "firebase/firestore";
import HeadacheLogForm, {
  type HeadacheLogFormData,
  type HeadacheLogPreferenceInput,
} from "../../HeadacheLogForm";
import { toLocalDateTimeInput } from "../../datetime";
import { formDraftStore, type HeadacheLogFormSnapshot } from "../../formDraftStore";
import {
  deleteHeadacheFreeConflicts,
  findConflictingHeadacheFreeLogs,
} from "../../headacheFreeConflict";
import { buildActionPayload, buildMedicationPayload, toTimestamp } from "../../payload";

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

type FormRestore = {
  roundTripId: string;
  snapshot: HeadacheLogFormSnapshot;
};

const createSessionId = () => {
  return globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random()}`;
};

export default function EditHeadacheLogPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const nav = useSuggestionNavigation();
  const logId = params?.id;
  const [sessionId] = useState(createSessionId);
  const [editSessionId] = useState(createSessionId);
  const [log, setLog] = useState<HeadacheLog | null>(null);
  const [initialPreference, setInitialPreference] = useState<HeadacheLogPreferenceInput | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [pendingData, setPendingData] = useState<HeadacheLogFormData | null>(null);
  const [pendingPreference, setPendingPreference] = useState<HeadacheLogPreferenceInput | null>(
    null
  );
  const [conflicts, setConflicts] = useState<HeadacheLog[]>([]);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [confirmingConflict, setConfirmingConflict] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Partial<Record<SuggestionFieldKey, MergedSuggestionItem[]>>
  >({});

  // 候補編集画面から戻ってきたとき、退避しておいた入力内容を取り出す。
  // 取り出すのは、編集中の記録 ID と一致するデータだけ。
  // ここでは読み取るだけで、退避データの削除は復元が確定した後（下の useEffect）で行う。
  const recordKey = params?.id ?? "";
  const claimRestore = useCallback((): FormRestore | null => {
    const ticket = nav.claimReturnTicket(getCurrentUser()?.uid ?? null, recordKey);
    if (!ticket) return null;
    const snapshot = formDraftStore.peekReturnDraft(ticket)?.snapshot ?? null;
    if (!snapshot) return null;
    return { roundTripId: ticket.roundTripId, snapshot };
  }, [nav, recordKey]);

  const [restore, setRestore] = useState<FormRestore | null>(claimRestore);

  // 画面遷移の許可が、このページの初回描画より後に届くことがある（ルーターが先に表示される場合など）。
  // そのため初回に取り出せなくても諦めず、許可が届いたタイミングでもう一度取り出しを試みる。
  // 取り出せるのは「この編集画面に戻る」と登録された分だけで、同じデータを二度使うことはない。
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
      if (!user || !logId) return;
      nav.beginRoundTrip({
        uid: user.uid,
        recordKey: logId,
        editSessionId,
        returnUrl: `/home/log/${logId}/edit`,
        snapshot,
      });
    },
    [editSessionId, logId, nav]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!logId) return;
      try {
        const user = getCurrentUser();
        const { startMs, endMs } = createSuggestionRange();
        const [result, preference] = await Promise.all([
          ClientHeadacheLogRepository.getLog(logId),
          user ? ClientHeadacheLogPreferenceRepository.getByUserId(user.uid) : Promise.resolve(null),
        ]);

        if (mounted) {
          setLog(result);
          setInitialPreference(toPreferenceInput(preference));
          setLoading(false);
        }

        if (user) {
          ClientHeadacheLogRepository.listLogsInRangeRaw(user.uid, startMs, endMs)
            .then((logs) => {
              if (!mounted) return;
              setSuggestions(buildSuggestionsByField(logs, preference?.data.suggestionSettings));
            })
            .catch((error) => {
              console.error("頭痛記録候補取得エラー:", error);
              if (mounted) setSuggestions({});
            });
        }
      } catch (error) {
        console.error("頭痛記録取得エラー:", error);
        if (mounted) {
          setPageError("記録を読み込めませんでした。");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [logId]);

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

  const initial: Partial<HeadacheLogFormData> | undefined = useMemo(() => {
    if (!log) return undefined;
    return {
      timing: toLocalDateTimeInput(log.timing as Timestamp),
      intensity: log.intensity,
      duration: log.duration,
      locations: log.locations,
      types: log.types,
      triggers: log.triggers,
      associatedSymptoms: log.associatedSymptoms,
      note: log.note ?? undefined,
      medications: log.medications?.map((medication) => ({
        name: medication.name,
        dosage: medication.dosage,
        unit: medication.unit,
        takenAt: toLocalDateTimeInput(medication.takenAt as Timestamp),
        effectiveness: medication.effectiveness,
      })),
      actions: log.actions?.map((action) => ({
        text: action.text,
        takenAt: toLocalDateTimeInput(action.takenAt as Timestamp),
        effectiveness: action.effectiveness,
      })),
    };
  }, [log]);

  const saveLog = async (data: HeadacheLogFormData, preference: HeadacheLogPreferenceInput) => {
    if (!logId) return;
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
    const updates: HeadacheLogUpdateData = { timing };

    const setListField = (
      key: "locations" | "types" | "triggers" | "associatedSymptoms",
      values: string[],
      previous?: string[]
    ) => {
      if (values.length > 0) {
        updates[key] = values;
      } else if (previous && previous.length > 0) {
        updates[key] = deleteField();
      }
    };

    setListField("locations", sanitizedLocations, log?.locations);
    setListField("types", sanitizedTypes, log?.types);
    setListField("triggers", sanitizedTriggers, log?.triggers);
    setListField("associatedSymptoms", sanitizedAssociatedSymptoms, log?.associatedSymptoms);

    if (medicationsPayload.length > 0) {
      updates.medications = medicationsPayload;
    } else if (log?.medications && log.medications.length > 0) {
      updates.medications = deleteField();
    }

    if (actionsPayload.length > 0) {
      updates.actions = actionsPayload;
    } else if (log?.actions && log.actions.length > 0) {
      updates.actions = deleteField();
    }

    const noteText = (data.note ?? "").trim();
    if (noteText.length > 0) {
      updates.note = noteText;
    } else if (log?.note) {
      updates.note = deleteField();
    }

    if (data.intensity !== undefined) {
      updates.intensity = data.intensity;
    } else if (log?.intensity !== undefined) {
      updates.intensity = deleteField();
    }

    if (data.duration !== undefined) {
      updates.duration = data.duration;
    } else if (log?.duration !== undefined) {
      updates.duration = deleteField();
    }

    await ClientHeadacheLogRepository.updateLog(logId, updates);
    await ClientHeadacheLogPreferenceRepository.save(user.uid, {
      userId: user.uid,
      headacheLogFormOrder: preference.formOrder,
      durationInputType: preference.durationInputType,
    });
  };

  const handleSubmit = async (
    data: HeadacheLogFormData,
    preference: HeadacheLogPreferenceInput
  ) => {
    if (confirmingConflict || deleting) return;
    setOperationError(null);
    const user = getCurrentUser();
    if (!user) {
      throw new Error("ログインが必要です");
    }

    const nextConflicts = await findConflictingHeadacheFreeLogs({
      uid: user.uid,
      timing: data.timing,
      duration: data.duration,
      excludeLogId: logId,
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
    router.push("/records?notice=updated");
  };

  const handleSuggestionUsed = () => {
    const user = getCurrentUser();
    if (!user) return;
    void ClientUsageTrackingRepository.trackSuggestionUsed(user.uid, sessionId, false);
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
      router.push("/records?notice=updated");
    } catch (error) {
      console.error("頭痛なし記録の削除または頭痛記録保存エラー:", error);
      setOperationError(
        "更新できませんでした。頭痛なし記録の状態を一覧で確認して、もう一度お試しください。"
      );
    } finally {
      setConfirmingConflict(false);
    }
  };

  const handleDelete = async () => {
    if (!logId || deleting) return;
    setOperationError(null);
    setDeleting(true);
    try {
      await ClientHeadacheLogRepository.deleteLog(logId);
      nav.invalidateRoundTrip(editSessionId);
      router.push("/records?notice=deleted");
    } catch (error) {
      console.error("頭痛記録削除エラー:", error);
      setDeleteDialogOpen(false);
      setOperationError("削除できませんでした。時間をおいてもう一度お試しください。");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[color:var(--brand-mint-bg)] px-4 py-8 text-[color:var(--text-primary)]">
        読み込み中...
      </main>
    );
  }

  if (pageError || !log || !initial) {
    return (
      <main className="min-h-screen bg-[color:var(--brand-mint-bg)] px-4 py-8 text-[color:var(--text-primary)]">
        {pageError ?? "記録が見つかりませんでした。"}
      </main>
    );
  }

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
          <h1 className="text-3xl font-semibold tracking-normal">頭痛記録編集</h1>
        </div>
        {operationError && (
          <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {operationError}
          </p>
        )}
        <HeadacheLogForm
          // 戻りの許可が後から届いた場合は、key を変えてフォームを作り直し、退避していた入力内容で初期化する。
          key={restore?.roundTripId ?? "initial"}
          initial={initial}
          initialPreference={initialPreference ?? undefined}
          suggestions={suggestions}
          onSuggestionUsed={handleSuggestionUsed}
          logSuggestionEditBasePath="/home/log/suggestion"
          isNewLog={false}
          onSubmit={handleSubmit}
          onDelete={() => setDeleteDialogOpen(true)}
          submitLabel="決定"
          restoredSnapshot={restore?.snapshot ?? null}
          onSuggestionEditNavigate={handleSuggestionEditNavigate}
        />
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
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="頭痛記録の削除"
        message="頭痛記録を削除します。よろしいですか？"
        confirmText="削除"
        cancelText="キャンセル"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </main>
  );
}
