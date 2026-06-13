const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATETIME_LOCAL_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const toDatetimeLocalValue = (millis: number) =>
  new Date(millis + TOKYO_OFFSET_MS).toISOString().slice(0, 16);

export type DateRangeInput = {
  start: string;
  end: string;
};

export const getDefaultTokyoDateRange = (now = new Date()) => {
  const tokyoNow = new Date(now.getTime() + TOKYO_OFFSET_MS);
  const year = tokyoNow.getUTCFullYear();
  const month = tokyoNow.getUTCMonth();
  const date = tokyoNow.getUTCDate();

  const startMs = Date.UTC(year, month, date - 29, 0, 0, 0, 0) - TOKYO_OFFSET_MS;
  const endMs =
    Date.UTC(year, month, date, 23, 59, 59, 999) - TOKYO_OFFSET_MS;

  return {
    startMs,
    endMs,
    start: toDatetimeLocalValue(startMs),
    end: toDatetimeLocalValue(endMs),
  };
};

export const parseTokyoDateTimeInput = (value: string): number | null => {
  const match = DATETIME_LOCAL_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const millis =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0,
      0
    ) - TOKYO_OFFSET_MS;

  return Number.isFinite(millis) ? millis : null;
};

export const formatTokyoDateTimeLabel = (value: string) => {
  const millis = parseTokyoDateTimeInput(value);
  if (millis === null) {
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
  }).format(new Date(millis));
};
