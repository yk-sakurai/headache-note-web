"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getCurrentUser } from "@/lib/firebase/auth.client";
import { ClientHeadacheLogRepository } from "@/lib/firestore/repositories/client";
import { sanitizeStringList } from "@/lib/firestore/repositories/sanitize";
import type { HeadacheLog } from "@/lib/firestore/types";
import HeadacheLogForm, { type HeadacheLogFormData } from "../HeadacheLogForm";
import {
  deleteHeadacheFreeConflicts,
  findConflictingHeadacheFreeLogs,
} from "../headacheFreeConflict";
import { buildActionPayload, buildMedicationPayload, toTimestamp } from "../payload";

export default function NewHeadacheLogPage() {
  const router = useRouter();
  const [pendingData, setPendingData] = useState<HeadacheLogFormData | null>(null);
  const [conflicts, setConflicts] = useState<HeadacheLog[]>([]);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [confirmingConflict, setConfirmingConflict] = useState(false);

  const saveLog = async (data: HeadacheLogFormData) => {
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
  };

  const handleSubmit = async (data: HeadacheLogFormData) => {
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
      setConflicts(nextConflicts);
      setConflictDialogOpen(true);
      return;
    }

    await saveLog(data);
    router.push("/records?notice=created");
  };

  const handleConfirmConflict = async () => {
    if (!pendingData || confirmingConflict) return;
    setConflictDialogOpen(false);
    setOperationError(null);
    setConfirmingConflict(true);
    try {
      await deleteHeadacheFreeConflicts(conflicts);
      await saveLog(pendingData);
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
        <HeadacheLogForm onSubmit={handleSubmit} submitLabel="決定" />
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
          setConflicts([]);
        }}
      />
    </main>
  );
}
