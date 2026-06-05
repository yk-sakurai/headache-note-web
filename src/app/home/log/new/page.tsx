"use client";

import { useRouter } from "next/navigation";
import HeadacheLogForm, { HeadacheLogFormData } from "../HeadacheLogForm";
import { ClientHeadacheLogRepository } from "@/lib/firestore/repositories/client";
import { getCurrentUser } from "@/lib/firebase/auth.client";
import { Timestamp } from "firebase/firestore";
import { sanitizeStringList } from "@/lib/firestore/repositories/sanitize";

const toTimestamp = (value: string | undefined) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return Timestamp.fromDate(date);
};

const buildMedicationPayload = (
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
    const hasAnyInput =
      name.length > 0 ||
      unit.length > 0 ||
      (typeof medication.dosage === "number" &&
        Number.isFinite(medication.dosage) &&
        medication.dosage !== 0) ||
      medication.effectiveness !== undefined ||
      Boolean(takenAt);

    if (!hasAnyInput) {
      continue;
    }

    if (!takenAt || name.length === 0) {
      continue;
    }

    result.push({
      name,
      dosage: Number.isFinite(medication.dosage) ? medication.dosage : 0,
      unit,
      takenAt,
      ...(medication.effectiveness !== undefined
        ? { effectiveness: medication.effectiveness }
        : {}),
    });
  }

  return result;
};

const buildActionPayload = (
  actions: HeadacheLogFormData["actions"] | undefined
) => {
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
    const hasAnyInput =
      text.length > 0 ||
      action.effectiveness !== undefined ||
      Boolean(takenAt);

    if (!hasAnyInput) {
      continue;
    }

    if (!takenAt || text.length === 0) {
      continue;
    }

    result.push({
      text,
      takenAt,
      ...(action.effectiveness !== undefined
        ? { effectiveness: action.effectiveness }
        : {}),
    });
  }

  return result;
};

export default function NewHeadacheLogPage() {
  const router = useRouter();

  const handleSubmit = async (data: HeadacheLogFormData) => {
    const user = getCurrentUser();
    if (!user) {
      throw new Error("ログインが必要です");
    }

    const sanitizedLocations = sanitizeStringList(data.locations);
    const sanitizedTypes = sanitizeStringList(data.types);
    const sanitizedTriggers = sanitizeStringList(data.triggers);
    const sanitizedAssociatedSymptoms = sanitizeStringList(data.associatedSymptoms);
    const medicationsPayload = buildMedicationPayload(data.medications);
    const actionsPayload = buildActionPayload(data.actions);

    await ClientHeadacheLogRepository.createLog({
      userId: user.uid,
      timing: Timestamp.fromDate(new Date(data.timing)),
      ...(data.intensity !== undefined ? { intensity: data.intensity } : {}),
      ...(data.duration !== undefined ? { duration: data.duration } : {}),
      ...(sanitizedLocations.length ? { locations: sanitizedLocations } : {}),
      ...(sanitizedTypes.length ? { types: sanitizedTypes } : {}),
      ...(sanitizedTriggers.length ? { triggers: sanitizedTriggers } : {}),
      ...(sanitizedAssociatedSymptoms.length ? { associatedSymptoms: sanitizedAssociatedSymptoms } : {}),
      ...(medicationsPayload.length
        ? {
            medications: medicationsPayload,
          }
        : {}),
      ...(actionsPayload.length
        ? {
            actions: actionsPayload,
          }
        : {}),
      ...(data.note ? { note: data.note } : {}),
    });

    router.push("/home");
  };

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">頭痛記録の新規作成</h1>
      <HeadacheLogForm onSubmit={handleSubmit} submitLabel="登録" />
    </div>
  );
}
