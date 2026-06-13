"use client";

import { ClientHeadacheLogRepository } from "@/lib/firestore/repositories/client";
import type { HeadacheLog } from "@/lib/firestore/types";

const endOfDay = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
};

const startOfDay = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
};

const isSameLocalDate = (a: Date, b: Date) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

export const calculateHeadacheFreeConflictRange = (
  timingInput: string,
  durationMinutes?: number
) => {
  const timing = new Date(timingInput);
  if (Number.isNaN(timing.getTime())) {
    return null;
  }

  const start = startOfDay(timing);
  let end = endOfDay(timing);

  if (durationMinutes !== undefined && durationMinutes > 0) {
    const durationEnd = new Date(timing.getTime() + durationMinutes * 60 * 1000);
    end = durationEnd;
    if (!isSameLocalDate(durationEnd, timing)) {
      end = endOfDay(durationEnd);
    }
  }

  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
};

export const findConflictingHeadacheFreeLogs = async ({
  uid,
  timing,
  duration,
  excludeLogId,
}: {
  uid: string;
  timing: string;
  duration?: number;
  excludeLogId?: string;
}): Promise<HeadacheLog[]> => {
  const range = calculateHeadacheFreeConflictRange(timing, duration);
  if (!range) return [];

  const logs = await ClientHeadacheLogRepository.listLogsInRange(uid, range.startMs, range.endMs);
  return logs.filter((log) => log.isHeadacheFree === true && log.id !== excludeLogId);
};

export const deleteHeadacheFreeConflicts = async (logs: HeadacheLog[]) => {
  for (const log of logs) {
    await ClientHeadacheLogRepository.deleteLog(log.id);
  }
};
