import type { SerializableHeadacheLog } from "@/lib/firestore/serializeHeadacheLog";

export const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type CalendarDay = {
  dateKey: string | null;
  day: number | null;
  isCurrentMonth: boolean;
};

export type CalendarMonthRange = {
  startMs: number;
  endMs: number;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

export const toDatetimeLocalValue = (millis: number) =>
  new Date(millis + TOKYO_OFFSET_MS).toISOString().slice(0, 16);

export const tokyoDateKey = (value: number | string | Date): string => {
  const millis =
    value instanceof Date
      ? value.getTime()
      : typeof value === "string"
        ? new Date(value).getTime()
        : value;

  const tokyoDate = new Date(millis + TOKYO_OFFSET_MS);
  return `${tokyoDate.getUTCFullYear()}-${pad2(tokyoDate.getUTCMonth() + 1)}-${pad2(
    tokyoDate.getUTCDate()
  )}`;
};

export const isTokyoDateKey = (value: string): boolean => {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const normalized = new Date(Date.UTC(year, month - 1, day));

  return (
    normalized.getUTCFullYear() === year &&
    normalized.getUTCMonth() === month - 1 &&
    normalized.getUTCDate() === day
  );
};

export const getTokyoDateRangeForDateKey = (
  dateKey: string
): CalendarMonthRange | null => {
  if (!isTokyoDateKey(dateKey)) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  return {
    startMs: Date.UTC(year, month - 1, day, 0, 0, 0, 0) - TOKYO_OFFSET_MS,
    endMs: Date.UTC(year, month - 1, day, 23, 59, 59, 999) - TOKYO_OFFSET_MS,
  };
};

export const getTokyoMonthKey = (year: number, month: number) =>
  `${year}-${pad2(month)}`;

export const parseTokyoMonthKey = (monthKey: string) => {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { year, month };
};

export const getTokyoMonthKeyFromDateKey = (dateKey: string) =>
  dateKey.slice(0, 7);

export const getCurrentTokyoMonthKey = (now = new Date()) => {
  const tokyoNow = new Date(now.getTime() + TOKYO_OFFSET_MS);
  return getTokyoMonthKey(tokyoNow.getUTCFullYear(), tokyoNow.getUTCMonth() + 1);
};

export const getTokyoMonthRange = (
  year: number,
  month: number
): CalendarMonthRange => ({
  startMs: Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - TOKYO_OFFSET_MS,
  endMs: Date.UTC(year, month, 0, 23, 59, 59, 999) - TOKYO_OFFSET_MS,
});

export const getInitialCalendarRange = (
  now = new Date(),
  daysBack = 364
): CalendarMonthRange => {
  const tokyoNow = new Date(now.getTime() + TOKYO_OFFSET_MS);
  const year = tokyoNow.getUTCFullYear();
  const month = tokyoNow.getUTCMonth();
  const date = tokyoNow.getUTCDate();

  return {
    startMs:
      Date.UTC(year, month, date - daysBack, 0, 0, 0, 0) - TOKYO_OFFSET_MS,
    endMs: Date.UTC(year, month, date, 23, 59, 59, 999) - TOKYO_OFFSET_MS,
  };
};

export const getMonthKeysInRange = (startMs: number, endMs: number): string[] => {
  const start = new Date(startMs + TOKYO_OFFSET_MS);
  const end = new Date(endMs + TOKYO_OFFSET_MS);
  const keys: string[] = [];
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth() + 1;
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth() + 1;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(getTokyoMonthKey(year, month));
    month += 1;
    if (month > 12) {
      year += 1;
      month = 1;
    }
  }

  return keys;
};

export const shiftTokyoMonthKey = (monthKey: string, delta: number) => {
  const parsed = parseTokyoMonthKey(monthKey);
  if (!parsed) return monthKey;

  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1 + delta, 1));
  return getTokyoMonthKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1);
};

export const buildCalendarGrid = (
  year: number,
  month: number
): CalendarDay[] => {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingBlankCount = firstDay.getUTCDay();
  const days: CalendarDay[] = [];

  for (let index = 0; index < leadingBlankCount; index += 1) {
    days.push({ dateKey: null, day: null, isCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      dateKey: `${year}-${pad2(month)}-${pad2(day)}`,
      day,
      isCurrentMonth: true,
    });
  }

  while (days.length < 42) {
    days.push({ dateKey: null, day: null, isCurrentMonth: false });
  }

  return days;
};

export const aggregateLogsByDate = (
  logs: SerializableHeadacheLog[]
): Record<string, SerializableHeadacheLog[]> => {
  return logs.reduce<Record<string, SerializableHeadacheLog[]>>((result, log) => {
    if (!log.timing) return result;
    const key = tokyoDateKey(log.timing);
    result[key] = [...(result[key] ?? []), log];
    return result;
  }, {});
};

export const calcAverageIntensity = (
  logs: SerializableHeadacheLog[]
): number | null => {
  const values = logs
    .map((log) => log.intensity)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (values.length === 0) return null;

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(average * 10) / 10;
};

export const intensityToColorClass = (intensity: number | null) => {
  if (intensity === null) {
    return "bg-[color:var(--border)]";
  }
  if (intensity <= 3) {
    return "bg-[color:var(--brand-primary-soft)]";
  }
  if (intensity <= 6) {
    return "bg-[color:var(--brand-primary)]";
  }
  return "bg-[color:var(--warning)]";
};
