"use client";

import Link from "next/link";
import type { SerializableHeadacheLog } from "@/lib/firestore/serializeHeadacheLog";

const formatTokyoDateTime = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const formatTokyoTime = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const getIntensityBarColor = (intensity: number) => {
  if (intensity <= 3) {
    return "var(--brand-primary)";
  }
  if (intensity <= 7) {
    return "#f97316";
  }
  return "#ef4444";
};

const normalizeIntensity = (intensity?: number) => {
  if (typeof intensity !== "number" || !Number.isFinite(intensity)) {
    return null;
  }

  return Math.min(10, Math.max(0, intensity));
};

export default function ReportCard({
  log,
}: {
  log: SerializableHeadacheLog;
}) {
  const intensity = normalizeIntensity(log.intensity);
  const medications = log.medications ?? [];

  return (
    <Link
      href={`/home/log/${log.id}/edit`}
      className="block rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] p-5 shadow-[0_10px_30px_rgb(23_33_29_/_0.05)] calm-transition hover:border-[color:var(--brand-primary)] hover:shadow-[0_14px_34px_rgb(23_33_29_/_0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--brand-mint-bg)]"
    >
      <article className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-[color:var(--text-secondary)]">
              発生日時
            </p>
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
              {formatTokyoDateTime(log.timing)}
            </h2>
          </div>
          {intensity !== null && (
            <span className="inline-flex w-fit items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
              強さ {intensity}
            </span>
          )}
        </div>

        {intensity !== null && (
          <div className="space-y-2">
            <p className="text-sm text-[color:var(--text-secondary)]">
              痛みの強さ
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--surface-muted)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${intensity * 10}%`,
                  backgroundColor: getIntensityBarColor(intensity),
                }}
              />
            </div>
          </div>
        )}

        {medications.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[color:var(--text-primary)]">
              服薬
            </p>
            <ul className="space-y-1.5 text-sm text-[color:var(--text-secondary)]">
              {medications.map((medication, index) => (
                <li
                  key={`${medication.name}-${medication.takenAt}-${index}`}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1"
                >
                  <span className="font-medium text-[color:var(--text-primary)]">
                    {medication.name}
                  </span>
                  <span>
                    {medication.dosage}
                    {medication.unit}
                  </span>
                  <span className="text-[color:var(--text-muted)]">
                    {formatTokyoTime(medication.takenAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-[color:var(--text-muted)]">
            服薬記録はありません
          </p>
        )}
      </article>
    </Link>
  );
}
