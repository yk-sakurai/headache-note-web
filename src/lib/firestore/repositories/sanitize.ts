const normalizeValue = (value: string): string => value.trim();

const areListsEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
};

const HEADACHE_LOG_STRING_KEYS = [
  "locations",
  "types",
  "triggers",
  "associatedSymptoms",
] as const;

type HeadacheLogStringKey = (typeof HEADACHE_LOG_STRING_KEYS)[number];

export const sanitizeStringList = (values?: string[] | null): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const normalized = normalizeValue(raw);
    if (normalized.length === 0) continue;

    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
};

const sanitizeHeadacheLogFields = <T extends Partial<Record<HeadacheLogStringKey, unknown>>>(
  data: T,
  keys: readonly HeadacheLogStringKey[]
): T => {
  let changed = false;
  const updates: Partial<Record<HeadacheLogStringKey, string[]>> = {};

  for (const key of keys) {
    const value = data[key];
    if (!Array.isArray(value)) continue;

    const sanitized = sanitizeStringList(value as string[]);
    if (areListsEqual(sanitized, value as string[])) continue;

    updates[key] = sanitized;
    changed = true;
  }

  if (!changed) {
    return data;
  }

  return {
    ...(data as Record<string, unknown>),
    ...updates,
  } as T;
};

export const sanitizeHeadacheLogStrings = <
  T extends Partial<Record<HeadacheLogStringKey, unknown>>
>(
  data: T
): T => {
  return sanitizeHeadacheLogFields(data, HEADACHE_LOG_STRING_KEYS);
};

export const sanitizeLocations = <
  T extends {
    locations?: string[] | unknown;
  }
>(
  data: T
): T => {
  return sanitizeHeadacheLogFields(data, ["locations"]);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const omitUndefinedDeep = <T>(data: T): T => {
  if (Array.isArray(data)) {
    return data.map((item) => omitUndefinedDeep(item)) as unknown as T;
  }

  if (!isPlainObject(data)) {
    return data;
  }

  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const result: Record<string, unknown> = {};

  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (isPlainObject(item) || Array.isArray(item)) {
          return omitUndefinedDeep(item);
        }
        return item;
      });
      continue;
    }

    if (isPlainObject(value)) {
      result[key] = omitUndefinedDeep(value);
      continue;
    }

    result[key] = value;
  }

  return result as T;
};
