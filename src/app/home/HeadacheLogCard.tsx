import Link from "next/link";
import Button from "@/components/Button";
import type { SerializableHeadacheLog } from "./types";
import { sanitizeStringList } from "@/lib/firestore/repositories/sanitize";

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = MINUTES_PER_HOUR * 24;

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

export default function HeadacheLogCard({
  log,
  onDelete,
}: {
  log: SerializableHeadacheLog;
  onDelete?: (id: string) => void;
}) {
  const dateValue = log.timing ? new Date(log.timing) : null;
  const dateLabel =
    dateValue instanceof Date && !Number.isNaN(dateValue.getTime())
      ? dateValue.toLocaleString("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : null;
  const durationLabel = formatDurationLabel(log.duration);

  const locations = sanitizeStringList(log.locations);

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3 bg-background text-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-100">{dateLabel ?? "-"}</span>
          {log.intensity !== undefined && (
            <span className="text-gray-50">強度: {log.intensity}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/home/log/${log.id}/edit`}>
            <Button variant="secondary">編集</Button>
          </Link>
          {onDelete && (
            <Button variant="secondary" onClick={() => onDelete(log.id)}>削除</Button>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-100 space-y-1">
        {durationLabel && <div>継続時間: {durationLabel}</div>}
        {locations.length > 0 && (
          <div>痛みの場所: {locations.join(", ")}</div>
        )}
        {log.types && log.types.length > 0 && (
          <div>痛み方: {log.types.join(", ")}</div>
        )}
        {log.triggers && log.triggers.length > 0 && (
          <div>トリガー: {log.triggers.join(", ")}</div>
        )}
        {log.associatedSymptoms && log.associatedSymptoms.length > 0 && (
          <div>併発症状: {log.associatedSymptoms.join(", ")}</div>
        )}
        {log.note && <div>メモ: {log.note}</div>}
        {log.isHeadacheFree && <div>頭痛なし</div>}
      </div>
    </div>
  );
}
