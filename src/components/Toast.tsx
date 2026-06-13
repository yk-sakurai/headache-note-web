"use client";

import { useEffect } from "react";

export default function Toast({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        role="status"
        className="rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-3 text-sm font-medium text-[color:var(--text-primary)] shadow-[0_10px_30px_rgb(23_33_29_/_0.14)]"
      >
        {message}
      </div>
    </div>
  );
}
