import type { Timestamp } from "firebase/firestore";
import type { Timestamp as AdminTimestamp } from "firebase-admin/firestore";
import type { HeadacheLog } from "./types";

export const SUGGESTION_FIELD_KEYS = [
  "locations",
  "types",
  "triggers",
  "actions",
  "medications",
  "associatedSymptoms",
] as const;

export type SuggestionFieldKey = (typeof SUGGESTION_FIELD_KEYS)[number];
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

type TimestampLike = Timestamp | AdminTimestamp;

const FULLWIDTH_ASCII_START = 0xff01;
const FULLWIDTH_ASCII_END = 0xff5e;
const ASCII_OFFSET = 0xfee0;
const MANUAL_DISPLAY_LIMIT = 7;
const MANUAL_SAVE_LIMIT = 20;
const AUTO_DISPLAY_LIMIT = 2;

export const isSuggestionFieldKey = (value: string): value is SuggestionFieldKey => {
  return (SUGGESTION_FIELD_KEYS as readonly string[]).includes(value);
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

const normalizeMedicationDosage = (dosage: number | string): number | null => {
  const numeric = typeof dosage === "number" ? dosage : Number(dosage);
  if (!Number.isFinite(numeric)) return null;
  return Math.trunc(numeric);
};

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
  const normalizedDosage = normalizeMedicationDosage(dosage);
  const numericDosage = typeof dosage === "number" ? dosage : Number(dosage);
  if (
    !normalizedName ||
    !normalizedUnit ||
    normalizedDosage === null ||
    !Number.isFinite(numericDosage)
  ) {
    return null;
  }

  const lowercaseUnit = normalizedUnit.toLowerCase();

  return {
    type: "medication",
    name: normalizedName,
    dosage: numericDosage,
    unit: normalizedUnit,
    canonicalKey: `${normalizedName}_${normalizedDosage}_${lowercaseUnit}`,
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
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  if (data.type === "medication") {
    if (
      typeof data.name !== "string" ||
      (typeof data.dosage !== "number" && typeof data.dosage !== "string") ||
      typeof data.unit !== "string"
    ) {
      return null;
    }

    return createMedicationSuggestionValue({
      name: data.name,
      dosage: data.dosage,
      unit: data.unit,
    });
  }

  if (data.type === "text" && typeof data.text === "string") {
    return createTextSuggestionValue(data.text);
  }

  return null;
};

const parseOrder = (raw: unknown, fallback: number) => {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
};

const parseAutoOverride = (raw: unknown): AutoSuggestionOverride | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  const data = raw as Record<string, unknown>;
  const override: AutoSuggestionOverride = {};

  if (typeof data.isVisible === "boolean") {
    override.isVisible = data.isVisible;
  }
  if (typeof data.order === "number" && Number.isFinite(data.order)) {
    override.order = data.order;
  }

  return Object.keys(override).length > 0 ? override : undefined;
};

export const normalizeSuggestionSetting = (raw: unknown): SuggestionSetting => {
  if (!raw || typeof raw !== "object") {
    return { manualItems: [] };
  }

  const data = raw as Record<string, unknown>;
  const manualItems = Array.isArray(data.manualItems)
    ? data.manualItems
        .map((rawItem, index): ManualSuggestionItem | null => {
          if (!rawItem || typeof rawItem !== "object") return null;
          const item = rawItem as Record<string, unknown>;
          const value = parseSuggestionValue(item.value);
          if (!value) return null;

          return {
            value,
            isVisible: typeof item.isVisible === "boolean" ? item.isVisible : true,
            order: parseOrder(item.order, index + 1),
          };
        })
        .filter((item): item is ManualSuggestionItem => Boolean(item))
        .slice(0, MANUAL_SAVE_LIMIT)
    : [];

  return {
    manualItems,
    mostFrequentOverride: parseAutoOverride(data.mostFrequentOverride),
    mostRecentOverride: parseAutoOverride(data.mostRecentOverride),
  };
};

export const suggestionSettingToFirestore = (setting: SuggestionSetting) => {
  return {
    manualItems: setting.manualItems.slice(0, MANUAL_SAVE_LIMIT).map((item) => ({
      value: suggestionValueToFirestore(item.value),
      isVisible: item.isVisible,
      order: item.order,
    })),
    ...(setting.mostFrequentOverride ? { mostFrequentOverride: setting.mostFrequentOverride } : {}),
    ...(setting.mostRecentOverride ? { mostRecentOverride: setting.mostRecentOverride } : {}),
  };
};

export const getSuggestionSetting = (
  settings: Record<string, unknown> | undefined,
  fieldKey: SuggestionFieldKey
): SuggestionSetting => {
  return normalizeSuggestionSetting(settings?.[fieldKey]);
};

const getTimestampMs = (value: TimestampLike): number => {
  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return 0;
};

const getValuesFromLog = (log: HeadacheLog, fieldKey: SuggestionFieldKey): SuggestionValue[] => {
  switch (fieldKey) {
    case "locations":
    case "types":
    case "triggers":
    case "associatedSymptoms":
      return (log[fieldKey] ?? [])
        .map((value) => createTextSuggestionValue(value))
        .filter((value): value is TextSuggestionValue => Boolean(value));
    case "actions":
      return (log.actions ?? [])
        .map((action) => createTextSuggestionValue(action.text))
        .filter((value): value is TextSuggestionValue => Boolean(value));
    case "medications":
      return (log.medications ?? [])
        .map((medication) =>
          createMedicationSuggestionValue({
            name: medication.name,
            dosage: medication.dosage,
            unit: medication.unit,
          })
        )
        .filter((value): value is MedicationSuggestionValue => Boolean(value));
  }
};

export const computeFieldValues = (
  logs: HeadacheLog[],
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
  const sortedLogs = [...logs].sort((a, b) => getTimestampMs(b.timing) - getTimestampMs(a.timing));

  sortedLogs.forEach((log, logIndex) => {
    const values = getValuesFromLog(log, fieldKey);

    for (const value of values) {
      const existing = counts.get(value.canonicalKey);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(value.canonicalKey, {
          value,
          count: 1,
          firstIndex: logIndex,
        });
      }

      if (!recentKeys.has(value.canonicalKey)) {
        recentKeys.add(value.canonicalKey);
        recentValues.push(value);
      }
    }
  });

  const topValues = Array.from(counts.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.firstIndex !== b.firstIndex) return a.firstIndex - b.firstIndex;
      return a.value.canonicalKey.localeCompare(b.value.canonicalKey, "ja");
    })
    .slice(0, 1)
    .map((entry) => entry.value);

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
      generationIndex: result.length + 1,
    });
  }

  for (const value of recentValues.slice(0, 1)) {
    if (seen.has(value.canonicalKey)) continue;
    seen.add(value.canonicalKey);
    result.push({
      value,
      sourceType: "mostRecent",
      generationIndex: result.length + 1,
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

  const manualKeys = new Set(manual.map((item) => item.value.canonicalKey));
  const auto = autoSuggestions
    .filter((item) => !manualKeys.has(item.value.canonicalKey))
    .map((item): MergedSuggestionItem => {
      const override = getAutoOverride(setting, item.sourceType);
      return {
        value: item.value,
        isManual: false,
        autoSourceType: item.sourceType,
        isVisible: override?.isVisible ?? true,
        order: override?.order ?? item.generationIndex,
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
  logs: HeadacheLog[],
  settings?: Record<string, unknown>
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
