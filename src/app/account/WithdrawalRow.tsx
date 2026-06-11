"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawalRow({
  blocked,
  warnsRemainingPeriod,
}: {
  blocked: boolean;
  warnsRemainingPeriod: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"blocked" | "warning" | null>(null);

  function handleClick() {
    if (blocked) {
      setDialog("blocked");
      return;
    }

    if (warnsRemainingPeriod) {
      setDialog("warning");
      return;
    }

    router.push("/account/delete");
  }

  function closeDialog() {
    setDialog(null);
  }

  function proceedToDelete() {
    setDialog(null);
    router.push("/account/delete");
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="grid min-h-28 w-full grid-cols-[3.75rem_minmax(0,1fr)_1.5rem] items-center gap-4 px-6 py-5 text-left calm-transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 sm:grid-cols-[4.25rem_minmax(0,1fr)_1.75rem] sm:px-8"
      >
        <span className="flex h-12 w-12 items-center justify-center text-red-600">
          <WithdrawalIcon />
        </span>
        <span className="min-w-0">
          <span className="block text-xl font-semibold leading-8">
            退会手続き
          </span>
          <span className="mt-1 block truncate text-lg leading-7 text-[color:var(--text-secondary)]">
            アカウントとデータの削除を行います
          </span>
        </span>
        <ChevronRightIcon />
      </button>

      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-5"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdrawal-dialog-title"
            className="w-full max-w-[420px] rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-6 text-[color:var(--text-primary)]"
          >
            <h3
              id="withdrawal-dialog-title"
              className="text-lg font-semibold tracking-normal"
            >
              退会手続き
            </h3>
            <p className="mt-4 text-sm leading-7 text-[color:var(--text-secondary)]">
              {dialog === "blocked"
                ? "有料プランをご利用中です。先にプランの解約を行ってください。"
                : "退会すると、有料プランやプレミアム機能体験の残りの期間は利用できなくなります。"}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
              {dialog === "warning" && (
                <button
                  type="button"
                  onClick={proceedToDelete}
                  className="flex h-11 flex-1 items-center justify-center rounded bg-[color:var(--brand-primary)] px-4 text-sm font-semibold text-[color:var(--brand-on-primary)] calm-transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2"
                >
                  OK
                </button>
              )}
              <button
                type="button"
                onClick={closeDialog}
                className="flex h-11 flex-1 items-center justify-center rounded border border-[color:var(--border)] bg-white px-4 text-sm font-semibold text-[color:var(--text-primary)] calm-transition hover:bg-[color:var(--brand-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function WithdrawalIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-10 w-10"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      <path d="M9 5.5h7.5A1.5 1.5 0 0 1 18 7v10a1.5 1.5 0 0 1-1.5 1.5H9" />
      <path d="M12 12H3.5" />
      <path d="m6.5 9-3 3 3 3" />
      <path d="M20.5 7.5v9" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-7 w-7 text-[color:var(--text-muted)]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
