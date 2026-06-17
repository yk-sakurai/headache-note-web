"use client";

import type { SerializableHeadacheLog } from "@/lib/firestore/serializeHeadacheLog";
import {
  aggregateLogsByDate,
  buildCalendarGrid,
  calcAverageIntensity,
  intensityToColorClass,
} from "@/lib/calendar/calendarUtils";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const intensityTextClass = (intensity: number | null) => {
  if (intensity === null || intensity <= 3) {
    return "text-[color:var(--brand-primary-active)]";
  }
  return "text-white";
};

type CalendarGridProps = {
  year: number;
  month: number;
  logs: SerializableHeadacheLog[];
  todayKey: string;
  onDayClick: (dateKey: string, logs: SerializableHeadacheLog[]) => void;
};

export default function CalendarGrid({
  year,
  month,
  logs,
  todayKey,
  onDayClick,
}: CalendarGridProps) {
  const logsByDate = aggregateLogsByDate(logs);
  const days = buildCalendarGrid(year, month);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[color:var(--text-muted)] sm:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day, index) => {
          if (!day.dateKey || !day.day) {
            return (
              <div
                key={`blank-${index}`}
                className="aspect-square min-h-14 rounded-lg border border-transparent sm:min-h-16"
                aria-hidden="true"
              />
            );
          }

          const dayLogs = logsByDate[day.dateKey] ?? [];
          const hasLogs = dayLogs.length > 0;
          const averageIntensity = calcAverageIntensity(dayLogs);
          const isToday = day.dateKey === todayKey;
          const label =
            averageIntensity === null
              ? hasLogs
                ? "?"
                : ""
              : String(averageIntensity);

          return (
            <button
              key={day.dateKey}
              type="button"
              disabled={!hasLogs}
              onClick={() => onDayClick(day.dateKey as string, dayLogs)}
              className={`group flex aspect-square min-h-14 flex-col items-center justify-between rounded-lg border bg-white p-1.5 text-left calm-transition sm:min-h-16 sm:p-2 ${
                isToday
                  ? "border-[color:var(--brand-primary)]"
                  : "border-[color:var(--border-subtle)]"
              } ${
                hasLogs
                  ? "hover:border-[color:var(--brand-mint-border)] hover:bg-[color:var(--brand-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)]"
                  : "cursor-default opacity-70"
              }`}
              aria-label={`${day.dateKey}${hasLogs ? ` ${dayLogs.length}件の記録` : " 記録なし"}`}
            >
              <span
                className={`self-start text-xs font-medium ${
                  isToday
                    ? "text-[color:var(--brand-primary-active)]"
                    : "text-[color:var(--text-secondary)]"
                }`}
              >
                {day.day}
              </span>
              <span className="flex min-h-6 items-center justify-center">
                {hasLogs && (
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${intensityTextClass(
                      averageIntensity
                    )} ${intensityToColorClass(averageIntensity)}`}
                  >
                    {label}
                  </span>
                )}
              </span>
              <span className="min-h-3 text-[10px] leading-none text-[color:var(--text-muted)]">
                {dayLogs.length > 1 ? `${dayLogs.length}件` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
