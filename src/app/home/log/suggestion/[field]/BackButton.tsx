"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex text-sm font-medium text-[color:var(--brand-primary-active)] underline-offset-4 hover:underline"
    >
      ← 記録フォームに戻る
    </button>
  );
}
