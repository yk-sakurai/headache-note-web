"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { ClientHeadacheLogRepository } from "@/lib/firestore/repositories/client";
import {
  toSerializableHeadacheLog,
  type SerializableHeadacheLog,
} from "@/lib/firestore/serializeHeadacheLog";
import {
  calcAverageIntensity,
  getCurrentTokyoMonthKey,
  getMonthKeysInRange,
  getTokyoMonthKeyFromDateKey,
  getTokyoMonthRange,
  parseTokyoMonthKey,
  shiftTokyoMonthKey,
  tokyoDateKey,
} from "@/lib/calendar/calendarUtils";
import CalendarGrid from "./CalendarGrid";

type HeadacheCalendarProps = {
  uid: string;
  initialLogs: SerializableHeadacheLog[];
  initialStartMs: number;
  initialEndMs: number;
  todayKey: string;
  initialMonthKey?: string;
};

const buildInitialLogsByMonth = (logs: SerializableHeadacheLog[]) => {
  return logs.reduce<Record<string, SerializableHeadacheLog[]>>((result, log) => {
    if (!log.timing) return result;
    const monthKey = getTokyoMonthKeyFromDateKey(tokyoDateKey(log.timing));
    result[monthKey] = [...(result[monthKey] ?? []), log];
    return result;
  }, {});
};

const monthLabel = (monthKey: string) => {
  const parsed = parseTokyoMonthKey(monthKey);
  if (!parsed) return monthKey;
  return `${parsed.year}年${parsed.month}月`;
};

const formatAverage = (value: number | null) =>
  value === null ? "-" : value.toFixed(1);

export default function HeadacheCalendar({
  uid,
  initialLogs,
  initialStartMs,
  initialEndMs,
  todayKey,
  initialMonthKey = getCurrentTokyoMonthKey(),
}: HeadacheCalendarProps) {
  const router = useRouter();
  const initialLoadedMonths = useMemo(
    () => getMonthKeysInRange(initialStartMs, initialEndMs),
    [initialEndMs, initialStartMs]
  );
  const [displayMonthKey, setDisplayMonthKey] = useState(initialMonthKey);
  const [logsByMonth, setLogsByMonth] = useState(() =>
    buildInitialLogsByMonth(initialLogs)
  );
  const [loadedMonthKeys, setLoadedMonthKeys] = useState(initialLoadedMonths);
  const [loadingMonthKey, setLoadingMonthKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedDisplayMonth = parseTokyoMonthKey(displayMonthKey);
  const currentMonthKey = getCurrentTokyoMonthKey();
  const displayLogs = logsByMonth[displayMonthKey] ?? [];
  const displayAverage = calcAverageIntensity(displayLogs);
  const displayLogDays = new Set(
    displayLogs.filter((log) => log.timing).map((log) => tokyoDateKey(log.timing))
  ).size;
  const isNextDisabled = displayMonthKey >= currentMonthKey;
  const isLoading = loadingMonthKey === displayMonthKey;

  const ensureMonthLoaded = async (monthKey: string) => {
    if (loadedMonthKeys.includes(monthKey) || loadingMonthKey === monthKey) {
      return;
    }

    const parsed = parseTokyoMonthKey(monthKey);
    if (!parsed) return;

    setLoadingMonthKey(monthKey);
    setError(null);

    try {
      const range = getTokyoMonthRange(parsed.year, parsed.month);
      const logs = await ClientHeadacheLogRepository.listLogsInRange(
        uid,
        range.startMs,
        range.endMs
      );
      const serializableLogs = logs
        .filter((log) => log.isHeadacheFree !== true)
        .map(toSerializableHeadacheLog);

      setLogsByMonth((current) => ({
        ...current,
        [monthKey]: serializableLogs,
      }));
      setLoadedMonthKeys((current) =>
        current.includes(monthKey) ? current : [...current, monthKey]
      );
    } catch (fetchError) {
      console.error("カレンダー月別取得エラー:", fetchError);
      setError("記録を取得できませんでした。時間をおいてもう一度お試しください。");
    } finally {
      setLoadingMonthKey(null);
    }
  };

  const moveMonth = async (delta: number) => {
    const nextMonthKey = shiftTokyoMonthKey(displayMonthKey, delta);
    if (nextMonthKey > currentMonthKey) return;
    setDisplayMonthKey(nextMonthKey);
    await ensureMonthLoaded(nextMonthKey);
  };

  const handleDayClick = (
    dateKey: string,
    logsOnDay: SerializableHeadacheLog[]
  ) => {
    if (logsOnDay.length === 0) return;
    if (logsOnDay.length === 1) {
      router.push(`/home/log/${logsOnDay[0].id}/edit`);
      return;
    }
    router.push(`/records?date=${encodeURIComponent(dateKey)}`);
  };

  if (!parsedDisplayMonth) {
    return null;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
      <section className="rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">
              {monthLabel(displayMonthKey)}
            </h2>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-[color:var(--border)] bg-white">
            <button
              type="button"
              onClick={() => void moveMonth(-1)}
              disabled={Boolean(loadingMonthKey)}
              className="h-10 min-w-10 px-3 text-sm font-medium text-[color:var(--text-secondary)] calm-transition hover:bg-[color:var(--brand-primary-soft)] disabled:opacity-50"
              aria-label="前の月"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setDisplayMonthKey(currentMonthKey)}
              disabled={Boolean(loadingMonthKey) || displayMonthKey === currentMonthKey}
              className="h-10 min-w-16 border-x border-[color:var(--border)] px-3 text-sm font-medium text-[color:var(--text-secondary)] calm-transition hover:bg-[color:var(--brand-primary-soft)] disabled:opacity-50"
            >
              今月
            </button>
            <button
              type="button"
              onClick={() => void moveMonth(1)}
              disabled={Boolean(loadingMonthKey) || isNextDisabled}
              className="h-10 min-w-10 px-3 text-sm font-medium text-[color:var(--text-secondary)] calm-transition hover:bg-[color:var(--brand-primary-soft)] disabled:opacity-50"
              aria-label="次の月"
            >
              →
            </button>
          </div>
        </div>

        {isLoading && (
          <p className="mb-3 rounded-lg bg-[color:var(--brand-primary-soft)] px-3 py-2 text-sm text-[color:var(--brand-primary-active)]">
            この月の記録を読み込んでいます。
          </p>
        )}
        {error && (
          <p className="mb-3 rounded-lg bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger)]">
            {error}
          </p>
        )}

        <CalendarGrid
          year={parsedDisplayMonth.year}
          month={parsedDisplayMonth.month}
          logs={displayLogs}
          todayKey={todayKey}
          onDayClick={handleDayClick}
        />

        <div className="mt-4 flex flex-wrap gap-3 border-t border-[color:var(--border-subtle)] pt-4 text-xs text-[color:var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[color:var(--brand-primary-soft)] ring-1 ring-[color:var(--brand-mint-border)]" />
            1-3
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[color:var(--brand-primary)]" />
            4-6
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[color:var(--warning)]" />
            7-10
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[color:var(--border)]" />
            強度未入力
          </span>
        </div>
      </section>

      <aside className="space-y-4 rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-soft)]">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
            {monthLabel(displayMonthKey)}の記録
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
            この月に記録した日数や、痛みの強さの平均を確認できます。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-[color:var(--surface-muted)] p-3">
            <p className="text-xs text-[color:var(--text-muted)]">記録</p>
            <p className="mt-1 text-lg font-semibold text-[color:var(--text-primary)]">
              {displayLogs.length}
              <span className="ml-0.5 text-xs font-medium text-[color:var(--text-secondary)]">
                件
              </span>
            </p>
          </div>
          <div className="rounded-lg bg-[color:var(--surface-muted)] p-3">
            <p className="text-xs text-[color:var(--text-muted)]">記録日</p>
            <p className="mt-1 text-lg font-semibold text-[color:var(--text-primary)]">
              {displayLogDays}
              <span className="ml-0.5 text-xs font-medium text-[color:var(--text-secondary)]">
                日
              </span>
            </p>
          </div>
          <div className="rounded-lg bg-[color:var(--surface-muted)] p-3">
            <p className="text-xs text-[color:var(--text-muted)]">強さの平均</p>
            <p className="mt-1 text-lg font-semibold text-[color:var(--text-primary)]">
              {formatAverage(displayAverage)}
            </p>
          </div>
        </div>
        <Button href="/home/log/new" className="h-12 w-full text-base">
          + 新しく記録する
        </Button>
      </aside>
    </div>
  );
}
