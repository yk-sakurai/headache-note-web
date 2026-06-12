"use client";

import { useMemo, useState } from "react";
import Button from "@/components/Button";
import { sanitizeStringList } from "@/lib/firestore/repositories/sanitize";

const MINUTES_IN_HOUR = 60;
const MINUTES_IN_DAY = MINUTES_IN_HOUR * 24;
const MS_PER_MINUTE = 60 * 1000;
const MAX_MULTI_TEXT_LENGTH = 50;
const MAX_ACTION_TEXT_LENGTH = 50;
const MAX_MEDICATION_NAME_LENGTH = 30;
const MAX_MEDICATION_UNIT_LENGTH = 10;
const MAX_NOTE_LENGTH = 500;

const pad = (value: number) => String(value).padStart(2, "0");

const formatDateInput = (date: Date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatTimeInput = (date: Date) => {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDateTimeLocal = (date: Date) => {
  return `${formatDateInput(date)}T${formatTimeInput(date)}`;
};

const splitDateTimeLocal = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return { date: formatDateInput(now), time: formatTimeInput(now) };
  }
  return { date: formatDateInput(date), time: formatTimeInput(date) };
};

const combineDateTimeLocal = (date: string, time: string) => {
  if (!date || !time) return "";
  return `${date}T${time}`;
};

const addMinutesToLocalDateTime = (start: string, minutes: number) => {
  if (!start || !Number.isFinite(minutes)) return "";
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return "";
  return formatDateTimeLocal(new Date(startDate.getTime() + minutes * MS_PER_MINUTE));
};

const getMinutesBetween = (start?: string, end?: string) => {
  if (!start || !end) return undefined;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return undefined;
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_MINUTE));
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

const parseDurationPart = (value: string) => {
  if (value.trim().length === 0) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
};

const calculateDurationFromFields = (days: string, hours: string, minutes: string) => {
  if (!days.trim() && !hours.trim() && !minutes.trim()) return undefined;
  return (
    parseDurationPart(days) * MINUTES_IN_DAY +
    parseDurationPart(hours) * MINUTES_IN_HOUR +
    parseDurationPart(minutes)
  );
};

const formatDurationLabel = (totalMinutes: number) => {
  const { days, hours, minutes } = splitDurationToFields(totalMinutes);
  const parts: string[] = [];
  if (Number(days) > 0) parts.push(`${Number(days)}日`);
  if (Number(hours) > 0) parts.push(`${Number(hours)}時間`);
  if (Number(minutes) > 0 || parts.length === 0) parts.push(`${Number(minutes)}分`);
  return parts.join("");
};

type MedicationForm = {
  name: string;
  takenAt: string;
  dosage: number;
  unit: string;
  effectiveness?: number;
};

type MedicationFormState = {
  name: string;
  takenAt: string;
  dosageText: string;
  unit: string;
  effectivenessEnabled: boolean;
  effectiveness: number;
};

type ActionForm = {
  text: string;
  takenAt: string;
  effectiveness?: number;
};

type ActionFormState = {
  text: string;
  takenAt: string;
  effectivenessEnabled: boolean;
  effectiveness: number;
};

type MedicationErrors = Partial<Record<"takenAt" | "name" | "dosage" | "unit", string>>;
type ActionErrors = Partial<Record<"takenAt" | "text", string>>;

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

const fieldCardClass =
  "rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] p-5 shadow-[0_10px_30px_rgb(23_33_29_/_0.04)]";
const labelClass = "text-sm font-medium text-[color:var(--text-primary)]";
const inputClass =
  "h-11 w-full rounded border border-[color:var(--border)] bg-white px-3 text-base text-[color:var(--text-primary)] outline-none calm-transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]";
const smallInputClass =
  "h-10 w-full rounded border border-[color:var(--border)] bg-white px-3 text-sm text-[color:var(--text-primary)] outline-none calm-transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]";

function FieldCard({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={fieldCardClass}>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-base font-semibold text-[color:var(--text-primary)]">{title}</h2>
        {required && (
          <span className="rounded border border-[color:var(--brand-mint-border)] bg-[color:var(--brand-primary-soft)] px-2 py-0.5 text-xs font-medium text-[color:var(--brand-primary-active)]">
            必須
          </span>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-sm text-red-600">{children}</p>;
}

function SliderWithBubble({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3 pt-2">
      <div className="relative h-8">
        <span
          className="absolute top-0 -translate-x-1/2 rounded bg-[color:var(--brand-primary)] px-2 py-1 text-xs font-semibold text-[color:var(--brand-on-primary)]"
          style={{ left: `${percentage}%` }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-[color:var(--brand-primary)]"
      />
      <div className="flex justify-between text-xs text-[color:var(--text-muted)]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function MultiTextField({
  values,
  onChange,
  errors,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  errors?: string[];
  placeholder: string;
}) {
  return (
    <div className="space-y-3">
      {values.length === 0 ? (
        <p className="text-sm text-[color:var(--text-secondary)]">未入力です。</p>
      ) : (
        values.map((value, index) => (
          <div key={index} className="space-y-1">
            <div className="flex gap-2">
              <input
                type="text"
                className={inputClass}
                value={value}
                onChange={(event) => {
                  const next = [...values];
                  next[index] = event.target.value;
                  onChange(next);
                }}
                placeholder={placeholder}
              />
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 px-4"
                onClick={() => onChange(removeAt(values, index))}
              >
                削除
              </Button>
            </div>
            <ErrorText>{errors?.[index]}</ErrorText>
          </div>
        ))
      )}
      <Button type="button" variant="secondary" onClick={() => onChange([...values, ""])}>
        + 追加
      </Button>
    </div>
  );
}

const validateMultiText = (values: string[]) => {
  return values.map((value) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return "入力してください";
    if (trimmed.length > MAX_MULTI_TEXT_LENGTH) {
      return `${MAX_MULTI_TEXT_LENGTH}文字以内で入力してください`;
    }
    return "";
  });
};

const validateDosageText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "用量を入力してください";
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return "用量は小数2桁までの数値で入力してください";
  }
  return "";
};

function EffectivenessControl({
  enabled,
  value,
  onEnabledChange,
  onValueChange,
}: {
  enabled: boolean;
  value: number;
  onEnabledChange: (enabled: boolean) => void;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3 rounded border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] p-3">
      <label className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          className="h-4 w-4 accent-[color:var(--brand-primary)]"
        />
        効果を記録する
      </label>
      {enabled && <SliderWithBubble value={value} min={0} max={10} onChange={onValueChange} />}
    </div>
  );
}

const removeAt = <T,>(items: T[], index: number) => items.filter((_, idx) => idx !== index);

function FormActionBar({
  pinned,
  submitting,
  submitLabel,
  hasDelete,
  onDelete,
  onPinnedChange,
}: {
  pinned: boolean;
  submitting: boolean;
  submitLabel: string;
  hasDelete: boolean;
  onDelete?: () => void;
  onPinnedChange: (next: boolean) => void;
}) {
  const controls = (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      {hasDelete && (
        <button
          type="button"
          disabled={submitting}
          onClick={onDelete}
          className="inline-flex h-12 items-center justify-center rounded border border-red-300 bg-white px-6 text-sm font-semibold text-red-700 calm-transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:pointer-events-none disabled:opacity-50"
        >
          削除
        </button>
      )}
      <Button type="submit" disabled={submitting} className="h-12 px-8 text-base">
        {submitting ? "保存中..." : submitLabel}
      </Button>
      <button
        type="button"
        disabled={submitting}
        onClick={() => onPinnedChange(!pinned)}
        className="inline-flex h-12 items-center justify-center rounded border border-[color:var(--border)] bg-white px-5 text-sm font-medium text-[color:var(--text-secondary)] calm-transition hover:border-[color:var(--brand-mint-border)] hover:bg-[color:var(--brand-primary-soft)] hover:text-[color:var(--brand-primary-active)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] disabled:pointer-events-none disabled:opacity-50"
      >
        {pinned ? "固定を解除" : "固定する"}
      </button>
    </div>
  );

  if (!pinned) {
    return <div className={fieldCardClass}>{controls}</div>;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border-subtle)] bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgb(23_33_29_/_0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl justify-end">{controls}</div>
    </div>
  );
}

export default function HeadacheLogForm({
  initial,
  onSubmit,
  onDelete,
  submitLabel = "保存",
}: {
  initial?: Partial<HeadacheLogFormData>;
  onSubmit: (data: HeadacheLogFormData) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  submitLabel?: string;
}) {
  const initialTiming = splitDateTimeLocal(initial?.timing);
  const [timingDate, setTimingDate] = useState(initialTiming.date);
  const [timingTime, setTimingTime] = useState(initialTiming.time);
  const timing = combineDateTimeLocal(timingDate, timingTime);
  const [intensity, setIntensity] = useState(initial?.intensity ?? 1);
  const initialDuration = initial?.duration;
  const [durationEnabled, setDurationEnabled] = useState(initialDuration !== undefined);
  const [durationMode, setDurationMode] = useState<"end" | "duration">("end");
  const [durationDays, setDurationDays] = useState(() =>
    initialDuration === undefined ? "" : splitDurationToFields(initialDuration).days
  );
  const [durationHours, setDurationHours] = useState(() =>
    initialDuration === undefined ? "" : splitDurationToFields(initialDuration).hours
  );
  const [durationMinutes, setDurationMinutes] = useState(() =>
    initialDuration === undefined ? "" : splitDurationToFields(initialDuration).minutes
  );
  const [endTiming, setEndTiming] = useState(() => {
    if (initial?.timing && initialDuration !== undefined) {
      return addMinutesToLocalDateTime(initial.timing, initialDuration);
    }
    return addMinutesToLocalDateTime(timing, MINUTES_IN_HOUR);
  });
  const [locations, setLocations] = useState(initial?.locations ?? []);
  const [types, setTypes] = useState(initial?.types ?? []);
  const [triggers, setTriggers] = useState(initial?.triggers ?? []);
  const [associatedSymptoms, setAssociatedSymptoms] = useState(initial?.associatedSymptoms ?? []);
  const [actions, setActions] = useState<ActionFormState[]>(() =>
    (initial?.actions ?? []).map((action) => ({
      text: action.text,
      takenAt: action.takenAt,
      effectivenessEnabled: action.effectiveness !== undefined,
      effectiveness: action.effectiveness ?? 0,
    }))
  );
  const [medications, setMedications] = useState<MedicationFormState[]>(() =>
    (initial?.medications ?? []).map((medication) => ({
      name: medication.name,
      takenAt: medication.takenAt,
      dosageText: medication.dosage !== undefined ? String(medication.dosage) : "",
      unit: medication.unit,
      effectivenessEnabled: medication.effectiveness !== undefined,
      effectiveness: medication.effectiveness ?? 0,
    }))
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [pinned, setPinned] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [timingError, setTimingError] = useState("");
  const [durationError, setDurationError] = useState("");
  const [multiTextErrors, setMultiTextErrors] = useState({
    locations: [] as string[],
    types: [] as string[],
    triggers: [] as string[],
    associatedSymptoms: [] as string[],
  });
  const [actionErrors, setActionErrors] = useState<ActionErrors[]>([]);
  const [medicationErrors, setMedicationErrors] = useState<MedicationErrors[]>([]);
  const [noteError, setNoteError] = useState("");

  const durationPreview = useMemo(() => {
    if (!durationEnabled || durationMode !== "end") return undefined;
    const diff = getMinutesBetween(timing, endTiming);
    if (diff === undefined || diff <= 0) return undefined;
    return diff;
  }, [durationEnabled, durationMode, endTiming, timing]);

  const handleDurationModeChange = (mode: "end" | "duration") => {
    if (mode === durationMode) return;
    if (mode === "end") {
      const total = calculateDurationFromFields(durationDays, durationHours, durationMinutes);
      setEndTiming(addMinutesToLocalDateTime(timing, total && total > 0 ? total : MINUTES_IN_HOUR));
    } else {
      const total = getMinutesBetween(timing, endTiming);
      const fields = splitDurationToFields(total && total > 0 ? total : 0);
      setDurationDays(fields.days);
      setDurationHours(fields.hours);
      setDurationMinutes(fields.minutes);
    }
    setDurationMode(mode);
  };

  const calculateDuration = () => {
    if (!durationEnabled) return undefined;
    if (durationMode === "end") {
      const diff = getMinutesBetween(timing, endTiming);
      return diff && diff > 0 ? diff : 0;
    }
    const total = calculateDurationFromFields(durationDays, durationHours, durationMinutes);
    return total && total > 0 ? total : 0;
  };

  const validate = () => {
    let hasError = false;
    const timingDateValue = new Date(timing);
    if (!timing || Number.isNaN(timingDateValue.getTime())) {
      setTimingError("発生日時を入力してください");
      hasError = true;
    } else if (timingDateValue.getTime() > Date.now()) {
      setTimingError("発生日時には、現在または過去の日時を入力してください。");
      hasError = true;
    } else {
      setTimingError("");
    }

    if (durationEnabled) {
      const total = calculateDuration();
      if (!total || total <= 0) {
        setDurationError("継続時間は1分以上を入力してください");
        hasError = true;
      } else {
        setDurationError("");
      }
    } else {
      setDurationError("");
    }

    const nextMultiErrors = {
      locations: validateMultiText(locations),
      types: validateMultiText(types),
      triggers: validateMultiText(triggers),
      associatedSymptoms: validateMultiText(associatedSymptoms),
    };
    setMultiTextErrors(nextMultiErrors);
    if (Object.values(nextMultiErrors).some((errors) => errors.some(Boolean))) {
      hasError = true;
    }

    const nextActionErrors = actions.map((action) => {
      const errors: ActionErrors = {};
      if (!action.takenAt) errors.takenAt = "日時を入力してください";
      if (!action.text.trim()) {
        errors.text = "内容を入力してください";
      } else if (action.text.trim().length > MAX_ACTION_TEXT_LENGTH) {
        errors.text = `${MAX_ACTION_TEXT_LENGTH}文字以内で入力してください`;
      }
      return errors;
    });
    setActionErrors(nextActionErrors);
    if (nextActionErrors.some((errors) => Object.keys(errors).length > 0)) {
      hasError = true;
    }

    const nextMedicationErrors = medications.map((medication) => {
      const errors: MedicationErrors = {};
      if (!medication.takenAt) errors.takenAt = "日時を入力してください";
      if (!medication.name.trim()) {
        errors.name = "薬の名前を入力してください";
      } else if (medication.name.trim().length > MAX_MEDICATION_NAME_LENGTH) {
        errors.name = `${MAX_MEDICATION_NAME_LENGTH}文字以内で入力してください`;
      }
      const dosageError = validateDosageText(medication.dosageText);
      if (dosageError) errors.dosage = dosageError;
      if (!medication.unit.trim()) {
        errors.unit = "単位を入力してください";
      } else if (medication.unit.trim().length > MAX_MEDICATION_UNIT_LENGTH) {
        errors.unit = `${MAX_MEDICATION_UNIT_LENGTH}文字以内で入力してください`;
      }
      return errors;
    });
    setMedicationErrors(nextMedicationErrors);
    if (nextMedicationErrors.some((errors) => Object.keys(errors).length > 0)) {
      hasError = true;
    }

    if (note.length > MAX_NOTE_LENGTH) {
      setNoteError(`${MAX_NOTE_LENGTH}文字以内で入力してください`);
      hasError = true;
    } else {
      setNoteError("");
    }

    return !hasError;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const duration = calculateDuration();
    const payload: HeadacheLogFormData = {
      timing,
      intensity,
      locations: sanitizeStringList(locations),
      types: sanitizeStringList(types),
      triggers: sanitizeStringList(triggers),
      associatedSymptoms: sanitizeStringList(associatedSymptoms),
      actions: actions.map((action) => ({
        text: action.text.trim(),
        takenAt: action.takenAt,
        ...(action.effectivenessEnabled ? { effectiveness: action.effectiveness } : {}),
      })),
      medications: medications.map((medication) => ({
        name: medication.name.trim(),
        takenAt: medication.takenAt,
        dosage: Number(medication.dosageText),
        unit: medication.unit.trim(),
        ...(medication.effectivenessEnabled ? { effectiveness: medication.effectiveness } : {}),
      })),
      note,
      ...(duration !== undefined && duration > 0 ? { duration } : {}),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      console.error("頭痛記録保存エラー:", error);
      setFormError("保存できませんでした。入力内容を確認してもう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  const addAction = () => {
    setActions((current) => [
      ...current,
      {
        text: "",
        takenAt: formatDateTimeLocal(new Date()),
        effectivenessEnabled: false,
        effectiveness: 0,
      },
    ]);
  };

  const addMedication = () => {
    setMedications((current) => [
      ...current,
      {
        name: "",
        takenAt: formatDateTimeLocal(new Date()),
        dosageText: "",
        unit: "",
        effectivenessEnabled: false,
        effectiveness: 0,
      },
    ]);
  };

  return (
    <form onSubmit={handleSubmit} className={pinned ? "pb-32" : ""}>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <div className="order-1">
            <FieldCard title="発生日時" required>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className={labelClass}>日付</span>
                  <input
                    type="date"
                    value={timingDate}
                    onChange={(event) => setTimingDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-2">
                  <span className={labelClass}>時刻</span>
                  <input
                    type="time"
                    value={timingTime}
                    onChange={(event) => setTimingTime(event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
              <ErrorText>{timingError}</ErrorText>
            </FieldCard>
          </div>

          <div className="order-2">
            <FieldCard title="痛みの強さ" required>
              <SliderWithBubble value={intensity} min={1} max={10} onChange={setIntensity} />
            </FieldCard>
          </div>

          <div className="order-3">
            <FieldCard title="継続時間">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={durationEnabled}
                  onChange={(event) => setDurationEnabled(event.target.checked)}
                  className="h-4 w-4 accent-[color:var(--brand-primary)]"
                />
                継続時間を記録する
              </label>
              {durationEnabled && (
                <>
                  <div className="grid grid-cols-2 overflow-hidden rounded border border-[color:var(--border)]">
                    <button
                      type="button"
                      onClick={() => handleDurationModeChange("end")}
                      className={`h-10 text-sm font-medium calm-transition ${
                        durationMode === "end"
                          ? "bg-[color:var(--brand-primary)] text-[color:var(--brand-on-primary)]"
                          : "bg-white text-[color:var(--text-secondary)] hover:bg-[color:var(--brand-primary-soft)]"
                      }`}
                    >
                      終了日時
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDurationModeChange("duration")}
                      className={`h-10 border-l border-[color:var(--border)] text-sm font-medium calm-transition ${
                        durationMode === "duration"
                          ? "bg-[color:var(--brand-primary)] text-[color:var(--brand-on-primary)]"
                          : "bg-white text-[color:var(--text-secondary)] hover:bg-[color:var(--brand-primary-soft)]"
                      }`}
                    >
                      継続時間
                    </button>
                  </div>
                  {durationMode === "end" ? (
                    <div className="space-y-2">
                      <label className="space-y-2">
                        <span className={labelClass}>終了日時</span>
                        <input
                          type="datetime-local"
                          value={endTiming}
                          onChange={(event) => setEndTiming(event.target.value)}
                          className={inputClass}
                        />
                      </label>
                      {durationPreview !== undefined && (
                        <p className="text-sm text-[color:var(--text-secondary)]">
                          継続時間: {formatDurationLabel(durationPreview)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <label className="space-y-2">
                        <span className={labelClass}>日</span>
                        <input
                          type="number"
                          min={0}
                          value={durationDays}
                          onChange={(event) => setDurationDays(event.target.value)}
                          className={inputClass}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className={labelClass}>時間</span>
                        <input
                          type="number"
                          min={0}
                          value={durationHours}
                          onChange={(event) => setDurationHours(event.target.value)}
                          className={inputClass}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className={labelClass}>分</span>
                        <input
                          type="number"
                          min={0}
                          value={durationMinutes}
                          onChange={(event) => setDurationMinutes(event.target.value)}
                          className={inputClass}
                        />
                      </label>
                    </div>
                  )}
                  <ErrorText>{durationError}</ErrorText>
                </>
              )}
            </FieldCard>
          </div>

          <div className="order-8">
            <FieldCard title="対処">
              <div className="space-y-4">
                {actions.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-secondary)]">未入力です。</p>
                ) : (
                  actions.map((action, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                          対処 {index + 1}
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 px-4"
                          onClick={() => {
                            setActions((current) => removeAt(current, index));
                            setActionErrors((current) => removeAt(current, index));
                          }}
                        >
                          削除
                        </Button>
                      </div>
                      <label className="space-y-2">
                        <span className={labelClass}>日時</span>
                        <input
                          type="datetime-local"
                          value={action.takenAt}
                          onChange={(event) =>
                            setActions((current) =>
                              current.map((item, idx) =>
                                idx === index ? { ...item, takenAt: event.target.value } : item
                              )
                            )
                          }
                          className={smallInputClass}
                        />
                        <ErrorText>{actionErrors[index]?.takenAt}</ErrorText>
                      </label>
                      <label className="space-y-2">
                        <span className={labelClass}>内容</span>
                        <input
                          type="text"
                          value={action.text}
                          onChange={(event) =>
                            setActions((current) =>
                              current.map((item, idx) =>
                                idx === index ? { ...item, text: event.target.value } : item
                              )
                            )
                          }
                          className={smallInputClass}
                          placeholder="休む、冷やす など"
                        />
                        <ErrorText>{actionErrors[index]?.text}</ErrorText>
                      </label>
                      <EffectivenessControl
                        enabled={action.effectivenessEnabled}
                        value={action.effectiveness}
                        onEnabledChange={(enabled) =>
                          setActions((current) =>
                            current.map((item, idx) =>
                              idx === index
                                ? { ...item, effectivenessEnabled: enabled, effectiveness: enabled ? item.effectiveness : 0 }
                                : item
                            )
                          )
                        }
                        onValueChange={(value) =>
                          setActions((current) =>
                            current.map((item, idx) =>
                              idx === index ? { ...item, effectiveness: value } : item
                            )
                          )
                        }
                      />
                    </div>
                  ))
                )}
                <Button type="button" variant="secondary" onClick={addAction}>
                  + 追加
                </Button>
              </div>
            </FieldCard>
          </div>

          <div className="order-10">
            <FieldCard title="メモ">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={5}
                className="w-full rounded border border-[color:var(--border)] bg-white px-3 py-2 text-base text-[color:var(--text-primary)] outline-none calm-transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
                placeholder="気づいたことを記録できます"
              />
              <p
                className={`text-right text-sm ${
                  note.length > MAX_NOTE_LENGTH ? "text-red-600" : "text-[color:var(--text-muted)]"
                }`}
              >
                {note.length} / {MAX_NOTE_LENGTH} 文字以内
              </p>
              <ErrorText>{noteError}</ErrorText>
            </FieldCard>
          </div>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <div className="order-4 lg:order-none">
            <FieldCard title="痛みの場所">
              <MultiTextField
                values={locations}
                onChange={(values) => {
                  setLocations(values);
                  setMultiTextErrors((current) => ({ ...current, locations: [] }));
                }}
                errors={multiTextErrors.locations}
                placeholder="こめかみ、頭全体 など"
              />
            </FieldCard>
          </div>

          <div className="order-5 lg:order-none">
            <FieldCard title="痛み方">
              <MultiTextField
                values={types}
                onChange={(values) => {
                  setTypes(values);
                  setMultiTextErrors((current) => ({ ...current, types: [] }));
                }}
                errors={multiTextErrors.types}
                placeholder="ズキズキ、締め付け など"
              />
            </FieldCard>
          </div>

          <div className="order-6 lg:order-none">
            <FieldCard title="トリガー">
              <MultiTextField
                values={triggers}
                onChange={(values) => {
                  setTriggers(values);
                  setMultiTextErrors((current) => ({ ...current, triggers: [] }));
                }}
                errors={multiTextErrors.triggers}
                placeholder="寝不足、ストレス など"
              />
            </FieldCard>
          </div>

          <div className="order-7 lg:order-none">
            <FieldCard title="併発症状">
              <MultiTextField
                values={associatedSymptoms}
                onChange={(values) => {
                  setAssociatedSymptoms(values);
                  setMultiTextErrors((current) => ({ ...current, associatedSymptoms: [] }));
                }}
                errors={multiTextErrors.associatedSymptoms}
                placeholder="吐き気、めまい など"
              />
            </FieldCard>
          </div>

          <div className="order-9 lg:order-none">
            <FieldCard title="服薬">
              <div className="space-y-4">
                {medications.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-secondary)]">未入力です。</p>
                ) : (
                  medications.map((medication, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                          服薬 {index + 1}
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 px-4"
                          onClick={() => {
                            setMedications((current) => removeAt(current, index));
                            setMedicationErrors((current) => removeAt(current, index));
                          }}
                        >
                          削除
                        </Button>
                      </div>
                      <label className="space-y-2">
                        <span className={labelClass}>日時</span>
                        <input
                          type="datetime-local"
                          value={medication.takenAt}
                          onChange={(event) =>
                            setMedications((current) =>
                              current.map((item, idx) =>
                                idx === index ? { ...item, takenAt: event.target.value } : item
                              )
                            )
                          }
                          className={smallInputClass}
                        />
                        <ErrorText>{medicationErrors[index]?.takenAt}</ErrorText>
                      </label>
                      <label className="space-y-2">
                        <span className={labelClass}>薬の名前</span>
                        <input
                          type="text"
                          value={medication.name}
                          onChange={(event) =>
                            setMedications((current) =>
                              current.map((item, idx) =>
                                idx === index ? { ...item, name: event.target.value } : item
                              )
                            )
                          }
                          className={smallInputClass}
                          placeholder="薬の名前"
                        />
                        <ErrorText>{medicationErrors[index]?.name}</ErrorText>
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className={labelClass}>用量</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min={0}
                            value={medication.dosageText}
                            onChange={(event) =>
                              setMedications((current) =>
                                current.map((item, idx) =>
                                  idx === index ? { ...item, dosageText: event.target.value } : item
                                )
                              )
                            }
                            className={smallInputClass}
                            placeholder="例: 1"
                          />
                          <ErrorText>{medicationErrors[index]?.dosage}</ErrorText>
                        </label>
                        <label className="space-y-2">
                          <span className={labelClass}>単位</span>
                          <input
                            type="text"
                            value={medication.unit}
                            onChange={(event) =>
                              setMedications((current) =>
                                current.map((item, idx) =>
                                  idx === index ? { ...item, unit: event.target.value } : item
                                )
                              )
                            }
                            className={smallInputClass}
                            placeholder="錠、mg など"
                          />
                          <ErrorText>{medicationErrors[index]?.unit}</ErrorText>
                        </label>
                      </div>
                      <EffectivenessControl
                        enabled={medication.effectivenessEnabled}
                        value={medication.effectiveness}
                        onEnabledChange={(enabled) =>
                          setMedications((current) =>
                            current.map((item, idx) =>
                              idx === index
                                ? { ...item, effectivenessEnabled: enabled, effectiveness: enabled ? item.effectiveness : 0 }
                                : item
                            )
                          )
                        }
                        onValueChange={(value) =>
                          setMedications((current) =>
                            current.map((item, idx) =>
                              idx === index ? { ...item, effectiveness: value } : item
                            )
                          )
                        }
                      />
                    </div>
                  ))
                )}
                <Button type="button" variant="secondary" onClick={addMedication}>
                  + 追加
                </Button>
              </div>
            </FieldCard>
          </div>
        </div>
      </div>

      {formError && (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      )}

      {!pinned && (
        <div className="mt-4">
          <FormActionBar
            pinned={pinned}
            submitting={submitting}
            submitLabel={submitLabel}
            hasDelete={Boolean(onDelete)}
            onDelete={onDelete}
            onPinnedChange={setPinned}
          />
        </div>
      )}
      {pinned && (
        <FormActionBar
          pinned={pinned}
          submitting={submitting}
          submitLabel={submitLabel}
          hasDelete={Boolean(onDelete)}
          onDelete={onDelete}
          onPinnedChange={setPinned}
        />
      )}
    </form>
  );
}
