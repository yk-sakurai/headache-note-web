"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  observeAuthState,
  reauthenticateWithPassword,
  updateUserEmailWithVerification,
} from "@/lib/firebase/auth.client";
import { validatePassword } from "@/lib/validation/password";

function getAuthErrorCode(error: unknown): string {
  return typeof (error as { code?: string })?.code === "string"
    ? (error as { code?: string }).code ?? ""
    : "";
}

function mapAccountChangeErrorToMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "現在のパスワードが正しくありません。";
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません。";
    case "auth/email-already-in-use":
      return "このメールアドレスはすでに使われています。";
    case "auth/requires-recent-login":
      return "安全のため、もう一度ログインしてからお試しください。";
    case "auth/too-many-requests":
      return "エラーが発生しました。しばらくしてからもう一度お試しください。";
    case "auth/network-request-failed":
      return "ネットワークエラーが発生しました。接続をご確認ください。";
    default:
      return "変更できませんでした。入力内容をご確認のうえ、もう一度お試しください。";
  }
}

export default function AccountEmailPage() {
  const [authReady, setAuthReady] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [formAlert, setFormAlert] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"form" | "completed">("form");
  const authUnavailable = authReady && !currentEmail;
  const passwordError = useMemo(
    () => (passwordTouched ? validatePassword(currentPassword) : null),
    [currentPassword, passwordTouched]
  );

  useEffect(() => {
    return observeAuthState((user) => {
      setCurrentEmail(user?.email ?? "");
      setAuthReady(true);
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = newEmail.trim();
    setFormAlert("");
    setFieldError("");
    setPasswordTouched(true);

    if (!trimmedEmail) {
      setFieldError("新しいメールアドレスを入力してください。");
      return;
    }

    if (validatePassword(currentPassword)) {
      return;
    }

    if (authUnavailable) {
      setFormAlert("ログイン状態を確認できませんでした。もう一度ログインしてください。");
      return;
    }

    if (trimmedEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setFieldError("現在と異なるメールアドレスを入力してください。");
      return;
    }

    setLoading(true);
    try {
      await reauthenticateWithPassword(currentPassword);
      await updateUserEmailWithVerification(trimmedEmail);
      setView("completed");
    } catch (error: unknown) {
      setFormAlert(mapAccountChangeErrorToMessage(getAuthErrorCode(error)));
    } finally {
      setLoading(false);
    }
  }

  if (view === "completed") {
    return (
      <main className="min-h-screen bg-[color:var(--brand-mint-bg)] px-5 py-10 text-[color:var(--text-primary)]">
        <section className="mx-auto w-full max-w-[560px] rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-8 text-center sm:px-8">
          <h1 className="text-2xl font-semibold tracking-normal">
            確認メールを送信しました
          </h1>
          <p className="mt-4 text-sm leading-7 text-[color:var(--text-secondary)]">
            新しいメールアドレス宛に確認メールをお送りしました。
            <br />
            メール内のリンクを開くと、変更が完了します。
          </p>
          <p className="mt-4 text-sm leading-7 text-[color:var(--text-secondary)]">
            変更が完了すると安全のため自動的にログアウトされます。その後は新しいメールアドレスでログインしてください。
            <br />
            なお、リンクを開くまでは現在のメールアドレスのままご利用いただけます。
          </p>
          <Link
            href="/account"
            className="mt-7 flex h-12 w-full items-center justify-center rounded bg-[color:var(--brand-primary)] px-5 text-base font-semibold text-[color:var(--brand-on-primary)] calm-transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2"
          >
            アカウントへ戻る
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--brand-mint-bg)] px-5 py-10 text-[color:var(--text-primary)]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="mx-auto w-full max-w-[560px] rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--surface)] px-5 py-7 sm:px-8"
      >
        <h1 className="text-2xl font-semibold tracking-normal">
          メールアドレス変更
        </h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
          新しいメールアドレスへ確認メールを送信します。
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
              href="/login?redirect=/account/email"
              className="ml-1 font-semibold text-[color:var(--brand-primary)] underline-offset-4 hover:underline"
            >
              もう一度ログインしてください。
            </Link>
          </div>
        )}

        <div className="mt-7 space-y-5">
          <div className="rounded-lg border border-[color:var(--brand-mint-border)] bg-[color:var(--brand-primary-soft)] px-4 py-3 text-sm leading-6">
            <span className="block font-semibold">現在のメールアドレス</span>
            <span className="mt-1 block break-all text-[color:var(--text-secondary)]">
              {authReady ? currentEmail || "ログイン状態を確認できません" : "確認中..."}
            </span>
          </div>

          <div className="space-y-2">
            <label htmlFor="new-email" className="block text-sm font-semibold">
              新しいメールアドレス
            </label>
            <input
              id="new-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              aria-invalid={fieldError ? "true" : "false"}
              aria-describedby={fieldError ? "new-email-error" : undefined}
              className="h-12 w-full rounded border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--text-primary)] outline-none calm-transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)] aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:border-red-400 aria-[invalid=true]:focus:ring-red-100"
              placeholder="example@example.com"
              disabled={!authReady || authUnavailable || loading}
            />
            {fieldError && (
              <p id="new-email-error" className="text-sm leading-6 text-red-600">
                {fieldError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="current-password" className="block text-sm font-semibold">
              現在のパスワード
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setPasswordTouched(true);
              }}
              onBlur={() => setPasswordTouched(true)}
              aria-invalid={passwordError ? "true" : "false"}
              aria-describedby={passwordError ? "current-password-error" : undefined}
              className="h-12 w-full rounded border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--text-primary)] outline-none calm-transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary-soft)] aria-[invalid=true]:border-red-300 aria-[invalid=true]:focus:ring-red-100"
              disabled={!authReady || authUnavailable || loading}
            />
            {passwordError && (
              <p id="current-password-error" className="text-sm leading-6 text-red-600">
                {passwordError}
              </p>
            )}
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={!authReady || authUnavailable || loading}
            className="flex h-12 flex-1 items-center justify-center rounded bg-[color:var(--brand-primary)] px-5 text-base font-semibold text-[color:var(--brand-on-primary)] calm-transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "処理中..." : "変更する"}
          </button>
          <Link
            href="/account"
            className="flex h-12 flex-1 items-center justify-center rounded border border-[color:var(--border)] bg-white px-5 text-base font-semibold text-[color:var(--text-primary)] calm-transition hover:bg-[color:var(--brand-primary-soft)]"
          >
            戻る
          </Link>
        </div>
      </form>
    </main>
  );
}
