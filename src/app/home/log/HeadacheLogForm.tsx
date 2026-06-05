"use client";

import { useMemo, useState } from "react";
import Button from "@/components/Button";
import { sanitizeStringList } from "@/lib/firestore/repositories/sanitize";

const formatDateTimeLocal = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const MINUTES_IN_HOUR = 60;
const MINUTES_IN_DAY = MINUTES_IN_HOUR * 24;
const MS_PER_MINUTE = 60 * 1000;

const addMinutesToLocalDateTime = (start: string, minutes: number) => {
  if (!start || !Number.isFinite(minutes)) return null;
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return null;
  const endDate = new Date(startDate.getTime() + minutes * MS_PER_MINUTE);
  return formatDateTimeLocal(endDate);
};

const getMinutesBetween = (start?: string, end?: string) => {
  if (!start || !end) return undefined;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return undefined;
  return Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_MINUTE);
};

const parseDurationPart = (value: string) => {
  if (value.trim().length === 0) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
};

const hasDurationFieldInput = (days: string, hours: string, minutes: string) => {
  return days.trim().length > 0 || hours.trim().length > 0 || minutes.trim().length > 0;
};

const calculateTotalDurationFromFields = (days: string, hours: string, minutes: string) => {
  if (!hasDurationFieldInput(days, hours, minutes)) return undefined;
  return (
    parseDurationPart(days) * MINUTES_IN_DAY +
    parseDurationPart(hours) * MINUTES_IN_HOUR +
    parseDurationPart(minutes)
  );
};

const splitDurationToFields = (totalMinutes: number) => {
  const days = Math.floor(totalMinutes / MINUTES_IN_DAY);
  const remainder = totalMinutes % MINUTES_IN_DAY;
  const hours = Math.floor(remainder / MINUTES_IN_HOUR);
  const minutes = remainder % MINUTES_IN_HOUR;
  return {
    days: String(days),
    hours: String(hours),
    minutes: String(minutes),
  };
};

const formatDurationLabel = (totalMinutes: number) => {
  const { days, hours, minutes } = splitDurationToFields(totalMinutes);
  const parts: string[] = [];
  if (Number(days) > 0) {
    parts.push(`${Number(days)}日`);
  }
  if (Number(hours) > 0) {
    parts.push(`${Number(hours)}時間`);
  }
  if (Number(minutes) > 0 || parts.length === 0) {
    parts.push(`${Number(minutes)}分`);
  }
  return parts.join(" ");
};

type MedicationForm = {
  name: string;
  takenAt: string;
  dosage?: number;
  unit: string;
  effectiveness?: number;
};

type MedicationFormState = MedicationForm & {
  effectivenessEnabled: boolean;
  isOpen: boolean;
};

type ActionForm = {
  text: string;
  takenAt: string;
  effectiveness?: number;
};

type ActionFormState = ActionForm & {
  effectivenessEnabled: boolean;
  isOpen: boolean;
};

const sanitizeEffectiveness = <T extends { effectiveness?: number; effectivenessEnabled: boolean }>(
  items: T[]
): Array<Omit<T, "effectivenessEnabled">> => {
  return items.map(({ effectivenessEnabled, effectiveness, ...rest }) => {
    if (
      effectivenessEnabled &&
      typeof effectiveness === "number" &&
      effectiveness >= 1 &&
      effectiveness <= 10
    ) {
      return { ...rest, effectiveness } as Omit<T, "effectivenessEnabled">;
    }
    return rest as Omit<T, "effectivenessEnabled">;
  });
};

export type HeadacheLogFormData = {
  timing: string;
  intensity?: number;
  duration?: number;
  locations?: string[];
  types?: string[];
  triggers?: string[];
  medications?: MedicationForm[];
  actions?: ActionForm[];
  associatedSymptoms?: string[];
  note?: string;
};

export default function HeadacheLogForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "保存",
}: {
  initial?: Partial<HeadacheLogFormData>;
  onSubmit: (data: HeadacheLogFormData) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [timing, setTiming] = useState<string>(() => {
    if (initial?.timing && initial.timing.length > 0) {
      return initial.timing;
    }
    return formatDateTimeLocal(new Date());
  });
  const [intensity, setIntensity] = useState<number | undefined>(initial?.intensity ?? 1);
  const initialDuration = initial?.duration;
  const [durationDays, setDurationDays] = useState<string>(() => {
    if (initialDuration === undefined) return "";
    return String(Math.floor(initialDuration / MINUTES_IN_DAY));
  });
  const [durationHours, setDurationHours] = useState<string>(() => {
    if (initialDuration === undefined) return "";
    const remainder = initialDuration % MINUTES_IN_DAY;
    return String(Math.floor(remainder / MINUTES_IN_HOUR));
  });
  const [durationMinutes, setDurationMinutes] = useState<string>(() => {
    if (initialDuration === undefined) return "";
    return String(initialDuration % MINUTES_IN_HOUR);
  });
  const [durationMode, setDurationMode] = useState<"duration" | "end">("end");
  const [isDurationEnabled, setIsDurationEnabled] = useState<boolean>(initialDuration !== undefined);
  const [endTiming, setEndTiming] = useState<string>(() => {
    if (initial?.timing && initialDuration !== undefined) {
      return addMinutesToLocalDateTime(initial.timing, initialDuration) ?? "";
    }
    return formatDateTimeLocal(new Date());
  });
  const [locations, setLocations] = useState<string[]>(() => {
    const initialLocations = initial?.locations ?? [];
    return initialLocations.length > 0 ? initialLocations : [];
  });
  const initializeList = (items?: string[]) => {
    const list = items ?? [];
    return list.length > 0 ? list : [];
  };
  const [types, setTypes] = useState<string[]>(() => initializeList(initial?.types));
  const [triggers, setTriggers] = useState<string[]>(() => initializeList(initial?.triggers));
  const [associatedSymptoms, setAssociatedSymptoms] = useState<string[]>(() =>
    initializeList(initial?.associatedSymptoms)
  );
  const [note, setNote] = useState<string>(initial?.note ?? "");
  const [medications, setMedications] = useState<MedicationFormState[]>(() => {
    const initialMedications = (initial?.medications as MedicationForm[]) ?? [];
    return initialMedications.map((medication) => ({
      ...medication,
      effectivenessEnabled: medication.effectiveness !== undefined,
      isOpen: true,
    }));
  });
  const [actions, setActions] = useState<ActionFormState[]>(() => {
    const initialActions = (initial?.actions as ActionForm[]) ?? [];
    return initialActions.map((action) => ({
      ...action,
      effectivenessEnabled: action.effectiveness !== undefined,
      isOpen: true,
    }));
  });
  const [submitting, setSubmitting] = useState(false);
  const [intensityError, setIntensityError] = useState<string | null>(null);
  const [medicationErrors, setMedicationErrors] = useState<
    Array<Partial<Record<keyof MedicationForm, string>>>
  >([]);
  const [actionErrors, setActionErrors] = useState<
    Array<Partial<Record<keyof ActionForm, string>>>
  >([]);

  const durationValidation = useMemo(() => {
    if (!isDurationEnabled) return null;
    if (durationMode === "end") {
      if (!endTiming) return "継続時間を入力してください";
      const diff = getMinutesBetween(timing, endTiming);
      if (diff === undefined) return "終了日時の形式が正しくありません";
      if (diff < 0) return "終了日時は開始日時以降を指定してください";
      if (diff === 0) return "継続時間は1分以上を入力してください";
      return null;
    }

    const total = calculateTotalDurationFromFields(durationDays, durationHours, durationMinutes);
    if (total === undefined) return "継続時間を入力してください";
    if (total <= 0) return "継続時間は1分以上を入力してください";
    return null;
  }, [
    durationDays,
    durationHours,
    durationMinutes,
    durationMode,
    endTiming,
    isDurationEnabled,
    timing,
  ]);

  const isValid = useMemo(() => {
    return Boolean(timing) && !durationValidation;
  }, [timing, durationValidation]);

  const derivedDurationFromEnd = useMemo(() => {
    if (!isDurationEnabled) return undefined;
    if (durationMode !== "end") return undefined;
    const diff = getMinutesBetween(timing, endTiming);
    if (diff === undefined || diff <= 0) return undefined;
    return diff;
  }, [durationMode, endTiming, isDurationEnabled, timing]);

  const handleLocationChange = (index: number, value: string) => {
    setLocations((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddLocation = () => {
    setLocations((prev) => [...prev, ""]);
  };

  const handleRemoveLocation = (index: number) => {
    setLocations((prev) => {
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleTypeChange = (index: number, value: string) => {
    setTypes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddType = () => {
    setTypes((prev) => [...prev, ""]);
  };

  const handleRemoveType = (index: number) => {
    setTypes((prev) => {
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleTriggerChange = (index: number, value: string) => {
    setTriggers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddTrigger = () => {
    setTriggers((prev) => [...prev, ""]);
  };

  const handleRemoveTrigger = (index: number) => {
    setTriggers((prev) => {
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleAssociatedSymptomChange = (index: number, value: string) => {
    setAssociatedSymptoms((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddAssociatedSymptom = () => {
    setAssociatedSymptoms((prev) => [...prev, ""]);
  };

  const handleRemoveAssociatedSymptom = (index: number) => {
    setAssociatedSymptoms((prev) => {
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleDurationModeChange = (mode: "duration" | "end") => {
    if (!isDurationEnabled) return;
    if (mode === durationMode) return;
    if (mode === "end") {
      const total = calculateTotalDurationFromFields(durationDays, durationHours, durationMinutes);
      if (total !== undefined) {
        const nextEnd = addMinutesToLocalDateTime(timing, total);
        if (nextEnd) {
          setEndTiming(nextEnd);
        }
      } else if (!endTiming) {
        setEndTiming("");
      }
    } else {
      if (endTiming) {
        const diff = getMinutesBetween(timing, endTiming);
        if (diff !== undefined && diff >= 0) {
          const { days, hours, minutes } = splitDurationToFields(diff);
          setDurationDays(days);
          setDurationHours(hours);
          setDurationMinutes(minutes);
        } else {
          setDurationDays("");
          setDurationHours("");
          setDurationMinutes("");
        }
      } else {
        setDurationDays("");
        setDurationHours("");
        setDurationMinutes("");
      }
    }
    setDurationMode(mode);
  };

  const handleDurationEnabledChange = (checked: boolean) => {
    setIsDurationEnabled(checked);
    if (!checked) {
      setEndTiming("");
    } else if (durationMode === "end" && !endTiming) {
      const total = calculateTotalDurationFromFields(durationDays, durationHours, durationMinutes);
      if (total !== undefined) {
        const nextEnd = addMinutesToLocalDateTime(timing, total);
        if (nextEnd) {
          setEndTiming(nextEnd);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    if (intensity === undefined) {
      setIntensityError("痛みの強さを入力してください");
      return;
    }
    setIntensityError(null);

    const newMedicationErrors = medications.map((m) => {
      const errors: Partial<Record<keyof MedicationForm, string>> = {};
      if (!m.takenAt) {
        errors.takenAt = "日時を入力してください";
      }
      if (!m.name.trim()) {
        errors.name = "名称を入力してください";
      }
      if (m.dosage === undefined || m.dosage <= 0) {
        errors.dosage = "用量を0より大きい値で入力してください";
      }
      if (!m.unit.trim()) {
        errors.unit = "単位を入力してください";
      }
      return errors;
    });

    if (newMedicationErrors.some((errors) => Object.keys(errors).length > 0)) {
      setMedicationErrors(newMedicationErrors);
      return;
    }
    setMedicationErrors([]);

    const newActionErrors = actions.map((a) => {
      const errors: Partial<Record<keyof ActionForm, string>> = {};
      if (!a.takenAt) {
        errors.takenAt = "日時を入力してください";
      }
      if (!a.text.trim()) {
        errors.text = "内容を入力してください";
      }
      return errors;
    });

    if (newActionErrors.some((errors) => Object.keys(errors).length > 0)) {
      setActionErrors(newActionErrors);
      return;
    }
    setActionErrors([]);

    setSubmitting(true);
    try {
      let totalDuration: number | undefined;
      if (isDurationEnabled && durationMode === "end") {
        if (endTiming) {
          const diff = getMinutesBetween(timing, endTiming);
          if (diff !== undefined && diff > 0) {
            totalDuration = diff;
          }
        }
      } else if (isDurationEnabled) {
        totalDuration = calculateTotalDurationFromFields(
          durationDays,
          durationHours,
          durationMinutes
        );
        if (totalDuration !== undefined && totalDuration <= 0) {
          totalDuration = undefined;
        }
      }

      const sanitizedMedications = sanitizeEffectiveness(medications);
      const sanitizedActions = sanitizeEffectiveness(actions);

      const payload: HeadacheLogFormData = {
        timing,
        intensity,
        locations: sanitizeStringList(locations),
        types: sanitizeStringList(types),
        triggers: sanitizeStringList(triggers),
        medications: sanitizedMedications,
        actions: sanitizedActions,
        associatedSymptoms: sanitizeStringList(associatedSymptoms),
        note,
        ...(totalDuration !== undefined ? { duration: totalDuration } : {}),
      };
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium">日時</label>
          <input
            type="datetime-local"
            className="w-full rounded border px-3 py-2"
            value={timing}
            onChange={(e) => setTiming(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">痛みの強さ</label>
          <input
            type="number"
            min={1}
            max={10}
            className="w-full rounded border px-3 py-2"
            value={intensity ?? ""}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : undefined;
              setIntensity(value);
              if (value !== undefined) {
                setIntensityError(null);
              }
            }}
          />
          {intensityError && <p className="text-sm text-red-600">{intensityError}</p>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">継続時間</label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isDurationEnabled}
                onChange={(e) => handleDurationEnabledChange(e.target.checked)}
              />
              <span>継続時間を記録</span>
            </label>
          </div>
          {isDurationEnabled && (
            <>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="duration-input-mode"
                    value="end"
                    checked={durationMode === "end"}
                    onChange={() => handleDurationModeChange("end")}
                  />
                  <span>終了日時で入力</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="duration-input-mode"
                    value="duration"
                    checked={durationMode === "duration"}
                    onChange={() => handleDurationModeChange("duration")}
                  />
                  <span>時間で入力</span>
                </label>
              </div>
              {durationMode === "duration" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={364}
                      className="w-24 rounded border px-3 py-2"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                    />
                    <span className="text-sm text-gray-600">日</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      className="w-24 rounded border px-3 py-2"
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value)}
                    />
                    <span className="text-sm text-gray-600">時間</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      className="w-24 rounded border px-3 py-2"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                    />
                    <span className="text-sm text-gray-600">分</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <input
                    type="datetime-local"
                    className="w-full rounded border px-3 py-2"
                    value={endTiming}
                    onChange={(e) => setEndTiming(e.target.value)}
                  />
                  {!durationValidation && derivedDurationFromEnd !== undefined && endTiming && (
                    <p className="text-sm text-gray-600 dark:text-white">
                      継続時間: {formatDurationLabel(derivedDurationFromEnd)}
                    </p>
                  )}
                </div>
              )}
              {durationValidation && (
                <p className="text-sm text-red-600">{durationValidation}</p>
              )}
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">痛みの場所</h3>
            <Button type="button" onClick={handleAddLocation}>
              追加
            </Button>
          </div>
          {locations.length > 0 && (
            <div className="space-y-2">
              {locations.map((location, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded border px-3 py-2"
                    value={location}
                    onChange={(e) => handleLocationChange(idx, e.target.value)}
                    placeholder="痛みの場所"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleRemoveLocation(idx)}
                  >
                    削除
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">痛み方</h3>
            <Button type="button" onClick={handleAddType}>
              追加
            </Button>
          </div>
          {types.length > 0 && (
            <div className="space-y-2">
              {types.map((type, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded border px-3 py-2"
                    value={type}
                    onChange={(e) => handleTypeChange(idx, e.target.value)}
                    placeholder="痛み方"
                  />
                  <Button type="button" variant="secondary" onClick={() => handleRemoveType(idx)}>
                    削除
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">トリガー</h3>
            <Button type="button" onClick={handleAddTrigger}>
              追加
            </Button>
          </div>
          {triggers.length > 0 && (
            <div className="space-y-2">
              {triggers.map((trigger, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded border px-3 py-2"
                    value={trigger}
                    onChange={(e) => handleTriggerChange(idx, e.target.value)}
                    placeholder="トリガー"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleRemoveTrigger(idx)}
                  >
                    削除
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">併発症状</h3>
            <Button type="button" onClick={handleAddAssociatedSymptom}>
              追加
            </Button>
          </div>
          {associatedSymptoms.length > 0 && (
            <div className="space-y-2">
              {associatedSymptoms.map((symptom, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded border px-3 py-2"
                    value={symptom}
                    onChange={(e) => handleAssociatedSymptomChange(idx, e.target.value)}
                    placeholder="併発症状"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleRemoveAssociatedSymptom(idx)}
                  >
                    削除
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">服薬</h3>
          <Button
            type="button"
            onClick={() =>
              setMedications((prev) => [
                ...prev,
                {
                  name: "",
                  dosage: undefined,
                  unit: "",
                  takenAt: formatDateTimeLocal(new Date()),
                  effectivenessEnabled: false,
                  isOpen: true,
                },
              ])
            }
          >
            追加
          </Button>
        </div>
        <div className="space-y-4">
          {medications.map((m, idx) => {
            const isEffectivenessEnabled = m.effectivenessEnabled;
            const isOpen = m.isOpen;
            return (
              <div key={idx} className="border rounded-md">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer"
                  onClick={() =>
                    setMedications((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, isOpen: !x.isOpen } : x))
                    )
                  }
                >
                  <span className="font-medium">{m.name || "服薬"}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMedications((prev) => prev.filter((_, i) => i !== idx));
                    }}
                  >
                    削除
                  </Button>
                </div>
                {isOpen && (
                  <div className="p-3 border-t space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium w-16">日時</label>
                      <div className="flex-1">
                        <input
                          type="datetime-local"
                          className="w-full rounded border px-3 py-2"
                          value={m.takenAt}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMedications((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, takenAt: v } : x))
                            );
                          }}
                        />
                        {medicationErrors[idx]?.takenAt && (
                          <p className="text-sm text-red-600">{medicationErrors[idx].takenAt}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium w-16">名称</label>
                      <div className="flex-1">
                        <input
                          className="w-full rounded border px-3 py-2"
                          placeholder="名称"
                          value={m.name}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMedications((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, name: v } : x))
                            );
                          }}
                        />
                        {medicationErrors[idx]?.name && (
                          <p className="text-sm text-red-600">{medicationErrors[idx].name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium w-16">用量</label>
                      <div className="flex-1 grid grid-cols-2 gap-2 items-start">
                        <div>
                          <input
                            type="number"
                            className="w-full rounded border px-3 py-2"
                            placeholder="用量"
                            value={m.dosage ?? ""}
                            onChange={(e) => {
                              const v = e.target.value ? Number(e.target.value) : undefined;
                              setMedications((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, dosage: v } : x))
                              );
                            }}
                          />
                          {medicationErrors[idx]?.dosage && (
                            <p className="text-sm text-red-600">{medicationErrors[idx].dosage}</p>
                          )}
                        </div>
                        <div>
                          <input
                            className="w-full rounded border px-3 py-2"
                            placeholder="単位 (mg, ml など)"
                            value={m.unit}
                            onChange={(e) => {
                              const v = e.target.value;
                              setMedications((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, unit: v } : x))
                              );
                            }}
                          />
                          {medicationErrors[idx]?.unit && (
                            <p className="text-sm text-red-600">{medicationErrors[idx].unit}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex w-16 flex-shrink-0 items-center gap-2 text-sm text-gray-700 dark:text-white">
                        <input
                          type="checkbox"
                          checked={isEffectivenessEnabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setMedications((prev) =>
                              prev.map((x, i) => {
                                if (i !== idx) return x;
                                if (enabled) {
                                  const nextEffectiveness =
                                    typeof x.effectiveness === "number" && x.effectiveness >= 1
                                      ? x.effectiveness
                                      : 1;
                                  return {
                                    ...x,
                                    effectivenessEnabled: true,
                                    effectiveness: nextEffectiveness,
                                  };
                                }
                                return {
                                  ...x,
                                  effectivenessEnabled: false,
                                  effectiveness: undefined,
                                };
                              })
                            );
                          }}
                        />
                        <span>効果</span>
                      </label>
                      {isEffectivenessEnabled && (
                        <input
                          type="number"
                          min={1}
                          max={10}
                          className="w-24 rounded border px-3 py-2"
                          placeholder="効果 (1-10)"
                          required
                          value={m.effectiveness ?? ""}
                          onChange={(e) => {
                            const v = e.target.value ? Number(e.target.value) : undefined;
                            setMedications((prev) =>
                              prev.map((x, i) =>
                                i === idx
                                  ? {
                                      ...x,
                                      effectivenessEnabled: true,
                                      effectiveness:
                                        v !== undefined && Number.isFinite(v) ? v : undefined,
                                    }
                                  : x
                              )
                            );
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">対処</h3>
          <Button
            type="button"
            onClick={() =>
              setActions((prev) => [
                ...prev,
                { text: "", takenAt: formatDateTimeLocal(new Date()), effectivenessEnabled: false, isOpen: true },
              ])
            }
          >
            追加
          </Button>
        </div>
        <div className="space-y-4">
          {actions.map((a, idx) => {
            const isEffectivenessEnabled = a.effectivenessEnabled;
            const isOpen = a.isOpen;
            return (
              <div key={idx} className="border rounded-md">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer"
                  onClick={() =>
                    setActions((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, isOpen: !x.isOpen } : x))
                    )
                  }
                >
                  <span className="font-medium">{a.text || "対処"}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActions((prev) => prev.filter((_, i) => i !== idx));
                    }}
                  >
                    削除
                  </Button>
                </div>
                {isOpen && (
                  <div className="p-3 border-t space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium w-16">日時</label>
                      <div className="flex-1">
                        <input
                          type="datetime-local"
                          className="w-full rounded border px-3 py-2"
                          value={a.takenAt}
                          onChange={(e) => {
                            const v = e.target.value;
                            setActions((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, takenAt: v } : x))
                            );
                          }}
                        />
                        {actionErrors[idx]?.takenAt && (
                          <p className="text-sm text-red-600">{actionErrors[idx].takenAt}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium w-16">内容</label>
                      <div className="flex-1">
                        <input
                          className="w-full rounded border px-3 py-2"
                          placeholder="内容"
                          value={a.text}
                          onChange={(e) => {
                            const v = e.target.value;
                            setActions((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, text: v } : x))
                            );
                          }}
                        />
                        {actionErrors[idx]?.text && (
                          <p className="text-sm text-red-600">{actionErrors[idx].text}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex w-16 flex-shrink-0 items-center gap-2 text-sm text-gray-700 dark:text-white">
                        <input
                          type="checkbox"
                          checked={isEffectivenessEnabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setActions((prev) =>
                              prev.map((x, i) => {
                                if (i !== idx) return x;
                                if (enabled) {
                                  const nextEffectiveness =
                                    typeof x.effectiveness === "number" && x.effectiveness >= 1
                                      ? x.effectiveness
                                      : 1;
                                  return {
                                    ...x,
                                    effectivenessEnabled: true,
                                    effectiveness: nextEffectiveness,
                                  };
                                }
                                return {
                                  ...x,
                                  effectivenessEnabled: false,
                                  effectiveness: undefined,
                                };
                              })
                            );
                          }}
                        />
                        <span>効果</span>
                      </label>
                      {isEffectivenessEnabled && (
                        <input
                          type="number"
                          min={1}
                          max={10}
                          className="w-24 rounded border px-3 py-2"
                          placeholder="効果 (1-10)"
                          required
                          value={a.effectiveness ?? ""}
                          onChange={(e) => {
                            const v = e.target.value ? Number(e.target.value) : undefined;
                            setActions((prev) =>
                              prev.map((x, i) =>
                                i === idx
                                  ? {
                                      ...x,
                                      effectivenessEnabled: true,
                                      effectiveness:
                                        v !== undefined && Number.isFinite(v) ? v : undefined,
                                    }
                                  : x
                              )
                            );
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">メモ</label>
        <textarea
          className="w-full rounded border px-3 py-2"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!isValid || submitting}>{submitLabel}</Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            キャンセル
          </Button>
        )}
      </div>
    </form>
  );
}
