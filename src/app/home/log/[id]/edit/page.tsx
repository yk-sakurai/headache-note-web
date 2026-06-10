"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import HeadacheLogForm, { HeadacheLogFormData } from "../../HeadacheLogForm";
import { ClientHeadacheLogRepository, type HeadacheLogUpdateData } from "@/lib/firestore/repositories/client";
import { HeadacheLog } from "@/lib/firestore/types";
import { Timestamp, deleteField } from "firebase/firestore";
import { sanitizeStringList } from "@/lib/firestore/repositories/sanitize";

function toLocalDateTimeInput(ts?: Timestamp): string {
  if (!ts) return "";
  const d = ts.toDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

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
      dosage:
        typeof medication.dosage === "number" &&
        Number.isFinite(medication.dosage)
          ? medication.dosage
          : 0,
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

export default function EditHeadacheLogPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [log, setLog] = useState<HeadacheLog | null>(null);
  const [loading, setLoading] = useState(true);
  const logId = params?.id;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!logId) return;
      const res = await ClientHeadacheLogRepository.getLog(logId);
      if (mounted) {
        setLog(res);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [logId]);

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
      medications: log.medications?.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        unit: m.unit,
        takenAt: toLocalDateTimeInput(m.takenAt as Timestamp),
        effectiveness: m.effectiveness,
      })),
      actions: log.actions?.map((a) => ({
        text: a.text,
        takenAt: toLocalDateTimeInput(a.takenAt as Timestamp),
        effectiveness: a.effectiveness,
      })),
    };
  }, [log]);

  const handleSubmit = async (data: HeadacheLogFormData) => {
    if (!logId) return;
    const sanitizedLocations = sanitizeStringList(data.locations);
    const sanitizedTypes = sanitizeStringList(data.types);
    const sanitizedTriggers = sanitizeStringList(data.triggers);
    const sanitizedAssociatedSymptoms = sanitizeStringList(data.associatedSymptoms);
    const medicationsPayload = buildMedicationPayload(data.medications);
    const actionsPayload = buildActionPayload(data.actions);

    const updates: HeadacheLogUpdateData = {
      timing: Timestamp.fromDate(new Date(data.timing)),
    };

    const setStringListField = (
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

    setStringListField("locations", sanitizedLocations, log?.locations);
    setStringListField("types", sanitizedTypes, log?.types);
    setStringListField("triggers", sanitizedTriggers, log?.triggers);
    setStringListField(
      "associatedSymptoms",
      sanitizedAssociatedSymptoms,
      log?.associatedSymptoms
    );

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

    router.push("/home");
  };

  if (loading) {
    return <div className="px-4 py-8">読み込み中...</div>;
  }

  if (!log) {
    return <div className="px-4 py-8">記録が見つかりませんでした。</div>;
  }

  return (
    <div className="max-w-screen-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">頭痛記録の編集</h1>
      <HeadacheLogForm initial={initial} onSubmit={handleSubmit} submitLabel="更新" />
    </div>
  );
}
