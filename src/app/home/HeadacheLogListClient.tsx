"use client";

import Link from "next/link";
import { useState } from "react";
import HeadacheLogCard from "./HeadacheLogCard";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ClientHeadacheLogRepository } from "@/lib/firestore/repositories/client";
import type { SerializableHeadacheLog } from "./types";

export default function HeadacheLogListClient({ initialLogs }: { initialLogs: SerializableHeadacheLog[] }) {
  const [logs, setLogs] = useState<SerializableHeadacheLog[]>(initialLogs);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await ClientHeadacheLogRepository.deleteLog(confirmId);
      setLogs((prev) => prev.filter((l) => l.id !== confirmId));
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">頭痛記録</h1>
        <Link href="/home/log/new">
          <Button>新規記録</Button>
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="text-gray-600">まだ記録がありません。右上の「新規記録」から追加してください。</div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <HeadacheLogCard key={log.id} log={log} onDelete={(id) => setConfirmId(id)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmId)}
        title="削除の確認"
        message="この記録を削除しますか？この操作は元に戻せません。"
        confirmText={deleting ? "削除中..." : "削除"}
        cancelText="キャンセル"
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
