"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";

const noticeMessages: Record<string, string> = {
  created: "登録しました。",
  updated: "更新しました。",
  deleted: "削除しました。",
};

export default function RecordsNotice() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");
  const initialMessage = useMemo(() => (notice ? noticeMessages[notice] ?? null : null), [notice]);
  const [message, setMessage] = useState(initialMessage);

  const handleClose = useCallback(() => {
    setMessage(null);
    if (notice) {
      router.replace("/records", { scroll: false });
    }
  }, [notice, router]);

  return <Toast message={message} onClose={handleClose} />;
}
