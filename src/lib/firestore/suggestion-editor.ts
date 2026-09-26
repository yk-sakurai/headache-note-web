import { MANUAL_DISPLAY_LIMIT, MANUAL_SAVE_LIMIT } from "@/lib/headache-log-constraints";
import {
  buildFinalSuggestions,
  getDefaultAutoOrder,
  suggestionValueToFirestore,
  type AutoSuggestionItem,
  type EditableManualEntry,
  type ManualSuggestionItem,
  type MergedSuggestionItem,
  type SuggestionContainerStatus,
  type SuggestionFieldKey,
  type SuggestionFieldStatus,
  type SuggestionSetting,
  type SuggestionSettingForEdit,
  type SuggestionSourceType,
  type SuggestionValue,
} from "./suggestion-types";
import {
  hasSuggestionInputErrors,
  validateRawInputConstraints,
  type SuggestionInputErrors,
} from "./suggestion-validation";

export type ParsedManualEntry = Extract<EditableManualEntry, { kind: "parsed" }>;
export type UnparsedManualEntry = Extract<EditableManualEntry, { kind: "unparsed" }>;

export type SuggestionEditorAutoEntry = {
  sourceType: SuggestionSourceType;
  value: SuggestionValue;
  generationIndex: number;
  isVisible: boolean;
};

export type SuggestionEditorState = {
  fieldKey: SuggestionFieldKey;
  containerStatus: SuggestionContainerStatus;
  originalContainer: unknown;
  fieldStatus?: SuggestionFieldStatus;
  originalField: unknown;
  /** 解析できた手動候補。並び順は配列順で保持する */
  entries: ParsedManualEntry[];
  /** 読み込めなかった手動候補。元データのまま保持する */
  unparsedEntries: UnparsedManualEntry[];
  /** 生成された自動枠。手動との重複で隠れている枠も保持する */
  autoEntries: SuggestionEditorAutoEntry[];
  originalOverrides: { mostFrequent?: unknown; mostRecent?: unknown };
  nextEntrySeq: number;
};

export type SuggestionSettingDiagnostics = {
  containerError?: string;
  fieldError?: string;
  totalManualCount: number;
  visibleManualCount: number;
  countError?: string;
  visibleCountError?: string;
  invalidManualItems: { id: string; errors: SuggestionInputErrors }[];
  unparsableManualItems: { id: string; reason: string }[];
  invalidOrderItems: { id: string; rawOrder: unknown }[];
};

export const UNREADABLE_SETTING_MESSAGE =
  "候補設定を読み取れないため、編集・保存できません。復旧についてサポートへお問い合わせください。";

export const MANUAL_LIMIT_MESSAGE = `保存できる手動候補は${MANUAL_SAVE_LIMIT}件までです。`;

export const DISPLAY_LIMIT_MESSAGE = `記録フォームに表示できる候補は${MANUAL_DISPLAY_LIMIT}件までです。`;

export const HIDDEN_ADD_NOTICE = `表示中の候補が${MANUAL_DISPLAY_LIMIT}件のため、非表示で追加しました。`;

export const DUPLICATE_MESSAGE = "同じ候補がすでにあります。";

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/** 編集画面の一覧に出す自動枠（全手動キーと重複する枠は隠す） */
export const getEditorAutoEntries = (
  state: SuggestionEditorState
): SuggestionEditorAutoEntry[] => {
  const manualKeys = new Set(state.entries.map((entry) => entry.item.value.canonicalKey));
  return state.autoEntries.filter((entry) => !manualKeys.has(entry.value.canonicalKey));
};

export const getTotalManualCount = (state: SuggestionEditorState) =>
  state.entries.length + state.unparsedEntries.length;

export const getVisibleManualCount = (state: SuggestionEditorState) =>
  state.entries.filter((entry) => entry.item.isVisible).length;

/** 編集中の状態から、記録フォームのプレビューに使う表示用設定を作る */
export const buildEditorSetting = (state: SuggestionEditorState): SuggestionSetting => {
  const manualItems: ManualSuggestionItem[] = state.entries.map((entry, index) => ({
    value: entry.item.value,
    isVisible: entry.item.isVisible,
    order: index + 1,
  }));

  const visibleAuto = getEditorAutoEntries(state);
  const overrideFor = (sourceType: SuggestionSourceType) => {
    const index = visibleAuto.findIndex((entry) => entry.sourceType === sourceType);
    if (index === -1) return undefined;
    return {
      isVisible: visibleAuto[index].isVisible,
      order: manualItems.length + index + 1,
    };
  };

  return {
    manualItems,
    mostFrequentOverride: overrideFor("mostFrequent"),
    mostRecentOverride: overrideFor("mostRecent"),
  };
};

export const buildEditorPreview = (
  state: SuggestionEditorState,
  autoSuggestions: AutoSuggestionItem[]
): MergedSuggestionItem[] =>
  buildFinalSuggestions({ autoSuggestions, setting: buildEditorSetting(state) });

export const createEditorState = ({
  fieldKey,
  forEdit,
  autoSuggestions,
}: {
  fieldKey: SuggestionFieldKey;
  forEdit: SuggestionSettingForEdit;
  autoSuggestions: AutoSuggestionItem[];
}): SuggestionEditorState => {
  const parsed = forEdit.entries.filter(
    (entry): entry is ParsedManualEntry => entry.kind === "parsed"
  );
  const unparsed = forEdit.entries.filter(
    (entry): entry is UnparsedManualEntry => entry.kind === "unparsed"
  );

  const sortedParsed = [...parsed].sort((a, b) => {
    if (a.item.order !== b.item.order) return a.item.order - b.item.order;
    return a.item.value.canonicalKey.localeCompare(b.item.value.canonicalKey, "ja");
  });

  const manualItems = sortedParsed.map((entry) => entry.item);
  const overrideOf = (sourceType: SuggestionSourceType) =>
    sourceType === "mostFrequent"
      ? forEdit.originalOverrides.mostFrequent
      : forEdit.originalOverrides.mostRecent;

  const autoEntries = autoSuggestions
    .map((item) => {
      const rawOverride = overrideOf(item.sourceType);
      const override = isPlainRecord(rawOverride) ? rawOverride : undefined;
      const order =
        typeof override?.order === "number" && Number.isFinite(override.order)
          ? override.order
          : getDefaultAutoOrder(manualItems, item.generationIndex);
      return {
        entry: {
          sourceType: item.sourceType,
          value: item.value,
          generationIndex: item.generationIndex,
          isVisible: typeof override?.isVisible === "boolean" ? override.isVisible : true,
        } satisfies SuggestionEditorAutoEntry,
        order,
      };
    })
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.entry.value.canonicalKey.localeCompare(b.entry.value.canonicalKey, "ja");
    })
    .map(({ entry }) => entry);

  return {
    fieldKey,
    containerStatus: forEdit.containerStatus,
    originalContainer: forEdit.originalContainer,
    fieldStatus: forEdit.fieldStatus,
    originalField: forEdit.originalField,
    entries: sortedParsed,
    unparsedEntries: unparsed,
    autoEntries,
    originalOverrides: forEdit.originalOverrides,
    nextEntrySeq: 1,
  };
};

export type AddAvailability =
  | { allowed: true; addAsHidden: boolean; notice?: string }
  | { allowed: false; reason: string };

export const canStartAdd = (state: SuggestionEditorState): AddAvailability => {
  if (state.containerStatus === "invalid" || state.fieldStatus === "invalid") {
    return { allowed: false, reason: UNREADABLE_SETTING_MESSAGE };
  }
  if (getTotalManualCount(state) >= MANUAL_SAVE_LIMIT) {
    return { allowed: false, reason: MANUAL_LIMIT_MESSAGE };
  }
  if (getVisibleManualCount(state) >= MANUAL_DISPLAY_LIMIT) {
    return { allowed: true, addAsHidden: true, notice: HIDDEN_ADD_NOTICE };
  }
  return { allowed: true, addAsHidden: false };
};

export type EditorMutation =
  | { ok: true; state: SuggestionEditorState; notice?: string }
  | { ok: false; reason: string };

const hasDuplicate = (
  state: SuggestionEditorState,
  value: SuggestionValue,
  exceptId?: string
) =>
  state.entries.some(
    (entry) => entry.id !== exceptId && entry.item.value.canonicalKey === value.canonicalKey
  );

export const addManualItem = (
  state: SuggestionEditorState,
  value: SuggestionValue
): EditorMutation => {
  const availability = canStartAdd(state);
  if (!availability.allowed) {
    return { ok: false, reason: availability.reason };
  }
  if (hasDuplicate(state, value)) {
    return { ok: false, reason: DUPLICATE_MESSAGE };
  }

  const id = `new-${state.nextEntrySeq}`;
  const entry: ParsedManualEntry = {
    kind: "parsed",
    id,
    item: { value, isVisible: !availability.addAsHidden, order: state.entries.length + 1 },
    rawInput:
      value.type === "medication"
        ? { type: "medication", name: value.name, dosage: value.dosage, unit: value.unit }
        : { type: "text", text: value.text },
    rawOrder: undefined,
    originalRaw: undefined,
    valueEdited: true,
  };

  return {
    ok: true,
    state: {
      ...state,
      entries: [...state.entries, entry],
      nextEntrySeq: state.nextEntrySeq + 1,
    },
    notice: availability.notice,
  };
};

export const updateManualItem = (
  state: SuggestionEditorState,
  id: string,
  value: SuggestionValue
): EditorMutation => {
  const target = state.entries.find((entry) => entry.id === id);
  if (!target) {
    return { ok: false, reason: "対象の候補が見つかりません。" };
  }
  if (hasDuplicate(state, value, id)) {
    return { ok: false, reason: DUPLICATE_MESSAGE };
  }

  return {
    ok: true,
    state: {
      ...state,
      entries: state.entries.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              item: { ...entry.item, value },
              rawInput:
                value.type === "medication"
                  ? {
                      type: "medication" as const,
                      name: value.name,
                      dosage: value.dosage,
                      unit: value.unit,
                    }
                  : { type: "text" as const, text: value.text },
              valueEdited: true,
            }
          : entry
      ),
    },
  };
};

export const setManualVisibility = (
  state: SuggestionEditorState,
  id: string,
  isVisible: boolean
): EditorMutation => {
  const target = state.entries.find((entry) => entry.id === id);
  if (!target) {
    return { ok: false, reason: "対象の候補が見つかりません。" };
  }
  if (isVisible && !target.item.isVisible && getVisibleManualCount(state) >= MANUAL_DISPLAY_LIMIT) {
    return { ok: false, reason: DISPLAY_LIMIT_MESSAGE };
  }

  return {
    ok: true,
    state: {
      ...state,
      entries: state.entries.map((entry) =>
        entry.id === id ? { ...entry, item: { ...entry.item, isVisible } } : entry
      ),
    },
  };
};

export const removeManualItem = (
  state: SuggestionEditorState,
  id: string
): SuggestionEditorState => ({
  ...state,
  entries: state.entries.filter((entry) => entry.id !== id),
  unparsedEntries: state.unparsedEntries.filter((entry) => entry.id !== id),
});

export const setAutoVisibility = (
  state: SuggestionEditorState,
  sourceType: SuggestionSourceType,
  isVisible: boolean
): SuggestionEditorState => ({
  ...state,
  autoEntries: state.autoEntries.map((entry) =>
    entry.sourceType === sourceType ? { ...entry, isVisible } : entry
  ),
});

const moveInArray = <T,>(items: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/** 手動セクション内の並べ替え。セクションをまたぐ移動は提供しない。 */
export const reorderManualEntries = (
  state: SuggestionEditorState,
  fromIndex: number,
  toIndex: number
): SuggestionEditorState => ({
  ...state,
  entries: moveInArray(state.entries, fromIndex, toIndex),
});

/** 自動セクション内の並べ替え。一覧に出ている枠の並びを入れ替える。 */
export const reorderAutoEntries = (
  state: SuggestionEditorState,
  fromIndex: number,
  toIndex: number
): SuggestionEditorState => {
  const visible = getEditorAutoEntries(state);
  const fromSource = visible[fromIndex]?.sourceType;
  const toSource = visible[toIndex]?.sourceType;
  if (!fromSource || !toSource) return state;

  const absoluteFrom = state.autoEntries.findIndex((entry) => entry.sourceType === fromSource);
  const absoluteTo = state.autoEntries.findIndex((entry) => entry.sourceType === toSource);
  return { ...state, autoEntries: moveInArray(state.autoEntries, absoluteFrom, absoluteTo) };
};

export const reorderItems = (
  state: SuggestionEditorState,
  section: "manual" | "auto",
  fromIndex: number,
  toIndex: number
): SuggestionEditorState =>
  section === "manual"
    ? reorderManualEntries(state, fromIndex, toIndex)
    : reorderAutoEntries(state, fromIndex, toIndex);

/**
 * 画面全体の診断。初期表示・操作後・保存直前に実施する。
 * 解析不能行・入力制約違反・件数超過を、非表示の行も含めて検出する。
 */
export const diagnoseEditor = (state: SuggestionEditorState): SuggestionSettingDiagnostics => {
  const totalManualCount = getTotalManualCount(state);
  const visibleManualCount = getVisibleManualCount(state);

  const invalidManualItems = state.entries
    .map((entry) => ({ id: entry.id, errors: validateRawInputConstraints(entry.rawInput) }))
    .filter(({ errors }) => hasSuggestionInputErrors(errors));

  const invalidOrderItems = state.entries
    .filter((entry) => entry.rawOrder !== undefined && !isNonNegativeInteger(entry.rawOrder))
    .map((entry) => ({ id: entry.id, rawOrder: entry.rawOrder }));

  const overCount = totalManualCount - MANUAL_SAVE_LIMIT;

  return {
    containerError: state.containerStatus === "invalid" ? UNREADABLE_SETTING_MESSAGE : undefined,
    fieldError: state.fieldStatus === "invalid" ? UNREADABLE_SETTING_MESSAGE : undefined,
    totalManualCount,
    visibleManualCount,
    countError:
      overCount > 0
        ? `${MANUAL_LIMIT_MESSAGE}${overCount}件削除してください。`
        : undefined,
    visibleCountError:
      visibleManualCount > MANUAL_DISPLAY_LIMIT
        ? `${DISPLAY_LIMIT_MESSAGE}表示中を${MANUAL_DISPLAY_LIMIT}件以下にしてください。`
        : undefined,
    invalidManualItems,
    unparsableManualItems: state.unparsedEntries.map((entry) => ({
      id: entry.id,
      reason: entry.reason,
    })),
    invalidOrderItems,
  };
};

export type EditorSaveValidation =
  | { ok: true; diagnostics: SuggestionSettingDiagnostics }
  | { ok: false; diagnostics: SuggestionSettingDiagnostics; errors: string[] };

export const validateEditorForSave = (state: SuggestionEditorState): EditorSaveValidation => {
  const diagnostics = diagnoseEditor(state);
  const errors: string[] = [];

  if (diagnostics.containerError) errors.push(diagnostics.containerError);
  if (diagnostics.fieldError) errors.push(diagnostics.fieldError);
  if (diagnostics.countError) errors.push(diagnostics.countError);
  if (diagnostics.visibleCountError) errors.push(diagnostics.visibleCountError);
  if (diagnostics.invalidManualItems.length > 0) {
    errors.push("入力条件を満たしていない候補があります。修正または削除してください。");
  }

  return errors.length > 0 ? { ok: false, diagnostics, errors } : { ok: true, diagnostics };
};

/** Firestore へ書き込めない値（undefined・関数・シンボル）が含まれていないか検査する */
const containsUnwritableValue = (value: unknown, depth = 0): boolean => {
  if (depth > 20) return true;
  if (value === undefined) return true;
  if (typeof value === "function" || typeof value === "symbol") return true;
  if (Array.isArray(value)) {
    return value.some((item) => containsUnwritableValue(item, depth + 1));
  }
  if (isPlainRecord(value)) {
    return Object.values(value).some((item) => containsUnwritableValue(item, depth + 1));
  }
  return false;
};

/**
 * 実際に保存される value を求める。
 * 未編集の行は生値を保持し、編集した行だけ検証済みの新しい値へ置き換える。
 * 変更検知もこの結果で行い、編集履歴フラグでは判定しない。
 */
const resolveManualItemValue = (entry: ParsedManualEntry): unknown => {
  if (entry.valueEdited) {
    return suggestionValueToFirestore(entry.item.value);
  }
  return isPlainRecord(entry.originalRaw)
    ? entry.originalRaw.value
    : suggestionValueToFirestore(entry.item.value);
};

const buildManualItemPayload = (entry: ParsedManualEntry, order: number): unknown => {
  const base = isPlainRecord(entry.originalRaw) ? { ...entry.originalRaw } : {};

  return {
    ...base,
    value: resolveManualItemValue(entry),
    isVisible: entry.item.isVisible,
    order,
  };
};

const buildAppearingOverride = (
  rawOverride: unknown,
  isVisible: boolean,
  order: number
): Record<string, unknown> => {
  const base = isPlainRecord(rawOverride) ? { ...rawOverride } : {};
  return { ...base, isVisible, order };
};

const buildHiddenOverride = (rawOverride: unknown): Record<string, unknown> | undefined => {
  if (!isPlainRecord(rawOverride)) return undefined;
  const next = { ...rawOverride };
  if (!isNonNegativeInteger(next.order)) {
    delete next.order;
  }
  return Object.keys(next).length > 0 ? next : undefined;
};

export type SuggestionSavePayload = {
  fieldPayload: Record<string, unknown>;
  /** 保存後の状態確認に使う件数 */
  manualCount: number;
};

export type SavePayloadResult =
  | { ok: true; payload: SuggestionSavePayload }
  | { ok: false; errors: string[] };

/**
 * 保存ペイロードを組み立てる。
 * - 解析可能な手動行 → 一覧の並びで 1..n を採番
 * - 一覧に出ている自動枠 → 手動の後に整数連番、編集した表示設定
 * - 手動との重複で隠れた枠・未生成枠 → 表示設定を保持し、不正な order だけ除去
 * - 解析不能行 → 元の形のまま末尾に戻す
 * - 対象項目の未知プロパティ → 値ごと保持
 */
export const buildSuggestionSavePayload = (
  state: SuggestionEditorState
): SavePayloadResult => {
  const validation = validateEditorForSave(state);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const manualItems: unknown[] = state.entries.map((entry, index) =>
    buildManualItemPayload(entry, index + 1)
  );
  const unparsedItems = state.unparsedEntries.map((entry) => entry.originalRaw);
  const allManualItems = [...manualItems, ...unparsedItems];

  const appearingAuto = getEditorAutoEntries(state);
  const overrides: Partial<Record<"mostFrequentOverride" | "mostRecentOverride", unknown>> = {};

  for (const sourceType of ["mostFrequent", "mostRecent"] as const) {
    const key = sourceType === "mostFrequent" ? "mostFrequentOverride" : "mostRecentOverride";
    const rawOverride =
      sourceType === "mostFrequent"
        ? state.originalOverrides.mostFrequent
        : state.originalOverrides.mostRecent;
    const appearingIndex = appearingAuto.findIndex((entry) => entry.sourceType === sourceType);

    if (appearingIndex >= 0) {
      overrides[key] = buildAppearingOverride(
        rawOverride,
        appearingAuto[appearingIndex].isVisible,
        manualItems.length + appearingIndex + 1
      );
      continue;
    }

    const hidden = buildHiddenOverride(rawOverride);
    if (hidden) {
      overrides[key] = hidden;
    }
  }

  const baseField = isPlainRecord(state.originalField) ? { ...state.originalField } : {};
  delete baseField.manualItems;
  delete baseField.mostFrequentOverride;
  delete baseField.mostRecentOverride;

  const fieldPayload: Record<string, unknown> = {
    ...baseField,
    manualItems: allManualItems,
    ...overrides,
  };

  if (containsUnwritableValue(fieldPayload)) {
    return {
      ok: false,
      errors: ["保存できない値が候補設定に含まれています。該当の候補を削除してください。"],
    };
  }

  return { ok: true, payload: { fieldPayload, manualCount: allManualItems.length } };
};

/**
 * 変更検知用のスナップショット。
 * ID・診断の表示状態・保存時の order 自動補正は含めない。
 * 値は編集履歴フラグではなく実際に保存される内容で比較するため、
 * 元の値へ戻した行は dirty にならない（生値の空白等を変えた場合は dirty のまま）。
 */
export const createEditorSnapshot = (state: SuggestionEditorState): string =>
  JSON.stringify({
    entries: state.entries.map((entry) => [
      resolveManualItemValue(entry),
      entry.item.isVisible,
    ]),
    unparsed: state.unparsedEntries.map((entry) => entry.id),
    auto: state.autoEntries.map((entry) => [entry.sourceType, entry.isVisible]),
  });
