import { sanitizeHeadacheLogStrings } from "@/lib/firestore/repositories/sanitize";
import type {
  HeadacheAction,
  HeadacheLog,
  HeadacheMedication,
} from "@/lib/firestore/types";

export type SerializableHeadacheMedication = Omit<
  HeadacheMedication,
  "takenAt"
> & {
  takenAt: string;
};

export type SerializableHeadacheAction = Omit<HeadacheAction, "takenAt"> & {
  takenAt: string;
};

export type SerializableHeadacheLog = Omit<
  HeadacheLog,
  "timing" | "medications" | "actions"
> & {
  timing: string;
  medications?: SerializableHeadacheMedication[];
  actions?: SerializableHeadacheAction[];
};

export const toMillis = (value: unknown): number | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime())) {
      return asDate.getTime();
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.toMillis === "function") {
      const millis = record.toMillis();
      return typeof millis === "number" && Number.isFinite(millis)
        ? millis
        : null;
    }

    if (typeof record.toDate === "function") {
      const date = record.toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.getTime();
      }
    }

    const seconds =
      typeof record.seconds === "number"
        ? record.seconds
        : typeof record._seconds === "number"
          ? record._seconds
          : null;

    if (seconds !== null) {
      const nanos =
        typeof record.nanoseconds === "number"
          ? record.nanoseconds
          : typeof record._nanoseconds === "number"
            ? record._nanoseconds
            : 0;
      return seconds * 1000 + nanos / 1_000_000;
    }
  }

  return null;
};

export const toISOString = (value: unknown): string => {
  const millis = toMillis(value);
  if (millis === null) {
    return "";
  }
  return new Date(millis).toISOString();
};

export const toSerializableHeadacheLog = (
  log: HeadacheLog
): SerializableHeadacheLog => {
  const sanitized = sanitizeHeadacheLogStrings(log);

  return {
    ...sanitized,
    timing: toISOString(sanitized.timing),
    medications: sanitized.medications?.map((medication) => ({
      ...medication,
      takenAt: toISOString(medication.takenAt),
    })),
    actions: sanitized.actions?.map((action) => ({
      ...action,
      takenAt: toISOString(action.takenAt),
    })),
  };
};
