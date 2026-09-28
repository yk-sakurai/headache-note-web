"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getFreshIdToken,
  observeAuthState,
  reauthenticateWithPassword,
  signOut,
} from "@/lib/firebase/auth.client";

function getAuthErrorCode(error: unknown): string {
  return typeof (error as { code?: string })?.code === "string"
    ? (error as { code?: string }).code ?? ""
    : "";
}

function mapDeleteAccountErrorToMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "現在のパスワードが正しくありません。";
    case "auth/requires-recent-login":
      return "安全のため、もう一度ログインしてからお試しください。";
    case "auth/too-many-requests":
      return "エラーが発生しました。しばらくしてからもう一度お試しください。";
    case "auth/network-request-failed":
      return "ネットワークエラーが発生しました。接続をご確認ください。";
    default:
      return "退会処理に失敗しました。入力内容をご確認のうえ、もう一度お試しください。";
  }
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return typeof body?.error === "string"
      ? body.error
      : "退会処理に失敗しました。時間をおいてもう一度お試しください。";
  } catch {
    return "退会処理に失敗しました。時間をおいてもう一度お試しください。";
  }
}

export default function AccountDeleteForm() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formAlert, setFormAlert] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"form" | "completed">("form");
  const authUnavailable = authReady && !hasUser;

  useEffect(() => {
    return observeAuthState((user) => {
      setHasUser(Boolean(user?.email));
      setAuthReady(true);
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormAlert("");

    if (!currentPassword) {
      setFormAlert("現在のパスワードを入力してください。");
      return;
    }

    if (authUnavailable) {
      setFormAlert("ログイン状態を確認できませんでした。もう一度ログインしてください。");
      return;
    }

    setLoading(true);
    try {
      await reauthenticateWithPassword(currentPassword);
      const idToken = await getFreshIdToken();
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        setFormAlert(await readApiError(response));
        return;
      }

      try {
        await signOut();
      } catch {
        // Auth ユーザー削除後はクライアント signOut に失敗しても画面遷移を続ける。
      }

      setView("completed");
    } catch (error: unknown) {
      setFormAlert(mapDeleteAccountErrorToMessage(getAuthErrorCode(error)));
    } finally {
      setLoading(false);
    }
  }

  function closeCompletedDialog() {
    router.replace("/");
  }

  return (
    <main className="min-h-screen bg-[color:var(--brand-mint-bg)] px-5 py-10 text-[color:var(--text-primary)]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="mx-auto w-full max-w-[560px] rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-7 sm:px-8"
      >
        <h1 className="text-2xl font-semibold tracking-normal">
          退会手続き
        </h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
          退会するには、現在のパスワードを入力してください。
        </p>

        {formAlert && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {formAlert}
          </div>
        )}

        {authUnavailable && (
          <div className="mt-6 rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--brand-primary-soft)] px-4 py-3 text-sm leading-6 text-[color:var(--text-secondary)]">
            ログイン状態を確認できませんでした。
            <Link
              href="/login?redirect=/account/delete"
              className="ml-1 font-semibold text-[color:var(--brand-primary)] underline-offset-4 hover:underline"
            >
              もう一度ログインしてください。
            </Link>
          </div>
        )}

        <div className="mt-7 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-amber-700">
              <WarningIcon />
            </span>
            <p>
              退会すると、これまでの記録データは削除されます。
              <br />
              復旧はできません。
            </p>
          </div>
        </div>

        <div className="mt-7 space-y-2">
          <label htmlFor="current-password" className="block text-sm font-semibold">
            現在のパスワード
          </label>
          <div className="flex h-12 overflow-hidden rounded border border-[color:var(--border)] bg-white focus-within:border-[color:var(--brand-primary)] focus-within:ring-2 focus-within:ring-[color:var(--brand-primary-soft)]">
            <input
              id="current-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-4 text-base text-[color:var(--text-primary)] outline-none"
              disabled={!authReady || authUnavailable || loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="flex w-12 items-center justify-center text-[color:var(--text-secondary)] calm-transition hover:bg-[color:var(--brand-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--brand-primary)]"
              aria-label={showPassword ? "パスワードを非表示にする" : "パスワードを表示する"}
              disabled={!authReady || authUnavailable || loading}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={!authReady || authUnavailable || loading}
            className="flex h-12 flex-1 items-center justify-center rounded bg-red-600 px-5 text-base font-semibold text-white calm-transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "処理中..." : "退会する"}
          </button>
          <Link
            href="/account"
            className="flex h-12 flex-1 items-center justify-center rounded border border-[color:var(--border)] bg-white px-5 text-base font-semibold text-[color:var(--text-primary)] calm-transition hover:bg-[color:var(--brand-primary-soft)]"
          >
            キャンセル
          </Link>
        </div>
      </form>

      {view === "completed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-completed-title"
            className="w-full max-w-[420px] rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-6 text-center"
          >
            <h2
              id="delete-completed-title"
              className="text-xl font-semibold tracking-normal"
            >
              退会しました。
            </h2>
            <button
              type="button"
              onClick={closeCompletedDialog}
              className="mt-6 flex h-11 w-full items-center justify-center rounded bg-[color:var(--brand-primary)] px-4 text-sm font-semibold text-[color:var(--brand-on-primary)] calm-transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function WarningIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 9v4" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M3 3 21 21" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.5 5.3A9.6 9.6 0 0 1 12 5c6 0 9.5 7 9.5 7a16.7 16.7 0 0 1-2.2 3.1" />
      <path d="M6.1 6.7C3.8 8.3 2.5 12 2.5 12s3.5 7 9.5 7a9.6 9.6 0 0 0 4.1-.9" />
    </svg>
  );
}
