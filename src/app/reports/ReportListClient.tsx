"use client";

import { FormEvent, useMemo, useState } from "react";
import Button from "@/components/Button";
import { ClientHeadacheLogRepository } from "@/lib/firestore/repositories/client";
import {
  toSerializableHeadacheLog,
  type SerializableHeadacheLog,
} from "@/lib/firestore/serializeHeadacheLog";
import {
  formatTokyoDateTimeLabel,
  parseTokyoDateTimeInput,
  type DateRangeInput,
} from "./dateRange";
import ReportCard from "./ReportCard";

const toRangeMillis = (range: DateRangeInput) => {
  const startMs = parseTokyoDateTimeInput(range.start);
  const endBaseMs = parseTokyoDateTimeInput(range.end);

  if (startMs === null || endBaseMs === null) {
    return null;
  }

  return {
    startMs,
    endMs: endBaseMs + 59_999,
  };
};

export default function ReportListClient({
  uid,
  initialLogs,
  initialRange,
}: {
  uid: string;
  initialLogs: SerializableHeadacheLog[];
  initialRange: DateRangeInput;
}) {
  const [logs, setLogs] = useState<SerializableHeadacheLog[]>(initialLogs);
  const [range, setRange] = useState<DateRangeInput>(initialRange);
  const [appliedRange, setAppliedRange] =
    useState<DateRangeInput>(initialRange);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rangeValidation = useMemo(() => {
    const millis = toRangeMillis(range);
    if (!millis) {
      return "開始日時と終了日時を入力してください";
    }
    if (millis.startMs > millis.endMs) {
      return "開始日時は終了日時より前にしてください";
    }
    return null;
  }, [range]);

  const searchLogs = async (nextRange: DateRangeInput) => {
    const millis = toRangeMillis(nextRange);
    if (!millis || millis.startMs > millis.endMs) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextLogs = await ClientHeadacheLogRepository.listLogsInRange(
        uid,
        millis.startMs,
        millis.endMs
      );
      setLogs(
        nextLogs
          .filter((log) => log.isHeadacheFree !== true)
          .map(toSerializableHeadacheLog)
      );
      setAppliedRange(nextRange);
    } catch (searchError) {
      console.error("日ごとの記録検索エラー:", searchError);
      setError("記録を取得できませんでした。時間をおいてもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await searchLogs(range);
  };

  const handleReset = async () => {
    setRange(initialRange);
    await searchLogs(initialRange);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal text-[color:var(--text-primary)] sm:text-4xl">
            日ごとの記録
          </h1>
          <p className="text-base text-[color:var(--text-secondary)]">
            記録を振り返ることができます
          </p>
        </div>
        <Button href="/records" variant="secondary" className="h-12 self-start px-6 text-base sm:self-auto">
          記録一覧へ
        </Button>
      </div>

      <form
        className="rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] p-5 shadow-[0_10px_30px_rgb(23_33_29_/_0.05)] sm:p-6"
        onSubmit={handleSubmit}
      >
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">
            期間
          </h2>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:items-end">
            <label className="space-y-2 text-sm font-medium text-[color:var(--text-primary)]">
              <span>開始日時</span>
              <input
                type="datetime-local"
                value={range.start}
                onChange={(event) =>
                  setRange((current) => ({
                    ...current,
                    start: event.target.value,
                  }))
                }
                className="h-12 w-full rounded border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--text-primary)] outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-[color:var(--text-primary)]">
              <span>終了日時</span>
              <input
                type="datetime-local"
                value={range.end}
                onChange={(event) =>
                  setRange((current) => ({
                    ...current,
                    end: event.target.value,
                  }))
                }
                className="h-12 w-full rounded border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--text-primary)] outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)]"
              />
            </label>
            <Button
              type="submit"
              disabled={loading || Boolean(rangeValidation)}
              className="h-12 px-8 text-base"
            >
              {loading ? "検索中..." : "検索"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={handleReset}
              className="h-12 px-8 text-base"
            >
              条件をリセット
            </Button>
          </div>
          {rangeValidation && (
            <p className="text-sm text-red-600">{rangeValidation}</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </form>

      <div className="space-y-3 text-[color:var(--text-primary)]">
        <p className="text-sm sm:text-base">
          期間: {formatTokyoDateTimeLabel(appliedRange.start)} -{" "}
          {formatTokyoDateTimeLabel(appliedRange.end)}
        </p>
        <p className="text-lg font-semibold">{logs.length} 件の記録</p>
      </div>

      {logs.length === 0 ? (
        <section className="rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-10 text-center shadow-[0_10px_30px_rgb(23_33_29_/_0.05)]">
          <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
            この期間の記録はありません
          </h2>
        </section>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <ReportCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
