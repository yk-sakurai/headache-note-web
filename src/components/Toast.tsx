"use client";

import { useEffect } from "react";

const BASE_BOTTOM_PX = 24;

export default function Toast({
  message,
  onClose,
  bottomOffset = 0,
}: {
  message: string | null;
  onClose: () => void;
  /** 固定バーの実測高さ。Toast をその上へ配置する */
  bottomOffset?: number;
}) {
  // 固定バーの実測高さには safe-area 分の padding が含まれるため、
  // バーがある場合は env(safe-area-inset-bottom) を重ねて足さない。
  const bottom =
    bottomOffset > 0
      ? `${BASE_BOTTOM_PX + bottomOffset}px`
      : `calc(${BASE_BOTTOM_PX}px + env(safe-area-inset-bottom, 0px))`;

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom }}
    >
      <div
        role="status"
        className="rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-3 text-sm font-medium text-[color:var(--text-primary)] shadow-[0_10px_30px_rgb(23_33_29_/_0.14)]"
      >
        {message}
      </div>
    </div>
  );
}
