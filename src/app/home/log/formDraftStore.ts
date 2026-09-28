/**
 * 記録フォームと入力候補編集の往復で、フォーム入力を一時退避するストア。
 *
 * window / document / History API / React に依存しない。
 * 同一タブ・同一ドキュメント寿命だけで保持し、永続化しない。
 * 照合・消費・失効の規則は入力だけで決まる関数とし、メモリ更新は公開操作に限定する。
 */

export type FormDraftActionSnapshot = {
  text: string;
  takenAt: string;
  effectivenessEnabled: boolean;
  effectiveness: number;
};

export type FormDraftMedicationSnapshot = {
  name: string;
  takenAt: string;
  dosageText: string;
  unit: string;
  effectivenessEnabled: boolean;
  effectiveness: number;
};

export type FormDraftDurationMode = "end" | "duration";

/**
 * 記録フォームの 19 項目。
 * `HeadacheLogForm.tsx` はこの型を `import type` で参照する（ストアから TSX への実行時 import は作らない）。
 * エラー state は復元せず、再計算する。
 */
export type HeadacheLogFormSnapshot = {
  timingDate: string;
  timingTime: string;
  intensity: number;
  durationEnabled: boolean;
  durationMode: FormDraftDurationMode;
  durationDays: string;
  durationHours: string;
  durationMinutes: string;
  endTiming: string;
  locations: string[];
  types: string[];
  triggers: string[];
  associatedSymptoms: string[];
  actions: FormDraftActionSnapshot[];
  medications: FormDraftMedicationSnapshot[];
  note: string;
  itemOrder: string[];
  visibilityMap: Record<string, boolean>;
  pinned: boolean;
};

export type FormDraftStatus = "editingSuggestions" | "returning";

export type FormDraftEntry = {
  uid: string;
  /** new または logId */
  recordKey: string;
  /** フォームを新しく開くごとに発行 */
  editSessionId: string;
  /** 候補編集へ出るごとに発行 */
  roundTripId: string;
  originEntryId: string;
  returnUrl: string;
  status: FormDraftStatus;
  snapshot: HeadacheLogFormSnapshot;
  candidateRevision: number;
};

export type FormDraftTicket = {
  uid: string;
  recordKey: string;
  editSessionId: string;
  roundTripId: string;
  originEntryId?: string;
  returnApproved?: boolean;
};

export type BeginRoundTripInput = {
  uid: string;
  recordKey: string;
  editSessionId: string;
  roundTripId: string;
  originEntryId: string;
  returnUrl: string;
  snapshot: HeadacheLogFormSnapshot;
};

const matchesTicket = (entry: FormDraftEntry, ticket: FormDraftTicket): boolean => {
  if (entry.uid !== ticket.uid) return false;
  if (entry.recordKey !== ticket.recordKey) return false;
  if (entry.editSessionId !== ticket.editSessionId) return false;
  if (entry.roundTripId !== ticket.roundTripId) return false;
  if (entry.status !== "returning") return false;
  if (ticket.returnApproved) return true;
  return Boolean(ticket.originEntryId) && entry.originEntryId === ticket.originEntryId;
};

export type FormDraftStore = {
  beginRoundTrip: (input: BeginRoundTripInput) => void;
  markReturning: (roundTripId: string) => void;
  continueRoundTrip: (roundTripId: string) => void;
  bumpCandidateRevision: (roundTripId: string) => void;
  peekReturnDraft: (ticket: FormDraftTicket) => FormDraftEntry | null;
  acknowledgeReturn: (roundTripId: string) => void;
  invalidate: (roundTripId: string) => void;
  invalidateByEditSession: (editSessionId: string) => void;
  invalidateOtherUsers: (uid: string | null) => void;
  invalidateAll: () => void;
  listEntries: () => FormDraftEntry[];
};

export const createFormDraftStore = (): FormDraftStore => {
  const entries = new Map<string, FormDraftEntry>();

  const update = (roundTripId: string, patch: Partial<FormDraftEntry>) => {
    const entry = entries.get(roundTripId);
    if (!entry) return;
    entries.set(roundTripId, { ...entry, ...patch });
  };

  return {
    beginRoundTrip: (input) => {
      for (const [id, entry] of entries) {
        if (entry.editSessionId === input.editSessionId && id !== input.roundTripId) {
          entries.delete(id);
        }
      }
      entries.set(input.roundTripId, {
        uid: input.uid,
        recordKey: input.recordKey,
        editSessionId: input.editSessionId,
        roundTripId: input.roundTripId,
        originEntryId: input.originEntryId,
        returnUrl: input.returnUrl,
        status: "editingSuggestions",
        snapshot: input.snapshot,
        candidateRevision: 0,
      });
    },

    markReturning: (roundTripId) => update(roundTripId, { status: "returning" }),

    continueRoundTrip: (roundTripId) => update(roundTripId, { status: "editingSuggestions" }),

    bumpCandidateRevision: (roundTripId) => {
      const entry = entries.get(roundTripId);
      if (!entry) return;
      entries.set(roundTripId, { ...entry, candidateRevision: entry.candidateRevision + 1 });
    },

    peekReturnDraft: (ticket) => {
      const entry = entries.get(ticket.roundTripId);
      if (!entry) return null;
      return matchesTicket(entry, ticket) ? entry : null;
    },

    acknowledgeReturn: (roundTripId) => {
      entries.delete(roundTripId);
    },

    invalidate: (roundTripId) => {
      entries.delete(roundTripId);
    },

    invalidateByEditSession: (editSessionId) => {
      for (const [id, entry] of entries) {
        if (entry.editSessionId === editSessionId) entries.delete(id);
      }
    },

    invalidateOtherUsers: (uid) => {
      for (const [id, entry] of entries) {
        if (entry.uid !== uid) entries.delete(id);
      }
    },

    invalidateAll: () => {
      entries.clear();
    },

    listEntries: () => Array.from(entries.values()),
  };
};

export const formDraftStore = createFormDraftStore();
