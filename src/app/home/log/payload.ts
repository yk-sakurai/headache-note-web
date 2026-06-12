import type { HeadacheLogFormData } from "./HeadacheLogForm";
import { Timestamp } from "firebase/firestore";

export const toTimestamp = (value: string | undefined) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return Timestamp.fromDate(date);
};

export const buildMedicationPayload = (
  medications: HeadacheLogFormData["medications"] | undefined
) => {
  const result: Array<{
    name: string;
    dosage: number;
    unit: string;
    takenAt: Timestamp;
    effectiveness?: number;
  }> = [];

  if (!medications) {
    return result;
  }

  for (const medication of medications) {
    const name = (medication.name ?? "").trim();
    const unit = (medication.unit ?? "").trim();
    const takenAt = toTimestamp(medication.takenAt);
    const dosage =
      typeof medication.dosage === "number" && Number.isFinite(medication.dosage)
        ? medication.dosage
        : undefined;
    const hasAnyInput =
      name.length > 0 ||
      unit.length > 0 ||
      dosage !== undefined ||
      medication.effectiveness !== undefined ||
      Boolean(takenAt);

    if (!hasAnyInput || !takenAt || name.length === 0 || unit.length === 0 || dosage === undefined) {
      continue;
    }

    result.push({
      name,
      dosage,
      unit,
      takenAt,
      ...(medication.effectiveness !== undefined
        ? { effectiveness: medication.effectiveness }
        : {}),
    });
  }

  return result;
};

export const buildActionPayload = (actions: HeadacheLogFormData["actions"] | undefined) => {
  const result: Array<{
    text: string;
    takenAt: Timestamp;
    effectiveness?: number;
  }> = [];

  if (!actions) {
    return result;
  }

  for (const action of actions) {
    const text = (action.text ?? "").trim();
    const takenAt = toTimestamp(action.takenAt);
    const hasAnyInput = text.length > 0 || action.effectiveness !== undefined || Boolean(takenAt);

    if (!hasAnyInput || !takenAt || text.length === 0) {
      continue;
    }

    result.push({
      text,
      takenAt,
      ...(action.effectiveness !== undefined ? { effectiveness: action.effectiveness } : {}),
    });
  }

  return result;
};
