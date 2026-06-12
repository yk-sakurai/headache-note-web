import Link from "next/link";
import { sanitizeStringList } from "@/lib/firestore/repositories/sanitize";
import type { SerializableHeadacheLog } from "@/lib/firestore/serializeHeadacheLog";

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = MINUTES_PER_HOUR * 24;

const formatDateLabel = (value: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatDurationLabel = (totalMinutes?: number) => {
  if (totalMinutes === undefined || totalMinutes === null) return null;
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return null;

  const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const remainder = totalMinutes % MINUTES_PER_DAY;
  const hours = Math.floor(remainder / MINUTES_PER_HOUR);
  const minutes = remainder % MINUTES_PER_HOUR;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}日`);
  if (hours > 0) parts.push(`${hours}時間`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}分`);

  return parts.join(" ");
};

const formatMedication = (
  medication: NonNullable<SerializableHeadacheLog["medications"]>[number]
) => {
  const dosage =
    typeof medication.dosage === "number" &&
    medication.dosage > 0 &&
    medication.unit
      ? ` ${medication.dosage}${medication.unit}`
      : "";
  return `${medication.name}${dosage}`;
};

const InlineInfo = ({
  label,
  values,
}: {
  label: string;
  values: string[];
}) => {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0">
      <span className="font-medium text-[color:var(--text-primary)]">
        {label}:{" "}
      </span>
      <span className="text-[color:var(--text-secondary)]">
        {values.join("、")}
      </span>
    </div>
  );
};

export default function RecordCard({ log }: { log: SerializableHeadacheLog }) {
  const durationLabel = formatDurationLabel(log.duration);
  const locations = sanitizeStringList(log.locations);
  const types = sanitizeStringList(log.types);
  const triggers = sanitizeStringList(log.triggers);
  const medications = log.medications
    ?.map(formatMedication)
    .filter((value) => value.trim().length > 0) ?? [];
  const actions =
    log.actions
      ?.map((action) => action.text)
      .filter((value) => value.trim().length > 0) ?? [];
  const note = log.note?.trim();

  return (
    <article className="space-y-4 rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-4 text-[color:var(--text-primary)] shadow-[0_10px_30px_rgb(23_33_29_/_0.04)]">
      <div className="flex flex-col gap-3 border-b border-[color:var(--border-subtle)] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xl font-semibold text-[color:var(--text-primary)]">
            {formatDateLabel(log.timing)}
          </span>
          {typeof log.intensity === "number" && (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-5 py-1 text-sm font-semibold text-orange-700">
              強さ {log.intensity}
            </span>
          )}
          {durationLabel && (
            <span className="rounded border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-5 py-1 text-sm font-medium text-[color:var(--text-secondary)]">
              継続時間 {durationLabel}
            </span>
          )}
        </div>
        <Link
          href={`/home/log/${log.id}/edit`}
          aria-label={`${formatDateLabel(log.timing)}の記録を編集`}
          className="inline-flex w-fit items-center gap-1 rounded px-2 py-1 text-sm font-medium text-[color:var(--brand-primary-active)] underline-offset-4 calm-transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]"
        >
          <span aria-hidden="true">✏️</span>
          <span>編集</span>
        </Link>
      </div>

      <div className="grid gap-x-8 gap-y-2 text-sm leading-6 md:grid-cols-2">
        <InlineInfo label="痛みの場所" values={locations} />
        <InlineInfo label="痛み方" values={types} />
        <InlineInfo label="トリガー" values={triggers} />
        <InlineInfo label="服薬" values={medications} />
        <InlineInfo label="対処" values={actions} />
        {note && (
          <div className="min-w-0 md:col-span-2">
            <span className="font-medium text-[color:var(--text-primary)]">メモ: </span>
            <span className="text-[color:var(--text-secondary)]">{note}</span>
          </div>
        )}
      </div>
    </article>
  );
}
