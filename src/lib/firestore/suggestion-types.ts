import {
  AUTO_DISPLAY_LIMIT,
  AUTO_ORDER_OFFSET,
  MANUAL_DISPLAY_LIMIT,
} from "@/lib/headache-log-constraints";

export const SUGGESTION_FIELD_KEYS = [
  "locations",
  "types",
  "triggers",
  "actions",
  "medications",
  "associatedSymptoms",
] as const;

export type SuggestionFieldKey = (typeof SUGGESTION_FIELD_KEYS)[number];

/** 自動候補の集計期間の日数（当日を含む直近1年） */
export const SUGGESTION_RANGE_DAYS = 365;
export type SuggestionSourceType = "mostFrequent" | "mostRecent";

export type TextSuggestionValue = {
  type: "text";
  text: string;
  canonicalKey: string;
  displayText: string;
};

export type MedicationSuggestionValue = {
  type: "medication";
  name: string;
  dosage: number;
  unit: string;
  canonicalKey: string;
  displayText: string;
};

export type SuggestionValue = TextSuggestionValue | MedicationSuggestionValue;

export type ManualSuggestionItem = {
  value: SuggestionValue;
  isVisible: boolean;
  order: number;
};

export type AutoSuggestionOverride = {
  isVisible?: boolean;
  order?: number;
};

export type SuggestionSetting = {
  manualItems: ManualSuggestionItem[];
  mostFrequentOverride?: AutoSuggestionOverride;
  mostRecentOverride?: AutoSuggestionOverride;
};

export type AutoSuggestionItem = {
  value: SuggestionValue;
  sourceType: SuggestionSourceType;
  generationIndex: number;
};

export type MergedSuggestionItem = {
  value: SuggestionValue;
  isManual: boolean;
  autoSourceType?: SuggestionSourceType;
  isVisible: boolean;
  order: number;
};

type FirestoreSuggestionValue =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "medication";
      name: string;
      dosage: number;
      unit: string;
    };

/**
 * 候補集計だけに使う、検査済みの記録データ。
 * Firestore の生データを `readRawSuggestionLog` で検査してから作る。
 * sanitize（trim・全角半角変換・重複除去）は通さず、生の文字列を保持する。
 */
export type SuggestionSourceLog = {
  timingMs: number;
  locations: string[];
  types: string[];
  triggers: string[];
  associatedSymptoms: string[];
  actions: { text: string }[];
  medications: { name: string; dosage: number; unit: string }[];
};

/** 編集画面が保持する、手動候補1件分のモデル */
export type EditableRawInput =
  | { type: "text"; text: string }
  | { type: "medication"; name: string; dosage: number | string; unit: string };

export type EditableManualEntry =
  | {
      kind: "parsed";
      id: string;
      item: ManualSuggestionItem;
      /** 正規化前の入力値。既存候補の制約違反診断に使う */
      rawInput: EditableRawInput;
      rawOrder: unknown;
      originalRaw: unknown;
      valueEdited: boolean;
    }
  | {
      kind: "unparsed";
      id: string;
      originalRaw: unknown;
      reason: string;
    };

export type SuggestionContainerStatus = "missing" | "valid" | "invalid";
export type SuggestionFieldStatus = "missing" | "valid" | "invalid";

export type SuggestionSettingForEdit = {
  containerStatus: SuggestionContainerStatus;
  originalContainer: unknown;
  /** containerStatus が invalid のときは未判定 */
  fieldStatus?: SuggestionFieldStatus;
  originalField: unknown;
  entries: EditableManualEntry[];
  originalOverrides: { mostFrequent?: unknown; mostRecent?: unknown };
};

const FULLWIDTH_ASCII_START = 0xff01;
const FULLWIDTH_ASCII_END = 0xff5e;
const ASCII_OFFSET = 0xfee0;

export const isSuggestionFieldKey = (value: string): value is SuggestionFieldKey => {
  return (SUGGESTION_FIELD_KEYS as readonly string[]).includes(value);
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const normalizeSuggestionText = (text: string): string => {
  const halfWidth = Array.from(text)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= FULLWIDTH_ASCII_START && code <= FULLWIDTH_ASCII_END) {
        return String.fromCharCode(code - ASCII_OFFSET);
      }
      return char;
    })
    .join("");

  return halfWidth.trim().replace(/\s+/g, " ");
};

const normalizeDosageForKey = (dosage: number): string => String(dosage);

const formatMedicationDosage = (dosage: number) => {
  return String(dosage);
};

export const createTextSuggestionValue = (text: string): TextSuggestionValue | null => {
  const normalized = normalizeSuggestionText(text);
  if (!normalized) return null;

  return {
    type: "text",
    text: normalized,
    canonicalKey: normalized,
    displayText: normalized,
  };
};

export const createMedicationSuggestionValue = ({
  name,
  dosage,
  unit,
}: {
  name: string;
  dosage: number | string;
  unit: string;
}): MedicationSuggestionValue | null => {
  const normalizedName = normalizeSuggestionText(name);
  const normalizedUnit = normalizeSuggestionText(unit);
  const numericDosage = typeof dosage === "number" ? dosage : Number(String(dosage).trim());
  const isBlankString = typeof dosage === "string" && dosage.trim().length === 0;
  if (!normalizedName || !normalizedUnit || isBlankString || !Number.isFinite(numericDosage)) {
    return null;
  }

  const lowercaseUnit = normalizedUnit.toLowerCase();

  return {
    type: "medication",
    name: normalizedName,
    dosage: numericDosage,
    unit: normalizedUnit,
    canonicalKey: `${normalizedName}_${normalizeDosageForKey(numericDosage)}_${lowercaseUnit}`,
    displayText: `${normalizedName} ${formatMedicationDosage(numericDosage)}${normalizedUnit}`,
  };
};

export const suggestionValueToFirestore = (
  value: SuggestionValue
): FirestoreSuggestionValue => {
  if (value.type === "medication") {
    return {
      type: "medication",
      name: value.name,
      dosage: value.dosage,
      unit: value.unit,
    };
  }

  return {
    type: "text",
    text: value.text,
  };
};

export const parseSuggestionValue = (raw: unknown): SuggestionValue | null => {
  if (!isPlainRecord(raw)) return null;

  if (raw.type === "medication") {
    if (
      typeof raw.name !== "string" ||
      (typeof raw.dosage !== "number" && typeof raw.dosage !== "string") ||
      typeof raw.unit !== "string"
    ) {
      return null;
    }

    return createMedicationSuggestionValue({
      name: raw.name,
      dosage: raw.dosage,
      unit: raw.unit,
    });
  }

  if (raw.type === "text" && typeof raw.text === "string") {
    return createTextSuggestionValue(raw.text);
  }

  return null;
};

/** 編集画面の診断に使う、正規化前の入力値。読み取れない形なら null。 */
const readRawInput = (raw: unknown): EditableRawInput | null => {
  if (!isPlainRecord(raw)) return null;

  if (raw.type === "medication") {
    if (
      typeof raw.name !== "string" ||
      (typeof raw.dosage !== "number" && typeof raw.dosage !== "string") ||
      typeof raw.unit !== "string"
    ) {
      return null;
    }
    return { type: "medication", name: raw.name, dosage: raw.dosage, unit: raw.unit };
  }

  if (raw.type === "text" && typeof raw.text === "string") {
    return { type: "text", text: raw.text };
  }

  return null;
};

const parseOrder = (raw: unknown, fallback: number) => {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
};

const parseAutoOverride = (raw: unknown): AutoSuggestionOverride | undefined => {
  if (!isPlainRecord(raw)) return undefined;
  const override: AutoSuggestionOverride = {};

  if (typeof raw.isVisible === "boolean") {
    override.isVisible = raw.isVisible;
  }
  if (typeof raw.order === "number" && Number.isFinite(raw.order)) {
    override.order = raw.order;
  }

  return Object.keys(override).length > 0 ? override : undefined;
};

/**
 * 表示用の寛容な読み取り。解析できない要素は落とす（件数の切り詰めはしない）。
 * ここで得たフォールバック値を編集用の元データや保存値へ流用しない。
 */
export const normalizeSuggestionSetting = (raw: unknown): SuggestionSetting => {
  if (!isPlainRecord(raw)) {
    return { manualItems: [] };
  }

  const manualItems = Array.isArray(raw.manualItems)
    ? raw.manualItems
        .map((rawItem, index): ManualSuggestionItem | null => {
          const value = parseSuggestionValue(
            isPlainRecord(rawItem) ? rawItem.value : undefined
          );
          if (!value || !isPlainRecord(rawItem)) return null;

          return {
            value,
            isVisible: typeof rawItem.isVisible === "boolean" ? rawItem.isVisible : true,
            order: parseOrder(rawItem.order, index + 1),
          };
        })
        .filter((item): item is ManualSuggestionItem => Boolean(item))
    : [];

  return {
    manualItems,
    mostFrequentOverride: parseAutoOverride(raw.mostFrequentOverride),
    mostRecentOverride: parseAutoOverride(raw.mostRecentOverride),
  };
};

/**
 * 表示用のシリアライザー。件数の切り詰めはしない。
 * 元データの保持が必要な編集画面からの保存は `buildSuggestionSavePayload` を使う。
 */
export const suggestionSettingToFirestore = (setting: SuggestionSetting) => {
  return {
    manualItems: setting.manualItems.map((item) => ({
      value: suggestionValueToFirestore(item.value),
      isVisible: item.isVisible,
      order: item.order,
    })),
    ...(setting.mostFrequentOverride ? { mostFrequentOverride: setting.mostFrequentOverride } : {}),
    ...(setting.mostRecentOverride ? { mostRecentOverride: setting.mostRecentOverride } : {}),
  };
};

/**
 * 表示用の候補設定取得。
 * コンテナー自体が配列・文字列・null などの不正な形なら、候補設定だけを空へフォールバックする。
 */
export const getSuggestionSetting = (
  settings: unknown,
  fieldKey: SuggestionFieldKey
): SuggestionSetting => {
  if (!isPlainRecord(settings)) {
    return { manualItems: [] };
  }
  return normalizeSuggestionSetting(settings[fieldKey]);
};

/**
 * 編集用の読み取り。元データを保持したまま、コンテナー・対象項目・各要素の形を診断する。
 * 不正な形を空マップとして再構築しない。
 */
export const readSuggestionSettingForEdit = (
  rawSettings: unknown,
  fieldKey: SuggestionFieldKey
): SuggestionSettingForEdit => {
  if (rawSettings === undefined) {
    return {
      containerStatus: "missing",
      originalContainer: undefined,
      fieldStatus: "missing",
      originalField: undefined,
      entries: [],
      originalOverrides: {},
    };
  }

  if (!isPlainRecord(rawSettings)) {
    return {
      containerStatus: "invalid",
      originalContainer: rawSettings,
      originalField: undefined,
      entries: [],
      originalOverrides: {},
    };
  }

  const rawField = rawSettings[fieldKey];

  if (rawField === undefined) {
    return {
      containerStatus: "valid",
      originalContainer: rawSettings,
      fieldStatus: "missing",
      originalField: undefined,
      entries: [],
      originalOverrides: {},
    };
  }

  if (!isPlainRecord(rawField) || !Array.isArray(rawField.manualItems)) {
    return {
      containerStatus: "valid",
      originalContainer: rawSettings,
      fieldStatus: "invalid",
      originalField: rawField,
      entries: [],
      originalOverrides: {},
    };
  }

  const entries = rawField.manualItems.map((rawItem, index): EditableManualEntry => {
    const id = `manual-${index}`;

    if (!isPlainRecord(rawItem)) {
      return { kind: "unparsed", id, originalRaw: rawItem, reason: "候補の形式が不正です" };
    }
    if (rawItem.value === undefined) {
      return { kind: "unparsed", id, originalRaw: rawItem, reason: "候補の値がありません" };
    }
    if (rawItem.order !== undefined && typeof rawItem.order !== "number") {
      return { kind: "unparsed", id, originalRaw: rawItem, reason: "順番の形式が不正です" };
    }

    const rawInput = readRawInput(rawItem.value);
    if (!rawInput) {
      return { kind: "unparsed", id, originalRaw: rawItem, reason: "候補の種類を判別できません" };
    }

    const value = parseSuggestionValue(rawItem.value);
    if (!value) {
      return { kind: "unparsed", id, originalRaw: rawItem, reason: "候補の値を読み取れません" };
    }

    return {
      kind: "parsed",
      id,
      item: {
        value,
        isVisible: typeof rawItem.isVisible === "boolean" ? rawItem.isVisible : true,
        order: parseOrder(rawItem.order, index + 1),
      },
      rawInput,
      rawOrder: rawItem.order,
      originalRaw: rawItem,
      valueEdited: false,
    };
  });

  return {
    containerStatus: "valid",
    originalContainer: rawSettings,
    fieldStatus: "valid",
    originalField: rawField,
    entries,
    originalOverrides: {
      mostFrequent: rawField.mostFrequentOverride,
      mostRecent: rawField.mostRecentOverride,
    },
  };
};

const readTimingMs = (raw: unknown): number | null => {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  if (raw instanceof Date) {
    const ms = raw.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (!isPlainRecord(raw)) return null;

  if (typeof raw.toMillis === "function") {
    try {
      const ms = (raw.toMillis as () => unknown)();
      return typeof ms === "number" && Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }

  if (typeof raw.seconds === "number" && Number.isFinite(raw.seconds)) {
    const nanos = typeof raw.nanoseconds === "number" && Number.isFinite(raw.nanoseconds)
      ? raw.nanoseconds
      : 0;
    return raw.seconds * 1000 + Math.floor(nanos / 1e6);
  }

  return null;
};

const readStringArray = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === "string");
};

/**
 * Firestore の生ドキュメントから、候補集計に必要な値だけを検査して取り出す。
 * 不正な要素は集計用の投影から除外するだけで、元記録は変更しない。
 * 時刻を解釈できないログは集計対象外（null）とする。
 */
export const readRawSuggestionLog = (raw: unknown): SuggestionSourceLog | null => {
  if (!isPlainRecord(raw)) return null;

  const timingMs = readTimingMs(raw.timing);
  if (timingMs === null) return null;

  const actions = Array.isArray(raw.actions)
    ? raw.actions
        .filter((item): item is Record<string, unknown> => isPlainRecord(item))
        .filter((item) => typeof item.text === "string")
        .map((item) => ({ text: item.text as string }))
    : [];

  const medications = Array.isArray(raw.medications)
    ? raw.medications
        .filter((item): item is Record<string, unknown> => isPlainRecord(item))
        .filter(
          (item) =>
            typeof item.name === "string" &&
            typeof item.unit === "string" &&
            typeof item.dosage === "number" &&
            Number.isFinite(item.dosage)
        )
        .map((item) => ({
          name: item.name as string,
          dosage: item.dosage as number,
          unit: item.unit as string,
        }))
    : [];

  return {
    timingMs,
    locations: readStringArray(raw.locations),
    types: readStringArray(raw.types),
    triggers: readStringArray(raw.triggers),
    associatedSymptoms: readStringArray(raw.associatedSymptoms),
    actions,
    medications,
  };
};

/**
 * 集計に使う生値のキーと、選定後に使う正規化済みの候補値の組。
 * キーは表記ゆれを統合せず、記録された生の文字列（服薬は name/dosage/unit の JSON）とする。
 */
type RawAggregationEntry = { rawKey: string; value: SuggestionValue };

const getRawEntriesFromLog = (
  log: SuggestionSourceLog,
  fieldKey: SuggestionFieldKey
): RawAggregationEntry[] => {
  const fromTexts = (values: string[]): RawAggregationEntry[] => {
    const result: RawAggregationEntry[] = [];
    for (const text of values) {
      const value = createTextSuggestionValue(text);
      if (value) result.push({ rawKey: text, value });
    }
    return result;
  };

  switch (fieldKey) {
    case "locations":
    case "types":
    case "triggers":
    case "associatedSymptoms":
      return fromTexts(log[fieldKey]);
    case "actions":
      return fromTexts(log.actions.map((action) => action.text));
    case "medications": {
      const result: RawAggregationEntry[] = [];
      for (const medication of log.medications) {
        const value = createMedicationSuggestionValue({
          name: medication.name,
          dosage: medication.dosage,
          unit: medication.unit,
        });
        if (!value) continue;
        result.push({
          rawKey: JSON.stringify({
            name: medication.name,
            dosage: medication.dosage,
            unit: medication.unit,
          }),
          value,
        });
      }
      return result;
    }
  }
};

/**
 * 最頻値と直近値を、記録された生値のまま集計する。
 * 同一記録内の重複も出現回数として数える。
 * 同数時は「新しい記録 → 日本語照合順」、直近は timing 降順・ログ内順の初出。
 */
export const computeFieldValues = (
  logs: SuggestionSourceLog[],
  fieldKey: SuggestionFieldKey
): { topValues: SuggestionValue[]; recentValues: SuggestionValue[] } => {
  const counts = new Map<
    string,
    {
      value: SuggestionValue;
      count: number;
      firstIndex: number;
    }
  >();
  const recentValues: SuggestionValue[] = [];
  const recentKeys = new Set<string>();
  const sortedLogs = [...logs].sort((a, b) => b.timingMs - a.timingMs);

  sortedLogs.forEach((log, logIndex) => {
    for (const entry of getRawEntriesFromLog(log, fieldKey)) {
      const existing = counts.get(entry.rawKey);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(entry.rawKey, {
          value: entry.value,
          count: 1,
          firstIndex: logIndex,
        });
      }

      if (!recentKeys.has(entry.rawKey)) {
        recentKeys.add(entry.rawKey);
        recentValues.push(entry.value);
      }
    }
  });

  const topValues = Array.from(counts.entries())
    .sort(([keyA, a], [keyB, b]) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.firstIndex !== b.firstIndex) return a.firstIndex - b.firstIndex;
      return keyA.localeCompare(keyB, "ja");
    })
    .slice(0, 1)
    .map(([, entry]) => entry.value);

  return {
    topValues,
    recentValues: recentValues.slice(0, 1),
  };
};

export const buildAutoSuggestions = ({
  topValues,
  recentValues,
}: {
  topValues: SuggestionValue[];
  recentValues: SuggestionValue[];
}): AutoSuggestionItem[] => {
  const result: AutoSuggestionItem[] = [];
  const seen = new Set<string>();

  for (const value of topValues.slice(0, 1)) {
    if (seen.has(value.canonicalKey)) continue;
    seen.add(value.canonicalKey);
    result.push({
      value,
      sourceType: "mostFrequent",
      generationIndex: result.length,
    });
  }

  for (const value of recentValues.slice(0, 1)) {
    if (seen.has(value.canonicalKey)) continue;
    seen.add(value.canonicalKey);
    result.push({
      value,
      sourceType: "mostRecent",
      generationIndex: result.length,
    });
  }

  return result;
};

const getAutoOverride = (
  setting: SuggestionSetting,
  sourceType: SuggestionSourceType
): AutoSuggestionOverride | undefined => {
  return sourceType === "mostFrequent"
    ? setting.mostFrequentOverride
    : setting.mostRecentOverride;
};

/** 自動候補の既定 order。モバイルと同じく「全手動の最大 order + 100 + generationIndex」。 */
export const getDefaultAutoOrder = (
  manualItems: ManualSuggestionItem[],
  generationIndex: number
) => {
  const maxManualOrder = manualItems.reduce((max, item) => Math.max(max, item.order), 0);
  return maxManualOrder + AUTO_ORDER_OFFSET + generationIndex;
};

/**
 * 記録フォームに表示する候補を組み立てる。
 * 1. 非表示を含む全手動候補の canonicalKey で自動候補を除外
 * 2. 手動は表示中を抽出 → order 昇順 → 最大7件
 * 3. 自動は override 適用 → 表示中を抽出 → order 昇順 → 最大2件
 * 4. 手動優先で連結
 */
export const buildFinalSuggestions = ({
  autoSuggestions,
  setting,
  maxManualCount = MANUAL_DISPLAY_LIMIT,
  maxAutoCount = AUTO_DISPLAY_LIMIT,
}: {
  autoSuggestions: AutoSuggestionItem[];
  setting: SuggestionSetting;
  maxManualCount?: number;
  maxAutoCount?: number;
}): MergedSuggestionItem[] => {
  const allManualKeys = new Set(setting.manualItems.map((item) => item.value.canonicalKey));

  const manual = setting.manualItems
    .filter((item) => item.isVisible)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.value.canonicalKey.localeCompare(b.value.canonicalKey, "ja");
    })
    .slice(0, maxManualCount)
    .map((item): MergedSuggestionItem => ({
      value: item.value,
      isManual: true,
      isVisible: item.isVisible,
      order: item.order,
    }));

  const auto = autoSuggestions
    .filter((item) => !allManualKeys.has(item.value.canonicalKey))
    .map((item): MergedSuggestionItem => {
      const override = getAutoOverride(setting, item.sourceType);
      return {
        value: item.value,
        isManual: false,
        autoSourceType: item.sourceType,
        isVisible: override?.isVisible ?? true,
        order: override?.order ?? getDefaultAutoOrder(setting.manualItems, item.generationIndex),
      };
    })
    .filter((item) => item.isVisible)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.value.canonicalKey.localeCompare(b.value.canonicalKey, "ja");
    })
    .slice(0, maxAutoCount);

  return [...manual, ...auto];
};

export const buildSuggestionsByField = (
  logs: SuggestionSourceLog[],
  settings?: unknown
): Partial<Record<SuggestionFieldKey, MergedSuggestionItem[]>> => {
  return SUGGESTION_FIELD_KEYS.reduce<Partial<Record<SuggestionFieldKey, MergedSuggestionItem[]>>>(
    (acc, fieldKey) => {
      const values = computeFieldValues(logs, fieldKey);
      const setting = getSuggestionSetting(settings, fieldKey);
      acc[fieldKey] = buildFinalSuggestions({
        autoSuggestions: buildAutoSuggestions(values),
        setting,
      });
      return acc;
    },
    {}
  );
};

/**
 * 自動候補の集計期間（直近1年分）。
 * 画面ごとに複製せず、この1箇所で 365 日境界を担保する。
 * `now` を受け取れるようにして、境界の自動検証を可能にする。
 */
export const createSuggestionRange = (now: Date = new Date()) => {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (SUGGESTION_RANGE_DAYS - 1));
  start.setHours(0, 0, 0, 0);
  return { startMs: start.getTime(), endMs: end.getTime() };
};
