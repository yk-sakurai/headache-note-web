import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { adminAuth } from "@/lib/firebase/admin";
import { HeadacheLogRepository } from "@/lib/firestore/repositories/server";
import { toSerializableHeadacheLog } from "@/lib/firestore/serializeHeadacheLog";
import {
  getCurrentTokyoMonthKey,
  getInitialCalendarRange,
  tokyoDateKey,
} from "@/lib/calendar/calendarUtils";
import CalendarSection from "./CalendarSection";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    redirect("/login");
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch (error) {
    console.error("Session verification failed:", error);
    redirect("/login");
  }

  const range = getInitialCalendarRange();
  const logs = await HeadacheLogRepository.listLogsInRange(
    uid,
    range.startMs,
    range.endMs
  );
  const initialLogs = logs
    .filter((log) => log.isHeadacheFree !== true)
    .map(toSerializableHeadacheLog);

  return (
    <main className="min-h-screen bg-[color:var(--brand-mint-bg)] px-4 py-8 text-[color:var(--text-primary)] sm:px-6 lg:px-8">
      <CalendarSection
        uid={uid}
        initialLogs={initialLogs}
        initialStartMs={range.startMs}
        initialEndMs={range.endMs}
        todayKey={tokyoDateKey(Date.now())}
        initialMonthKey={getCurrentTokyoMonthKey()}
      />
    </main>
  );
}
