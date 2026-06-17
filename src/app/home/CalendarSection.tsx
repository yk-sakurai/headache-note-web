import HeadacheCalendar from "@/components/calendar/HeadacheCalendar";
import type { SerializableHeadacheLog } from "@/lib/firestore/serializeHeadacheLog";

type CalendarSectionProps = {
  uid: string;
  initialLogs: SerializableHeadacheLog[];
  initialStartMs: number;
  initialEndMs: number;
  todayKey: string;
  initialMonthKey: string;
};

export default function CalendarSection({
  uid,
  initialLogs,
  initialStartMs,
  initialEndMs,
  todayKey,
  initialMonthKey,
}: CalendarSectionProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-normal text-[color:var(--text-primary)] sm:text-4xl">
          月ごとの記録
        </h1>
        <p className="text-base leading-7 text-[color:var(--text-secondary)]">
          カレンダーで痛みの強さや記録日を確認できます
        </p>
      </div>
      <HeadacheCalendar
        uid={uid}
        initialLogs={initialLogs}
        initialStartMs={initialStartMs}
        initialEndMs={initialEndMs}
        todayKey={todayKey}
        initialMonthKey={initialMonthKey}
      />
    </div>
  );
}
